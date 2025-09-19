const express = require('express');
const ytdl = require('ytdl-core');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
    origin: 'https://sanjukumarjha.github.io',
};
app.use(cors(corsOptions));
app.use(express.json());

// --- HEALTH CHECK ENDPOINT ---
// This route is used by Render to check if the service is live.
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.post('/api/convert', async (req, res) => {
    const { url } = req.body;

    if (!url || !ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Please provide a valid YouTube URL.' });
    }

    try {
        console.log(`[INFO] Fetching info for URL: ${url}`);
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s.-]/gi, '_');

        res.setHeader('Content-Disposition', `attachment; filename="${title}.wav"`);
        res.setHeader('Content-Type', 'audio/wav');

        const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });

        const ffmpegProcess = spawn('ffmpeg', [
            '-i', 'pipe:0',
            '-f', 'wav',
            '-ar', '44100',
            'pipe:1'
        ], { stdio: ['pipe', 'pipe', 'pipe'] });

        audioStream.pipe(ffmpegProcess.stdin);
        ffmpegProcess.stdout.pipe(res);

        audioStream.on('error', (err) => {
            console.error('[ERROR] Audio Stream Error:', err);
            if (!res.headersSent) res.status(500).send('Error reading video stream.');
        });

        ffmpegProcess.stderr.on('data', (data) => {
            console.error(`[FFMPEG STDERR] ${data}`);
        });

        ffmpegProcess.on('close', (code) => {
            if (code !== 0) console.error(`[FATAL] FFmpeg exited with code ${code}`);
            else console.log('[INFO] Stream finished.');
            res.end();
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