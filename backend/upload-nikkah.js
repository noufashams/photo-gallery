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

// Locate local photos folder (handles "nikkah", "Nikkah", "nikah", etc.)
const BASE_DIR = path.join(__dirname, '../local-photos');
const BATCH_SIZE = 3;
const MAX_BYTES = 9 * 1024 * 1024;

async function uploadSingleFile(filePath, albumName) {
  const fileName = path.basename(filePath);
  const fileKey = path.parse(fileName).name;
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
      overwrite: true,
      resource_type: 'image',
    });

    console.log(`✓ Uploaded FORCE: [${albumName}] ${fileName}`);
    return result;
  } catch (error) {
    console.error(`✕ Failed [${albumName}]: ${fileName} -> ${error.message}`);
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

async function forceUploadNikkah() {
  if (!fs.existsSync(BASE_DIR)) {
    console.error(`Base directory not found: ${BASE_DIR}`);
    return;
  }

  const dirs = fs.readdirSync(BASE_DIR).filter((f) =>
    fs.statSync(path.join(BASE_DIR, f)).isDirectory()
  );

  // Find any folder matching "nikkah" regardless of capital letters
  const nikkahFolder = dirs.find((d) => d.toLowerCase().includes('nikkah') || d.toLowerCase().includes('nikah'));

  if (!nikkahFolder) {
    console.error(`Could not find any folder with 'nikkah' inside local-photos! Found folders:`, dirs);
    return;
  }

  const albumPath = path.join(BASE_DIR, nikkahFolder);
  const files = fs.readdirSync(albumPath).filter((f) =>
    /\.(jpg|jpeg|png|webp)$/i.test(f)
  );

  console.log(`\n🚀 Force uploading '${nikkahFolder}' (${files.length} photos) directly to Cloudinary...\n`);

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((file) => uploadSingleFile(path.join(albumPath, file), 'nikkah'))
    );
  }

  console.log('\n🎉 Nikkah Upload Finished!');
}

forceUploadNikkah();