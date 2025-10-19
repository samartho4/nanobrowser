import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const srcPath = path.resolve(__dirname, 'src/offscreen/offscreen.html');
const destDir = path.resolve(__dirname, '../dist/offscreen');
const destPath = path.resolve(destDir, 'offscreen.html');

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy HTML file
fs.copyFileSync(srcPath, destPath);

console.log('✅ Offscreen HTML copied to dist/offscreen/');
