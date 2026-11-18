import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const INSTALL_HINT = 'Playwright is required: npm i -D playwright && npx playwright install chromium';

export async function loadPlaywright(root) {
  try { return await import('playwright'); } catch {}
  const candidates = [path.join(root, 'package.json')];
  try { candidates.push(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'noop.js')); } catch {}
  for (const base of candidates) {
    try {
      const req = createRequire(base);
      const resolved = req.resolve('playwright');
      return await import(pathToFileURL(resolved).href);
    } catch {}
  }
  throw new Error(INSTALL_HINT);
}

export async function launch(root) {
  const pw = await loadPlaywright(root);
  const chromium = pw.chromium || pw.default?.chromium;
  const attempts = [
    () => chromium.launch(),
    () => chromium.launch({ channel: 'chrome' }),
    () => {
      const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
      if (!exe) throw new Error('no chrome');
      return chromium.launch({ executablePath: exe });
    },
  ];
  let last;
  for (const a of attempts) { try { return await a(); } catch (e) { last = e; } }
  throw new Error(`Could not launch a browser (${last?.message?.split('\n')[0]}). ${INSTALL_HINT}`);
}

export const slug = (s) => s.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'root';
export const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
