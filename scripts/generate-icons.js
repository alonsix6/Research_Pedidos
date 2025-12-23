#!/usr/bin/env node
/**
 * Generate PWA icons from SVG
 * Run with: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/icons');
const SVG_PATH = path.join(ICONS_DIR, 'icon.svg');

// Icon sizes needed for PWA and iOS
const SIZES = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'icon-48.png' },
  { size: 72, name: 'icon-72.png' },
  { size: 96, name: 'icon-96.png' },
  { size: 120, name: 'apple-touch-icon-120.png' },
  { size: 128, name: 'icon-128.png' },
  { size: 144, name: 'icon-144.png' },
  { size: 152, name: 'apple-touch-icon-152.png' },
  { size: 167, name: 'apple-touch-icon-167.png' },  // iPad Pro
  { size: 180, name: 'apple-touch-icon.png' },      // iPhone retina
  { size: 192, name: 'icon-192.png' },              // Android/PWA
  { size: 256, name: 'icon-256.png' },
  { size: 384, name: 'icon-384.png' },
  { size: 512, name: 'icon-512.png' },              // PWA splash
];

async function generateIcons() {
  console.log('Generating PWA icons from SVG...\n');

  // Read SVG
  const svgBuffer = fs.readFileSync(SVG_PATH);

  for (const { size, name } of SIZES) {
    const outputPath = path.join(ICONS_DIR, name);

    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log('Generated: ' + name + ' (' + size + 'x' + size + ')');
    } catch (err) {
      console.error('Failed: ' + name + ' - ' + err.message);
    }
  }

  console.log('\nIcon generation complete!');
}

generateIcons().catch(console.error);
