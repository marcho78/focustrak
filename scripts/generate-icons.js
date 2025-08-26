const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  const iconsDir = path.join(publicDir, 'icons');
  
  // Ensure directories exist
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  for (const size of sizes) {
    // Create a simple blue square with "F" as SVG
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.1}" />
        <text x="50%" y="50%" font-family="Arial" font-size="${size * 0.5}" font-weight="bold" 
              fill="white" text-anchor="middle" dominant-baseline="central">F</text>
      </svg>
    `;

    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
    
    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Generate placeholder screenshots
  const screenshotsDir = path.join(publicDir, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Desktop screenshot
  const desktopSvg = `
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <rect width="1280" height="720" fill="#1f2937" />
      <text x="50%" y="50%" font-family="Arial" font-size="48" font-weight="bold" 
            fill="#3b82f6" text-anchor="middle" dominant-baseline="central">Focus App</text>
    </svg>
  `;
  
  await sharp(Buffer.from(desktopSvg))
    .png()
    .toFile(path.join(screenshotsDir, 'desktop.png'));
  
  // Mobile screenshot
  const mobileSvg = `
    <svg width="360" height="640" xmlns="http://www.w3.org/2000/svg">
      <rect width="360" height="640" fill="#1f2937" />
      <text x="50%" y="50%" font-family="Arial" font-size="32" font-weight="bold" 
            fill="#3b82f6" text-anchor="middle" dominant-baseline="central">Focus App</text>
    </svg>
  `;
  
  await sharp(Buffer.from(mobileSvg))
    .png()
    .toFile(path.join(screenshotsDir, 'mobile.png'));

  console.log('All icons and screenshots generated successfully!');
}

generateIcons().catch(console.error);