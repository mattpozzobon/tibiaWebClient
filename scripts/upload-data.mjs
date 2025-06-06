// scripts/upload-data.mjs
import { execSync }     from 'node:child_process';
import { createHash }   from 'node:crypto';
import {
  readdirSync, statSync,
  readFileSync, writeFileSync, existsSync,
} from 'node:fs';
import { join, relative } from 'node:path';

const SRC      = 'client/data';          // root of all asset folders
const BUCKET   = 'tibia-assets/data';    // R2 key prefix
const MANIFEST = '.r2-upload-manifest.json'; // local record of last upload

/* --------------------------------------------------------- helpers */

/** Recursively yield absolute paths of every file in a directory. */
function* walk (dir) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const s   = statSync(abs);
    if (s.isDirectory()) yield* walk(abs);
    else                  yield abs;
  }
}

/** Return a quick SHA-1 of a file (good enough for change-detection). */
function hashFile (path) {
  const h = createHash('sha1');
  h.update(readFileSync(path));
  return h.digest('hex');
}

/* --------------------------------------------------------- load / init */

const previous = existsSync(MANIFEST)
  ? JSON.parse(readFileSync(MANIFEST, 'utf8'))
  : {};

const nextManifest = {};          // will be written at the end
let uploaded = 0;

/* --------------------------------------------------------- main loop */

for (const absPath of walk(SRC)) {
  const relKey  = relative(SRC, absPath).replace(/\\/g, '/'); // Win → POSIX
  const r2Key   = `${BUCKET}/${relKey}`;
  const sha1    = hashFile(absPath);
  nextManifest[relKey] = sha1;    // remember for next time

  if (previous[relKey] === sha1) {               // unchanged
    console.log(`⏭  ${relKey} (unchanged)`);
    continue;
  }

  console.log(`↗  ${relKey}`);
  execSync(
    // --remote ==> hit the real bucket, not the local Miniflare store :contentReference[oaicite:0]{index=0}
    `npx wrangler r2 object put "${r2Key}" --file "${absPath}" --remote`,
    { stdio: 'inherit' },
  );
  uploaded++;
}

/* --------------------------------------------------------- wrap-up */

writeFileSync(MANIFEST, JSON.stringify(nextManifest, null, 2));
console.log(
  uploaded
    ? `✅ Uploaded ${uploaded} changed file${uploaded > 1 ? 's' : ''}`
    : '✅ All files already up-to-date',
);
