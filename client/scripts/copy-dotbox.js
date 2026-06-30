/**
 * Post-build script: copies DotBox dist into the main dist/dotbox folder
 * and fixes asset paths to be relative.
 *
 * Run automatically after `vite build` via the build script in package.json.
 */

import { cpSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const srcDir  = join(__dirname, '..', '..', 'DotBox', 'dist');
const destDir = join(__dirname, '..', '..', 'dist', 'dotbox');

if (!existsSync(srcDir)) {
  console.error(`[copy-dotbox] DotBox dist not found at: ${srcDir}`);
  console.error('  → Run `npm run build` inside the DotBox folder first.');
  process.exit(1);
}

// Clean destination first to remove stale assets from previous builds
rmSync(destDir, { recursive: true, force: true });

// Copy everything from DotBox/dist → dist/dotbox
mkdirSync(destDir, { recursive: true });
cpSync(srcDir, destDir, { recursive: true, force: true });
console.log(`[copy-dotbox] Copied DotBox dist → dist/dotbox`);

// Fix absolute asset paths in index.html to be relative
const indexPath = join(destDir, 'index.html');
let html = readFileSync(indexPath, 'utf8');
html = html
  .replace(/src="\/assets\//g, 'src="./assets/')
  .replace(/href="\/assets\//g, 'href="./assets/')
  .replace(/href="\/favicon\.svg"/g, 'href="./favicon.svg"');
writeFileSync(indexPath, html, 'utf8');
console.log('[copy-dotbox] Fixed asset paths in dist/dotbox/index.html');
