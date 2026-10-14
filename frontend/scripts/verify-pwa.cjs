const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const apps = ['student', 'teacher', 'admin'];

async function verify() {
  console.log('--- Verifying PWA Artifacts ---');
  let hasErrors = false;

  for (const app of apps) {
    console.log(`\nChecking app: ${app}`);
    const distDir = path.resolve(__dirname, `../apps/${app}/dist`);

    if (!fs.existsSync(distDir)) {
      console.error(`ERROR: dist directory missing for ${app}`);
      hasErrors = true;
      continue;
    }

    // 1. Verify Manifest
    const manifestPath = path.join(distDir, 'manifest.webmanifest');
    if (!fs.existsSync(manifestPath)) {
      console.error(`ERROR: manifest.webmanifest missing for ${app}`);
      hasErrors = true;
      continue;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`  ✓ Manifest found: "${manifest.name}" (${manifest.short_name})`);
    console.log(`  ✓ Start URL: ${manifest.start_url}, Scope: ${manifest.scope}, Display: ${manifest.display}`);
    console.log(`  ✓ Theme Color: ${manifest.theme_color}, Background Color: ${manifest.background_color}`);

    // Verify icons in manifest
    if (!manifest.icons || manifest.icons.length < 2) {
      console.error(`ERROR: Insufficient icons declared in manifest for ${app}`);
      hasErrors = true;
    }

    for (const icon of manifest.icons) {
      const iconPath = path.join(distDir, icon.src);
      if (!fs.existsSync(iconPath)) {
        console.error(`  ERROR: Referenced icon missing: ${icon.src}`);
        hasErrors = true;
      } else {
        const metadata = await sharp(iconPath).metadata();
        const expectedDimensions = icon.sizes.split('x').map(Number);
        if (metadata.width !== expectedDimensions[0] || metadata.height !== expectedDimensions[1]) {
          console.error(`  ERROR: Icon ${icon.src} dimension mismatch. Expected ${icon.sizes}, got ${metadata.width}x${metadata.height}`);
          hasErrors = true;
        } else {
          console.log(`  ✓ Icon ${icon.src} (${icon.sizes}, ${icon.purpose}) verified.`);
        }
      }
    }

    // 2. Verify Service Worker
    const swPath = path.join(distDir, 'sw.js');
    if (!fs.existsSync(swPath)) {
      console.error(`ERROR: Service worker missing: sw.js in ${app}`);
      hasErrors = true;
    } else {
      const swContent = fs.readFileSync(swPath, 'utf8');
      console.log(`  ✓ Service worker sw.js generated (${(swContent.length / 1024).toFixed(2)} KB).`);
    }

    // 3. Verify HTML link tags
    const htmlPath = path.join(distDir, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    if (!html.includes('rel="manifest"')) {
      console.error(`ERROR: rel="manifest" link tag missing in index.html for ${app}`);
      hasErrors = true;
    } else {
      console.log(`  ✓ index.html has manifest link.`);
    }

    if (!html.includes('apple-touch-icon')) {
      console.error(`ERROR: apple-touch-icon link tag missing in index.html for ${app}`);
      hasErrors = true;
    } else {
      console.log(`  ✓ index.html has apple-touch-icon link.`);
    }
  }

  if (hasErrors) {
    console.error('\nVerification FAILED with errors.');
    process.exit(1);
  } else {
    console.log('\nAll 3 frontends PASSED PWA verification successfully! 🎉');
  }
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
