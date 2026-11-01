/**
 * Copies browser assets that must be served as plain files from node_modules
 * into public/, so they always match the installed library versions.
 * Runs automatically before `npm run dev` and `npm run build`.
 *
 * - public/pdfjs/  : pdf.js worker + CMaps, standard fonts, wasm image decoders, ICC profiles
 * - public/ffmpeg/ : ffmpeg.wasm core, used by admins to split large videos into parts
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// ---- pdf.js ----
{
  const pkgDir = path.dirname(require.resolve('pdfjs-dist/package.json'));
  const outDir = path.resolve('public/pdfjs');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
    const src = path.join(pkgDir, dir);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(outDir, dir), { recursive: true });
  }
  fs.copyFileSync(path.join(pkgDir, 'build', 'pdf.worker.min.mjs'), path.join(outDir, 'pdf.worker.min.mjs'));
  const { version } = require('pdfjs-dist/package.json');
  fs.writeFileSync(path.join(outDir, 'VERSION'), version + '\n');
  console.log(`[vendor] pdfjs-dist ${version} -> public/pdfjs`);
}

// ---- ffmpeg.wasm core ----
{
  const pkgDir = path.resolve('node_modules/@ffmpeg/core');
  const outDir = path.resolve('public/ffmpeg');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
    fs.copyFileSync(path.join(pkgDir, 'dist', 'esm', f), path.join(outDir, f));
  }
  const { version } = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  fs.writeFileSync(path.join(outDir, 'VERSION'), version + '\n');
  console.log(`[vendor] @ffmpeg/core ${version} -> public/ffmpeg`);
}
