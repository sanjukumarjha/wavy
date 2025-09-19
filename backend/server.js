const express = require('express');
const ytdl = require('ytdl-core');
const { spawn } = require('child_process');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors()); // Use a simpler CORS configuration
app.use(express.json());

// --- SERVE THE BUILT REACT APP ---
// This line tells Express to serve the static HTML, CSS, and JS
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.post('/api/convert', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'Please provide a URL.' });
    }

    try {
        console.log(`[INFO] Fetching info for URL: ${url}`);
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s.-]/gi, '_');

        res.setHeader('Content-Disposition', `attachment; filename="${title}.wav"`);
        res.setHeader('Content-Type', 'audio/wav');

        const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
        const ffmpegProcess = spawn('ffmpeg', ['-i', 'pipe:0', '-f', 'wav', '-ar', '44100', 'pipe:1'], { stdio: ['pipe', 'pipe', 'pipe'] });

        audioStream.pipe(ffmpegProcess.stdin);
        ffmpegProcess.stdout.pipe(res);

        const onStreamError = (streamName, err) => {
            console.error(`[FATAL] Error in ${streamName}:`, err);
            if (!res.headersSent) res.status(500).json({ error: `An error occurred in the ${streamName}.` });
            res.end();
        };

        audioStream.on('error', (err) => onStreamError('Audio Stream', err));
        ffmpegProcess.stdin.on('error', (err) => onStreamError('FFmpeg STDIN', err));
        ffmpegProcess.stdout.on('error', (err) => onStreamError('FFmpeg STDOUT', err));
        ffmpegProcess.stderr.on('data', (data) => console.error(`[FFMPEG STDERR] ${data}`));
        ffmpegProcess.on('close', () => {
            console.log('[INFO] FFmpeg process closed.');
            res.end();
        });

    } catch (error) {
        console.error('[FATAL] Main catch block error:', error.message);
        if (!res.headersSent) res.status(400).json({ error: 'Invalid YouTube URL or video is private/unavailable.' });
    }
});

// --- CATCH-ALL ROUTE ---
// This serves your React app for any page request that isn't the API
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});