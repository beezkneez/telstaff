// Generate PNG icons from SVG using Playwright
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function generateIcon(size) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: size, height: size } });

  const svg = `
  <html><body style="margin:0;padding:0;background:#060809;">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.125}" fill="#060809"/>
    <g transform="translate(${size * 0.21}, ${size * 0.16}) scale(${size / 192})">
      <path fill="#ff4a1c" d="M56 8c-1.5-2.5-4.5-3.5-7-2-1.7 1.1-3 2.7-4 4.3-1 1.6-2 3.5-2.8 5.5-1.6 3.9-3 8.7-4.1 13.4-.8 3.5-1.5 7.1-2 10.5-1.5-1.5-2.7-3.5-3.5-5.8-1.5-3.3-2-7.5-2-13A5 5 0 0022 18.5C16.5 23 13 30 13 37.5c0 19.3 15.7 35 35 35s35-15.7 35-35c0-2.6-.3-5.1-.8-7.5-2.9-2.9-4.8-4.8-6.6-7.2-1.8-2.3-3.5-5.2-5.9-10zM54.6 57.6C51.5 60.5 47 62 42.5 60 38 58 35 53.5 35 48.5c0 0 4.4 2.5 12.5 2.5 0-5 2.5-20 6.3-22.5 2.5 5 3.9 6.5 6.9 9.4A15 15 0 0165 48.5a15 15 0 01-10.4 9.1z"/>
    </g>
    <text x="${size/2}" y="${size * 0.81}" text-anchor="middle" fill="#ff4a1c" font-family="Arial,sans-serif" font-weight="900" font-size="${size * 0.145}" letter-spacing="${size * 0.01}">BS</text>
  </svg>
  </body></html>`;

  await page.setContent(svg);
  await page.screenshot({ path: path.join(__dirname, '..', 'public', `icon-${size}.png`), type: 'png' });
  await browser.close();
  console.log(`Generated icon-${size}.png`);
}

(async () => {
  await generateIcon(192);
  await generateIcon(512);
})();
