require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
});

const PHOTOS_DIR = path.join(__dirname, '../local-photos');
const BATCH_SIZE = 3;
const MAX_BYTES = 9 * 1024 * 1024;

async function checkIfExists(publicId) {
  try {
    await cloudinary.api.resource(publicId);
    return true; 
  } catch (error) {
    return false; 
  }
}

async function uploadFile(filePath, albumName) {
  const fileName = path.basename(filePath);
  const fileKey = path.parse(fileName).name; 
  const publicId = `wedding-gallery/${albumName}/${fileKey}`;

  const exists = await checkIfExists(publicId);
  if (exists) {
    console.log(`⏩ Skipped (Already Uploaded): [${albumName}] ${fileName}`);
    return;
  }

  let uploadTarget = filePath;
  let tempFilePath = null;

  try {
    const stats = fs.statSync(filePath);

    if (stats.size > MAX_BYTES) {
      tempFilePath = path.join(__dirname, `temp_${Date.now()}_${fileName}`);
      await sharp(filePath)
        .resize({ width: 3840, height: 3840, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(tempFilePath);

      uploadTarget = tempFilePath;
    }

    const result = await cloudinary.uploader.upload(uploadTarget, {
      folder: `wedding-gallery/${albumName}`,
      public_id: fileKey,
      overwrite: false,
      resource_type: 'image',
    });
    console.log(`✓ Uploaded NEW: [${albumName}] ${fileName}`);
    return result;
  } catch (error) {
    console.error(`✕ Failed [${albumName}]: ${fileName} - ${error.message}`);
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

async function bulkUpload() {
  if (!fs.existsSync(PHOTOS_DIR)) {
    console.error(`Directory not found: ${PHOTOS_DIR}`);
    return;
  }

  // Check if a specific album name was passed via terminal argument
  const targetAlbumArg = process.argv[2];

  let albums = fs.readdirSync(PHOTOS_DIR).filter((f) =>
    fs.statSync(path.join(PHOTOS_DIR, f)).isDirectory()
  );

  if (targetAlbumArg) {
    if (!albums.includes(targetAlbumArg)) {
      console.error(`✕ Error: Album folder "${targetAlbumArg}" not found inside local-photos directory.`);
      return;
    }
    albums = [targetAlbumArg]; // Restrict list to only the specified album
  }

  for (const album of albums) {
    const albumPath = path.join(PHOTOS_DIR, album);
    const files = fs.readdirSync(albumPath).filter((f) =>
      /\.(jpg|jpeg|png|webp)$/i.test(f)
    );

    console.log(`\n--- Checking Album: ${album} (${files.length} photos) ---`);

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((file) => uploadFile(path.join(albumPath, file), album))
      );
    }
  }

  console.log('\n🎉 Upload Completed Successfully!');
}

bulkUpload();