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
app.post('/api/download-favorites', async (req, res) => {
  const { photoIds } = req.body;

  if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
    return res.status(400).json({ error: 'No photo IDs provided' });
  }

  try {
    // For Cloudinary, we can return the secure URLs so the frontend can handle downloads/saving
    res.json({ success: true, photoIds });
  } catch (err) {
    console.error('Download favorites error:', err);
    res.status(500).json({ error: err.message });
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server active on port ${PORT} connected to Cloudinary`);
});