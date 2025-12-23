/**
 * Script para generar iconos PNG desde el SVG base
 * Requiere: npm install sharp
 * Uso: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Si sharp no está instalado, crear iconos placeholder simples
async function generateIcons() {
  const iconsDir = path.join(__dirname, '../public/icons');
  const sizes = [192, 512];

  console.log('📱 Generando iconos PWA...');

  try {
    // Intentar usar sharp si está disponible
    const sharp = require('sharp');
    const svgPath = path.join(iconsDir, 'icon.svg');
    const svgBuffer = fs.readFileSync(svgPath);

    for (const size of sizes) {
      const outputPath = path.join(iconsDir, `icon-${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✅ Generado: icon-${size}.png`);
    }
  } catch (error) {
    // Si sharp no está disponible, crear placeholders
    console.log('⚠️ Sharp no disponible, creando placeholders...');

    for (const size of sizes) {
      const outputPath = path.join(iconsDir, `icon-${size}.png`);
      // Crear un archivo placeholder (1x1 pixel naranja)
      const placeholder = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        'base64'
      );
      fs.writeFileSync(outputPath, placeholder);
      console.log(`⚠️ Placeholder creado: icon-${size}.png (reemplazar con icono real)`);
    }
  }

  console.log('\n✅ Iconos generados!');
  console.log('💡 Para iconos de alta calidad, usa una herramienta como:');
  console.log('   - https://realfavicongenerator.net');
  console.log('   - https://www.pwabuilder.com/imageGenerator');
}

generateIcons().catch(console.error);
