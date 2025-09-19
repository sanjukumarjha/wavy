const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS to allow your GitHub Pages URL
const corsOptions = {
    origin: 'https://sanjukumarjha.github.io',
};
app.use(cors(corsOptions));
app.use(express.json());

const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}
app.use('/downloads', express.static(downloadsDir));

// API endpoint for conversion
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

        const audioStream = ytdl(url, {
            filter: 'audioonly',
            quality: 'highestaudio'
        });

        // This handles errors in the stream itself
        audioStream.on('error', (err) => {
            console.error('[ERROR] ytdl stream error:', err);
            return res.status(500).json({ error: 'Failed to download video stream.' });
        });

        console.log(`[INFO] Starting conversion for: ${title}`);
        ffmpeg(audioStream)
            .audioBitrate(1411)
            .toFormat('wav')
            .on('end', () => {
                console.log('[SUCCESS] Conversion finished successfully.');
                const fullUrl = `https://${req.get('host')}`; // Use https for deployed apps
                const downloadUrl = `${fullUrl}/downloads/${encodeURIComponent(path.basename(outputFilePath))}`;
                res.json({ downloadUrl });
            })
            .on('error', (err) => {
                // This is a critical error handler for FFmpeg
                console.error('[ERROR] FFmpeg conversion error:', err.message);
                return res.status(500).json({ error: `Conversion failed: ${err.message}` });
            })
            .save(outputFilePath);

    } catch (error) {
        console.error('[ERROR] Main processing error:', error);
        res.status(500).json({ error: 'Could not process the provided URL. It might be private or age-restricted.' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});