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

app.post('/api/convert', async (req, res) => {
    const { url } = req.body;

    if (!url || !ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Please provide a valid YouTube URL.' });
    }

    try {
        console.log(`[INFO] Fetching info for URL: ${url}`);
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s.-]/gi, '_');

        // Set headers for the download
        res.setHeader('Content-Disposition', `attachment; filename="${title}.wav"`);
        res.setHeader('Content-Type', 'audio/wav');

        const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });

        // Spawn FFmpeg process to stream directly to the response
        const ffmpegProcess = spawn('ffmpeg', [
            '-i', 'pipe:0',      // Input from stdin
            '-f', 'wav',         // Format to WAV
            '-ar', '44100',      // Audio sampling rate
            '-ac', '2',          // Stereo audio
            'pipe:1'             // Output to stdout
        ], { stdio: ['pipe', 'pipe', 'pipe'] });

        // Pipe the YouTube stream to FFmpeg's input
        audioStream.pipe(ffmpegProcess.stdin);

        // Pipe FFmpeg's output directly to the user's download response
        ffmpegProcess.stdout.pipe(res);

        // --- Error Handling ---
        audioStream.on('error', (err) => {
            console.error('[ERROR] Audio Stream Error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error reading video stream.' });
            }
        });

        ffmpegProcess.stderr.on('data', (data) => {
            // Log ffmpeg errors/progress for debugging, but don't send to user
            console.error(`[FFMPEG STDERR] ${data}`);
        });

        ffmpegProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`[FATAL] FFmpeg exited with non-zero code: ${code}`);
            }
            console.log('[INFO] Stream finished.');
            res.end(); // End the response when FFmpeg is done
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