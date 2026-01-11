import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');

// Move popup.html from dist/src/popup/index.html to dist/popup.html
const popupSrc = resolve(distDir, 'src/popup/index.html');
const popupDest = resolve(distDir, 'popup.html');

if (existsSync(popupSrc)) {
  copyFileSync(popupSrc, popupDest);
  console.log('✓ Moved popup.html to dist root');
}

console.log('✓ Post-build cleanup complete');
