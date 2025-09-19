const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); // 1. Import cors

const app = express();
const PORT = process.env.PORT || 3001;

// 2. Configure CORS to allow your GitHub Pages URL
const corsOptions = {
    origin: 'https://sanjukumarjha.github.io',
};
app.use(cors(corsOptions));

app.use(express.json());

// This serves the downloadable .wav files
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
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s.-]/gi, '_');
        const outputFilePath = path.join(downloadsDir, `${title}.wav`);
        const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
        ffmpeg(audioStream)
            .audioBitrate(1411)
            .toFormat('wav')
            .on('end', () => {
                // 3. The download URL must be absolute, including the server's address
                const fullUrl = `${req.protocol}://${req.get('host')}`;
                const downloadUrl = `${fullUrl}/downloads/${encodeURIComponent(path.basename(outputFilePath))}`;
                res.json({ downloadUrl });
            })
            .on('error', (err) => {
                res.status(500).json({ error: 'Failed during the conversion process.' });
            })
            .save(outputFilePath);
    } catch (error) {
        res.status(500).json({ error: 'Could not process the provided URL.' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});