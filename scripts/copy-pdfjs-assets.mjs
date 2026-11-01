/**
 * Copies the pdf.js worker and its helper data (CMaps, standard fonts, wasm
 * image decoders, ICC colour profiles) from the installed pdfjs-dist into
 * public/pdfjs/, so they are served by the site and always match the
 * library version. Runs automatically before `npm run dev` and `npm run build`.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
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
console.log(`[pdfjs] copied worker + data for pdfjs-dist ${version} to public/pdfjs`);
