require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
});

async function inspectGallery() {
  try {
    const subfolders = await cloudinary.api.sub_folders('wedding-gallery');
    console.log('--- Subfolders inside wedding-gallery ---');
    console.log(subfolders.folders.map((f) => f.name));

    console.log('\n--- Searching for uploaded images ---');
    const searchRes = await cloudinary.search
      .expression('folder:wedding-gallery/*')
      .max_results(500)
      .execute();

    const folderCounts = {};
    searchRes.resources.forEach((asset) => {
      const folderPath = asset.folder || asset.public_id;
      const parts = folderPath.split('/');
      const folderName = parts.length > 1 ? parts[parts.length - 2] : 'root';
      folderCounts[folderName] = (folderCounts[folderName] || 0) + 1;
    });

    console.log('Image counts per folder:', folderCounts);
  } catch (err) {
    console.error('Error inspecting gallery:', err.message);
  }
}

inspectGallery();