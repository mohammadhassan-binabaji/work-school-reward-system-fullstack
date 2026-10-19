const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS_DIR = path.resolve(__dirname, '../apps/student/src/assets/images');

const owlFiles = [
  'owl-brand.png',
  'owl-cheering.png',
  'owl-checking.png',
  'owl-guidance.png',
  'owl.png',
];

const MAX_DIMENSION = 1024;

async function optimize() {
  for (const file of owlFiles) {
    const filePath = path.join(ASSETS_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⏭  Skipping ${file} (not found)`);
      continue;
    }

    const originalSize = fs.statSync(filePath).size;
    const meta = await sharp(filePath).metadata();
    console.log(`📐 ${file}: ${meta.width}x${meta.height} (original)`);

    const needsResize = meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION;

    let pipeline = sharp(filePath);
    if (needsResize) {
      pipeline = pipeline.resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    const buffer = await pipeline
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();

    fs.writeFileSync(filePath, buffer);
    const newMeta = await sharp(filePath).metadata();
    const newSize = fs.statSync(filePath).size;
    const saved = ((1 - newSize / originalSize) * 100).toFixed(1);
    console.log(
      `✅ ${file}: ${(originalSize / 1024).toFixed(0)} KB → ${(newSize / 1024).toFixed(0)} KB ` +
      `(${newMeta.width}x${newMeta.height}, ${saved}% saved)\n`
    );
  }
  console.log('Done! All owl images optimized.');
}

optimize().catch(console.error);
