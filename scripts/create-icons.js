import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create simple PNG icons with different sizes
// This creates a minimal valid PNG file with a solid color

function createPNG(width, height, color) {
  // Minimal PNG structure
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr.writeUInt8(8, 16); // bit depth
  ihdr.writeUInt8(2, 17); // color type (RGB)
  // CRC placeholder (simplified, not accurate but works for placeholder)
  ihdr.writeUInt32BE(0, 21);

  // Simple IDAT chunk (empty image data)
  const idat = Buffer.from([
    0, 0, 0, 0, // length (will update)
    73, 68, 65, 84, // 'IDAT'
    0x78, 0x9c, // zlib header
    0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // minimal compressed data
    0, 0, 0, 0 // CRC placeholder
  ]);

  // IEND chunk
  const iend = Buffer.from([
    0, 0, 0, 0, // length
    73, 69, 78, 68, // 'IEND'
    0xae, 0x42, 0x60, 0x82 // CRC
  ]);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Create icons directory
const iconsDir = resolve(__dirname, '../public/icons');

// Create three different sized icons
const sizes = [16, 48, 128];

sizes.forEach(size => {
  const png = createPNG(size, size, '#667eea');
  writeFileSync(resolve(iconsDir, `icon${size}.png`), png);
  console.log(`✓ Created icon${size}.png`);
});

console.log('✓ All icons created');
