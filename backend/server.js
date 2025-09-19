const express = require('express');
const ytdl = require('ytdl-core');
const { spawn } = require('child_process'); // Use Node's built-in child_process
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
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s.-]/gi, '_');
        const outputFilePath = path.join(downloadsDir, `${title}.wav`);

        const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });

        // Call ffmpeg directly
        const ffmpegProcess = spawn('ffmpeg', [
            '-i', 'pipe:0',      // Input from stdin
            '-f', 'wav',         // Format to WAV
            '-ar', '44100',      // Audio sampling rate
            '-ac', '2',          // 2 audio channels (stereo)
            outputFilePath
        ]);

        audioStream.pipe(ffmpegProcess.stdin);

        ffmpegProcess.on('error', (err) => {
            console.error('FFmpeg process error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed during conversion process.' });
            }
        });

        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                console.log('Conversion finished successfully.');
                res.download(outputFilePath, `${title}.wav`, (err) => {
                    if (err) {
                        console.error('Error sending file:', err);
                    }
                    fs.unlink(outputFilePath, (unlinkErr) => {
                        if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
                        else console.log('Successfully deleted temp file.');
                    });
                });
            } else {
                console.error(`FFmpeg exited with code ${code}`);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'FFmpeg conversion failed.' });
                }
            }
        });

    } catch (error) {
        console.error('Main processing error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Could not process the video.' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});