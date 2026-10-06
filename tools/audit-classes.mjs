/* Dev-only audit: extract every class token from landing.html and
   confirm a matching rule exists in the compiled Tailwind output.
   Run: node tools/audit-classes.mjs                              */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'landing.html'), 'utf8');
const css  = readFileSync(join(root, 'css/tailwind.css'), 'utf8');
const js   = readFileSync(join(root, 'js/landing.js'), 'utf8');

/* Classes we define by hand (components layer) or that are JS state
   hooks rather than styles. Anything else must come from Tailwind. */
const allowlist = new Set([
  'glass', 'btn-skew', 'sheen', 'sheen-layer', 'rail', 'grid-bg',
  'stat-bar', 'scan-sweep', 'reveal', 'is-visible', 'eyebrow',
  'clip-notch-r', 'clip-notch-l', 'clip-corner', 'clip-slant-top',
  'hazard', 'scanlines', 'text-outline', 'text-outline-neon',
  'glow-accent', 'glow-accent-sm', 'sr-only-focusable', 'sheen-layer',
]);

const collect = (src) => {
  const tokens = new Set();
  // class="..." attributes only (avoids matching prose)
  for (const m of src.matchAll(/class="([^"]*)"/g)) {
    m[1].split(/\s+/).filter(Boolean).forEach((c) => tokens.add(c));
  }
  // class strings inside JS template literals
  for (const m of js.matchAll(/class="([^"]*)"/g)) {
    m[1].split(/\s+/).filter(Boolean).forEach((c) => tokens.add(c));
  }
  return tokens;
};

/* Build a lookup of every class name the stylesheet declares. */
const declared = new Set();
for (const m of css.matchAll(/\.((?:[^\s.,:>+~()[\]{}"'\\]|\\.)+)/g)) {
  // unescape Tailwind's escaped punctuation
  declared.add(m[1].replace(/\\(.)/g, '$1'));
}

const missing = [];
for (const token of collect(html)) {
  if (allowlist.has(token)) continue;
  // Tailwind escapes , / : [ ] . # % ( ) & > ! ' " ~ + $ = | ^ @ in class names
  const escaped = token.replace(/([,/:[\].#%()&>'"~+$=|^@])/g, '\\$1');
  const bare = token.replace(/[!]/g, '');
  const found =
    declared.has(escaped) ||
    declared.has(bare) ||
    declared.has(token) ||
    css.includes(escaped);
  if (!found) missing.push(token);
}

console.log(`classes audited : ${collect(html).size}`);
console.log(`missing         : ${missing.length}`);
if (missing.length) {
  console.log('\nNot found in css/tailwind.css:');
  missing.forEach((m) => console.log('  -', m));
  process.exitCode = 1;
} else {
  console.log('\nAll utilities resolve.');
}