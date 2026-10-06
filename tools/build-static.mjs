/* Build output untuk Vercel.
   Vercel tidak menemukan framework di proyek ini, jadi defaultnya
   Output Directory = `public`. Script ini menyalin file statis ke
   folder itu supaya `vercel build` punya output yang bisa dilayani.

   Dipanggil otomatis oleh `npm run build`, setelah Tailwind selesai.
   Jalankan manual juga boleh:  node tools/build-static.mjs        */

import { cp, mkdir, rm, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public');

/* Folder ikut apa adanya ke public/ */
const DIRS = ['css', 'html', 'js', 'pictures', 'videos', 'audio'];

/* File di root repo yang jadi halaman */
const FILES = ['index.html', 'landing.html'];

/* File yang tidak ikut deploy:
   - *.src.css  -> hanya bahan compile Tailwind, tidak pernah di-load browser
   - bg-video*.gif -> GIF preview 61 MB + 14 MB untuk README saja, bukan
     bagian situs. README juga memperingatkan jangan dipasang di halaman. */
const SKIP = new Set([
  'css/tailwind.src.css',
  'pictures/bg-video.gif',
  'pictures/bg-video_shorts.gif',
]);

const rel = (p) => relative(root, p).split(sep).join('/');

const skipDir = (src) => {
  const r = rel(src);
  return r === 'node_modules' || r === 'tools' || r === '.git';
};

async function countFiles(dir) {
  let n = 0;
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile()) n++;
  }
  return n;
}

async function totalSize(dir) {
  let bytes = 0;
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile()) bytes += (await stat(join(entry.parentPath, entry.name))).size;
  }
  return bytes;
}

async function main() {
  if (!existsSync(join(root, 'css/tailwind.css'))) {
    console.error('css/tailwind.css belum ada. Jalankan `npm run build` dulu.');
    process.exitCode = 1;
    return;
  }

  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  for (const file of FILES) {
    const src = join(root, file);
    if (!existsSync(src)) {
      console.warn(`lewati ${file} (tidak ada)`);
      continue;
    }
    await cp(src, join(out, file));
  }

  const skipped = [];
  for (const dir of DIRS) {
    const src = join(root, dir);
    if (!existsSync(src)) {
      console.warn(`lewati ${dir}/ (tidak ada)`);
      continue;
    }
    await cp(src, join(out, dir), {
      recursive: true,
      filter: (from) => {
        if (skipDir(from)) return false;
        if (SKIP.has(rel(from))) {
          skipped.push(rel(from));
          return false;
        }
        return true;
      },
    });
  }

  const mb = ((await totalSize(out)) / 1024 / 1024).toFixed(1);
  console.log(`public/ siap: ${await countFiles(out)} file, ${mb} MB`);
  if (skipped.length) console.log(`tidak ikut deploy: ${skipped.join(', ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});