import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = 'client/data';           // root of all asset folders
const BUCKET = 'tibia-assets/data';  // R2 key prefix

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const s = statSync(abs);
    if (s.isDirectory()) yield* walk(abs);
    else yield abs;
  }
}

for (const absPath of walk(SRC)) {
  const relKey = relative(SRC, absPath).replace(/\\/g, '/');   // windows → POSIX
  const r2Key  = `${BUCKET}/${relKey}`;
  console.log(`↗  ${relKey}`);
  execSync(`npx wrangler r2 object put "${r2Key}" --file "${absPath}"`, {
    stdio: 'inherit',
  });
}
console.log('✅  All assets uploaded');
