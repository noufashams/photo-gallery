require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS & JSON payload parsing
app.use(cors());
app.use(express.json());

// Path to root local-photos folder
const LOCAL_PHOTOS_DIR = path.join(__dirname, '../local-photos');

// Serve static images under /photos URL path
app.use('/photos', express.static(LOCAL_PHOTOS_DIR));

// Root health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Wedding Gallery Backend API is running!',
  });
});

// Helper function to scan local-photos directory dynamically using request context
const getGalleryData = (req) => {
  if (!fs.existsSync(LOCAL_PHOTOS_DIR)) {
    return { error: `Directory not found: ${LOCAL_PHOTOS_DIR}`, photos: [] };
  }

  // Get dynamic host (e.g., 'localhost:5001' or 'your-app.onrender.com')
  const protocol = req.protocol;
  const host = req.get('host');

  const albums = fs
    .readdirSync(LOCAL_PHOTOS_DIR)
    .filter((file) =>
      fs.statSync(path.join(LOCAL_PHOTOS_DIR, file)).isDirectory()
    );

  const photos = [];

  albums.forEach((album) => {
    const albumPath = path.join(LOCAL_PHOTOS_DIR, album);
    const files = fs
      .readdirSync(albumPath)
      .filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));

    files.forEach((file) => {
      photos.push({
        id: `${album}/${file}`,
        url: `${protocol}://${host}/photos/${encodeURIComponent(album)}/${encodeURIComponent(file)}`,
        folder: album,
        filename: file,
      });
    });
  });

  return { count: photos.length, albums, photos };
};

// GET /api/photos
app.get('/api/photos', (req, res) => {
  const data = getGalleryData(req);
  if (data.error) return res.status(404).json({ success: false, error: data.error });
  res.json({ success: true, ...data });
});

// GET /api/gallery (alias route)
app.get('/api/gallery', (req, res) => {
  const data = getGalleryData(req);
  if (data.error) return res.status(404).json({ success: false, error: data.error });
  res.json({ success: true, ...data });
});

// POST /api/download-favorites - Zips requested photo IDs and streams the ZIP file
app.post('/api/download-favorites', (req, res) => {
  const { photoIds } = req.body;

  if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
    return res.status(400).json({ error: 'No photo IDs provided' });
  }

  res.attachment('wedding-favorites.zip');
  res.setHeader('Content-Type', 'application/zip');

  const archive = archiver('zip', { zlib: { level: 5 } });

  archive.on('error', (err) => {
    console.error('Archiver error:', err);
    res.status(500).send({ error: err.message });
  });

  archive.pipe(res);

  photoIds.forEach((id) => {
    const filePath = path.join(LOCAL_PHOTOS_DIR, id);
    if (fs.existsSync(filePath)) {
      const fileName = path.basename(filePath);
      archive.file(filePath, { name: fileName });
    }
  });

  archive.finalize();
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server active on port ${PORT}`);
  console.log(`📂 Reading photos from: ${LOCAL_PHOTOS_DIR}`);
});