const express = require('express');
const ytdl = require('ytdl-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
    origin: 'https://sanjukumarjha.github.io',
};
app.use(cors(corsOptions));
app.use(express.json());

const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

app.post('/api/convert', async (req, res) => {
    const { url } = req.body;

    if (!url || !ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Please provide a valid YouTube URL.' });
    }

    try {
        console.log(`[INFO] Fetching info for URL: ${url}`);
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s.-]/gi, '_');
        const outputFilePath = path.join(downloadsDir, `${title}.wav`);

        const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });

        // Use spawn to call ffmpeg directly with specific arguments
        const ffmpegProcess = spawn('ffmpeg', [
            '-i', 'pipe:0',
            '-f', 'wav',
            '-ar', '44100',
            '-ac', '2',
            'pipe:1'
        ], { stdio: ['pipe', 'pipe', 'pipe'] }); // Pipe stdin, stdout, stderr

        // Pipe the audio stream to ffmpeg's stdin
        audioStream.pipe(ffmpegProcess.stdin);

        // Pipe ffmpeg's stdout to a file
        const fileWriteStream = fs.createWriteStream(outputFilePath);
        ffmpegProcess.stdout.pipe(fileWriteStream);

        // Error handling for all processes
        audioStream.on('error', (err) => {
            console.error('[ERROR] Audio Stream Error:', err);
            if (!res.headersSent) res.status(500).json({ error: 'Error reading video stream.' });
        });

        ffmpegProcess.stderr.on('data', (data) => {
            console.error(`[FFMPEG STDERR] ${data}`);
        });

        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                console.log('[SUCCESS] Conversion finished.');
                res.download(outputFilePath, `${title}.wav`, (err) => {
                    if (err) console.error('[ERROR] File send error:', err);
                    // Clean up the file after sending
                    fs.unlink(outputFilePath, (unlinkErr) => {
                        if (unlinkErr) console.error('[ERROR] Cleanup error:', unlinkErr);
                        else console.log('[INFO] Temp file deleted.');
                    });
                });
            } else {
                console.error(`[FATAL] FFmpeg exited with code ${code}`);
                if (!res.headersSent) res.status(500).json({ error: 'Conversion process failed.' });
            }
        });

    } catch (error) {
        console.error('[FATAL] Main catch block error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Could not process video. It may be private or age-restricted.' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});