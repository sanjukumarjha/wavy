const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const ffmpegPath = '/usr/bin/ffmpeg';
ffmpeg.setFfmpegPath(ffmpegPath);

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
app.use('/downloads', express.static(downloadsDir));

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
                // Send the file for download
                res.download(outputFilePath, `${title}.wav`, (err) => {
                    if (err) {
                        console.error('Error sending file:', err);
                    }
                    // **DELETE THE FILE AFTER SENDING**
                    fs.unlink(outputFilePath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error('Error deleting file:', unlinkErr);
                        } else {
                            console.log('Successfully deleted file:', outputFilePath);
                        }
                    });
                });
            })
            .on('error', (err) => {
                if (!res.headersSent) {
                    res.status(500).json({ error: 'A conversion error occurred.' });
                }
            })
            .save(outputFilePath);
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ error: 'Could not process the video.' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});