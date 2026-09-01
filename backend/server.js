require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS & JSON payload parsing
app.use(cors());
app.use(express.json());

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Root health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Wedding Gallery Backend API is running via Cloudinary!',
  });
});

// Helper function to fetch images dynamically from Cloudinary
const getCloudinaryGalleryData = async () => {
  try {
    // Fetch resources (images) from Cloudinary, optionally categorized by folder tags or prefix
    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 500, // Adjust if you have more than 500 photos
      prefix: '', // Change if you store them inside a specific Cloudinary folder path like 'wedding/'
    });

    const photos = [];
    const albumsSet = new Set();

    result.resources.forEach((file) => {
      // Extract folder or tag info from the public_id (e.g., "Ceremony/image1.jpg")
      const parts = file.public_id.split('/');
      const folder = parts.length > 1 ? parts[0] : 'General';
      albumsSet.add(folder);

      photos.push({
        id: file.public_id,
        url: file.secure_url,
        folder: folder,
        filename: parts[parts.length - 1],
      });
    });

    const albums = Array.from(albumsSet);
    return { count: photos.length, albums, photos };
  } catch (error) {
    console.error('Cloudinary fetch error:', error);
    return { error: 'Failed to fetch photos from Cloudinary' };
  }
};

// GET /api/photos
app.get('/api/photos', async (req, res) => {
  const data = await getCloudinaryGalleryData();
  if (data.error) return res.status(500).json({ success: false, error: data.error });
  res.json({ success: true, ...data });
});

// GET /api/gallery (alias route)
app.get('/api/gallery', async (req, res) => {
  const data = await getCloudinaryGalleryData();
  if (data.error) return res.status(500).json({ success: false, error: data.error });
  res.json({ success: true, ...data });
});

// POST /api/download-favorites - Redirects or streams favorite URLs for download
const https = require('https');
const archiver = require('archiver');

// POST /api/download-favorites - Streams selected photos as a ZIP file
app.post('/api/download-favorites', async (req, res) => {
  const { photoIds } = req.body;

  if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
    return res.status(400).json({ error: 'No photo IDs provided' });
  }

  try {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=wedding-favorites.zip');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    // Fetch resources from Cloudinary to get their secure URLs
    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 500,
    });

    const photoMap = new Map();
    result.resources.forEach((file) => {
      photoMap.set(file.public_id, file.secure_url);
    });

    for (const id of photoIds) {
      const url = photoMap.get(id);
      if (url) {
        const filename = id.split('/').pop() || 'photo.jpg';
        await new Promise((resolve, reject) => {
          https.get(url, (imageStream) => {
            archive.append(imageStream, { name: filename });
            imageStream.on('end', resolve);
            imageStream.on('error', reject);
          });
        });
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error('Download favorites ZIP error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate ZIP file' });
    }
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server active on port ${PORT} connected to Cloudinary`);
});