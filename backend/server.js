const express = require('express');
const ytdl = require('@distube/ytdl-core'); // Using the more stable library
const { spawn } = require('child_process');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

const corsOptions = {
    origin: 'https://sanjukumarjha.github.io',
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

app.get('/health', (req, res) => res.status(200).send('OK'));

app.post('/api/convert', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'Please provide a URL.' });
    }
    try {
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s.-]/gi, '_');
        res.setHeader('Content-Disposition', `attachment; filename="${title}.wav"`);
        res.setHeader('Content-Type', 'audio/wav');
        const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
        const ffmpegProcess = spawn('ffmpeg', ['-i', 'pipe:0', '-f', 'wav', '-ar', '44100', 'pipe:1'], { stdio: ['pipe', 'pipe', 'pipe'] });
        audioStream.pipe(ffmpegProcess.stdin);
        ffmpegProcess.stdout.pipe(res);
        audioStream.on('error', (err) => {
            console.error('[ERROR] Audio Stream Error:', err);
            if (!res.headersSent) res.status(500).send('Error reading video stream.');
        });
        ffmpegProcess.on('close', () => res.end());
    } catch (error) {
        console.error('[FATAL] Main catch block error:', error.message);
        if (!res.headersSent) res.status(400).json({ error: 'Invalid YouTube URL or video is private/unavailable.' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});