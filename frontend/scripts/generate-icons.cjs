const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 1. Student SVG
const studentSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#161C28" />
      <stop offset="70%" stop-color="#0B0E14" />
      <stop offset="100%" stop-color="#07090D" />
    </radialGradient>
    <radialGradient id="cyanAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.35" />
      <stop offset="60%" stop-color="#0284C7" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#0B0E14" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="birdBody" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="60%" stop-color="#0284C7" />
      <stop offset="100%" stop-color="#0369A1" />
    </radialGradient>
    <radialGradient id="birdBelly" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#E0F2FE" />
      <stop offset="100%" stop-color="#BAE6FD" />
    </radialGradient>
    <radialGradient id="eyePupil" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="100%" stop-color="#0F172A" />
    </radialGradient>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="50%" stop-color="#EAB308" />
      <stop offset="100%" stop-color="#CA8A04" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" fill="url(#bgGlow)" />

  <!-- Ambient Neon Aura -->
  <circle cx="256" cy="265" r="190" fill="url(#cyanAura)" />

  <!-- Mascot Container scaled to center within safe zone -->
  <g transform="translate(68, 60) scale(1.88)">
    <!-- Main Body -->
    <circle cx="100" cy="105" r="58" fill="url(#birdBody)" />

    <!-- Belly Patch -->
    <ellipse cx="100" cy="120" rx="34" ry="37" fill="url(#birdBelly)" opacity="0.95" />

    <!-- Wings -->
    <path d="M 42 105 C 24 110, 26 135, 50 132 C 57 130, 60 115, 42 105 Z" fill="#0284C7" />
    <path d="M 158 105 C 176 110, 174 135, 150 132 C 143 130, 140 115, 158 105 Z" fill="#0284C7" />

    <!-- Eyes -->
    <ellipse cx="78" cy="90" rx="14" ry="16" fill="#FFFFFF" />
    <ellipse cx="122" cy="90" rx="14" ry="16" fill="#FFFFFF" />

    <!-- Pupils -->
    <circle cx="82" cy="91" r="7.5" fill="url(#eyePupil)" />
    <circle cx="126" cy="91" r="7.5" fill="url(#eyePupil)" />

    <!-- Eye Highlights -->
    <circle cx="85" cy="88" r="2.8" fill="#FFFFFF" />
    <circle cx="129" cy="88" r="2.8" fill="#FFFFFF" />

    <!-- Beak -->
    <polygon points="100,99 91,111 109,111" fill="#F97316" />
    <polygon points="100,115 93,111 107,111" fill="#EA580C" />

    <!-- Cheeks -->
    <circle cx="64" cy="103" r="6.5" fill="#F43F5E" opacity="0.4" />
    <circle cx="136" cy="103" r="6.5" fill="#F43F5E" opacity="0.4" />

    <!-- Feet -->
    <ellipse cx="86" cy="164" rx="9" ry="4.5" fill="#F97316" />
    <ellipse cx="114" cy="164" rx="9" ry="4.5" fill="#F97316" />

    <!-- Student Graduation Cap -->
    <g>
      <path d="M 66 69 C 74 48, 126 48, 134 69 Z" fill="#FFFFFF" />
      <path d="M 54 69 Q 100 63 146 69 Q 100 75 54 69 Z" fill="#38BDF8" />
      <circle cx="100" cy="49" r="4.5" fill="#F59E0B" />
      <!-- Hanging Tassel -->
      <path d="M 100 49 Q 120 54 126 65" fill="none" stroke="#F59E0B" stroke-width="2.5" />
      <circle cx="126" cy="67" r="3" fill="#D97706" />
    </g>

    <!-- Star Novin badge -->
    <g transform="translate(132, 125) scale(0.45)">
      <circle cx="20" cy="20" r="24" fill="#0B0E14" stroke="#64DD17" stroke-width="3" />
      <polygon points="20,4 25,14 36,15 28,23 30,34 20,29 10,34 12,23 4,15 15,14" fill="url(#goldGradient)" />
    </g>
  </g>
</svg>`;

// 2. Teacher SVG
const teacherSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="teacherBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="50%" stop-color="#4338CA" />
      <stop offset="100%" stop-color="#3730A3" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="50%" stop-color="#EAB308" />
      <stop offset="100%" stop-color="#CA8A04" />
    </linearGradient>
    <radialGradient id="teacherHighlight" cx="50%" cy="35%" r="50%">
      <stop offset="0%" stop-color="#818CF8" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#4F46E5" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" fill="url(#teacherBg)" />
  <circle cx="256" cy="220" r="200" fill="url(#teacherHighlight)" />

  <!-- Emblem Container (Centered within safe zone) -->
  <g transform="translate(256, 256)">
    <!-- Graduation / Academic Mortarboard -->
    <g transform="translate(0, -50)">
      <!-- Cap Diamond -->
      <polygon points="0,-75 135,-32 0,11 -135,-32" fill="#FFFFFF" />
      <!-- Cap Underside Shadow -->
      <polygon points="0,11 135,-32 120,-24 0,16" fill="#E2E8F0" />
      <!-- Skull cap band -->
      <path d="M -70,-10 C -70,30 70,30 70,-10 L 58,-14 C 58,20 -58,20 -58,-14 Z" fill="#E2E8F0" />
      <!-- Button and Tassel -->
      <circle cx="0" cy="-32" r="7" fill="#FDE047" />
      <path d="M 0,-32 Q 60,-20 85,25" fill="none" stroke="#FDE047" stroke-width="4.5" />
      <rect x="80" y="25" width="10" height="22" rx="3" fill="#EAB308" />
    </g>

    <!-- Open Knowledge Book -->
    <g transform="translate(0, 75)">
      <!-- Spine -->
      <path d="M -125,-25 Q 0,-4 125,-25 L 125,45 Q 0,65 -125,45 Z" fill="#312E81" opacity="0.4" />
      <!-- Left Page -->
      <path d="M -8,48 C -35,32 -80,32 -120,44 L -120,-25 C -80,-37 -35,-37 -8,-22 Z" fill="#FFFFFF" />
      <path d="M -22,-10 L -95,-10 M -22,6 L -95,6 M -22,22 L -70,22" stroke="#CBD5E1" stroke-width="4" stroke-linecap="round" />
      <!-- Right Page -->
      <path d="M 8,48 C 35,32 80,32 120,44 L 120,-25 C 80,-37 35,-37 8,-22 Z" fill="#F8FAFC" />
      <path d="M 22,-10 L 95,-10 M 22,6 L 95,6 M 22,22 L 70,22" stroke="#CBD5E1" stroke-width="4" stroke-linecap="round" />
      <!-- Book Center Spine -->
      <path d="M -8,-22 Q 0,-25 8,-22 L 8,48 Q 0,45 -8,48 Z" fill="#CBD5E1" />
    </g>

    <!-- Golden Award Novin Coin Badge -->
    <g transform="translate(85, 20)">
      <circle cx="0" cy="0" r="32" fill="url(#goldGrad)" stroke="#FFFFFF" stroke-width="4" />
      <!-- Persian Noon (ن) glyph for Novin -->
      <path d="M -16,-3 C -16,13 16,13 16,-3" fill="none" stroke="#78350F" stroke-width="4.5" stroke-linecap="round" />
      <circle cx="0" cy="-6" r="3.5" fill="#78350F" />
    </g>
  </g>
</svg>`;

// 3. Admin SVG
const adminSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="adminBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="50%" stop-color="#1E293B" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
    <linearGradient id="adminBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
    <linearGradient id="goldAdmin" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="50%" stop-color="#EAB308" />
      <stop offset="100%" stop-color="#CA8A04" />
    </linearGradient>
    <radialGradient id="adminAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#2563EB" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" fill="url(#adminBg)" />
  <circle cx="256" cy="256" r="220" fill="url(#adminAura)" />

  <!-- Shield Crest (Centered within safe zone) -->
  <g transform="translate(256, 256)">
    <!-- Outer Shield Border -->
    <path d="M 0,-145 L 125,-85 C 125,45 75,130 0,165 C -75,130 -125,45 -125,-85 Z" fill="#1E293B" stroke="#2563EB" stroke-width="7" />
    <!-- Inner Shield Surface -->
    <path d="M 0,-130 L 110,-77 C 110,38 65,115 0,146 C -65,115 -110,38 -110,-77 Z" fill="url(#adminBlue)" opacity="0.92" />

    <!-- System Landmark Pillars / Dashboard Metrics -->
    <!-- Central Pillar / Chart Bar -->
    <rect x="-14" y="-20" width="28" height="85" rx="5" fill="#FFFFFF" />
    <!-- Left Pillar / Chart Bar -->
    <rect x="-52" y="5" width="26" height="60" rx="5" fill="#DBEAFE" />
    <!-- Right Pillar / Chart Bar -->
    <rect x="26" y="-5" width="26" height="70" rx="5" fill="#DBEAFE" />

    <!-- Executive Crown / Star at top of shield -->
    <g transform="translate(0, -60)">
      <polygon points="0,-32 10,-8 35,-12 18,10 24,34 0,22 -24,34 -18,10 -35,-12 -10,-8" fill="url(#goldAdmin)" stroke="#CA8A04" stroke-width="2" />
    </g>

    <!-- Base Pedestal Line -->
    <rect x="-70" y="72" width="140" height="9" rx="4.5" fill="#FFFFFF" />
  </g>
</svg>`;

// Student uses PNG source images instead of SVG
const studentDestDir = path.resolve(__dirname, '../apps/student/public');
const studentFaviconSource = path.join(studentDestDir, 'logo.png');
const studentPwaSource = path.join(studentDestDir, 'android-app-icon.png');

const svgConfigs = [
  { name: 'teacher', svg: teacherSvg, destDir: path.resolve(__dirname, '../apps/teacher/public') },
  { name: 'admin', svg: adminSvg, destDir: path.resolve(__dirname, '../apps/admin/public') },
];

async function generateFromSvg(config) {
  if (!fs.existsSync(config.destDir)) {
    fs.mkdirSync(config.destDir, { recursive: true });
  }

  const svgBuffer = Buffer.from(config.svg);

  // Save favicon.svg
  fs.writeFileSync(path.join(config.destDir, 'favicon.svg'), config.svg, 'utf8');

  // PWA icons
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(config.destDir, 'pwa-192x192.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(config.destDir, 'pwa-512x512.png'));
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(config.destDir, 'pwa-maskable-192x192.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(config.destDir, 'pwa-maskable-512x512.png'));

  // Apple touch icon 180x180
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(config.destDir, 'apple-touch-icon.png'));

  // 32x32 for favicon.png
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(config.destDir, 'favicon.png'));

  // 48x48 for favicon.ico
  await sharp(svgBuffer).resize(48, 48).png().toFile(path.join(config.destDir, 'favicon.ico'));

  console.log(`Generated icons for ${config.name} in ${config.destDir}`);
}

async function generateStudentIcons() {
  if (!fs.existsSync(studentDestDir)) {
    fs.mkdirSync(studentDestDir, { recursive: true });
  }

  // --- Favicon / Apple touch icon from logo.png ---
  await sharp(studentFaviconSource).resize(32, 32).png().toFile(path.join(studentDestDir, 'favicon.png'));
  await sharp(studentFaviconSource).resize(48, 48).png().toFile(path.join(studentDestDir, 'favicon.ico'));
  await sharp(studentFaviconSource).resize(180, 180).png().toFile(path.join(studentDestDir, 'apple-touch-icon.png'));

  // --- PWA icons from android-app-icon.png ---
  await sharp(studentPwaSource).resize(192, 192).png().toFile(path.join(studentDestDir, 'pwa-192x192.png'));
  await sharp(studentPwaSource).resize(512, 512).png().toFile(path.join(studentDestDir, 'pwa-512x512.png'));
  await sharp(studentPwaSource).resize(192, 192).png().toFile(path.join(studentDestDir, 'pwa-maskable-192x192.png'));
  await sharp(studentPwaSource).resize(512, 512).png().toFile(path.join(studentDestDir, 'pwa-maskable-512x512.png'));

  // --- Android mipmap launcher icons from android-app-icon.png ---
  const androidResDir = path.resolve(__dirname, '../apps/student/android/app/src/main/res');
  const mipmapSizes = [
    { folder: 'mipmap-mdpi', size: 48 },
    { folder: 'mipmap-hdpi', size: 72 },
    { folder: 'mipmap-xhdpi', size: 96 },
    { folder: 'mipmap-xxhdpi', size: 144 },
    { folder: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const { folder, size } of mipmapSizes) {
    const mipmapDir = path.join(androidResDir, folder);
    if (!fs.existsSync(mipmapDir)) {
      fs.mkdirSync(mipmapDir, { recursive: true });
    }
    await sharp(studentPwaSource).resize(size, size).png().toFile(path.join(mipmapDir, 'ic_launcher.png'));
    await sharp(studentPwaSource).resize(size, size).png().toFile(path.join(mipmapDir, 'ic_launcher_round.png'));
    await sharp(studentPwaSource).resize(size, size).png().toFile(path.join(mipmapDir, 'ic_launcher_foreground.png'));
  }

  console.log(`Generated icons for student in ${studentDestDir}`);
  console.log(`Generated Android launcher icons in ${androidResDir}`);
}

async function generate() {
  // Generate student icons from PNG sources
  await generateStudentIcons();

  // Generate teacher & admin icons from SVG sources
  for (const config of svgConfigs) {
    await generateFromSvg(config);
  }
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
