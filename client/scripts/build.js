/**
 * Unified build script: builds DotBox → builds client → copies DotBox dist.
 */
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

function run(cmd, cwd) {
  console.log(`\n> ${cmd}  (${cwd})\n`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

try {
  // 1. Build DotBox
  run('npx vite build', join(root, 'DotBox'));

  // 2. Build client
  run('npx vite build', __dirname);

  // 3. Copy DotBox dist into client dist
  run('node copy-dotbox.js', __dirname);

  console.log('\n✅ Build complete!\n');
} catch (err) {
  console.error('\n❌ Build failed:', err.message);
  process.exit(1);
}
