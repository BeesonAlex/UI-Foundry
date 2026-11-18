import fs from 'node:fs';
import path from 'node:path';

const SKIP = /(\.test|\.spec|\.stories)\.[jt]sx?$|^index\.[jt]sx?$|^specimens\.[jt]sx?$|^_/;

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p));
    else if (/\.[jt]sx$/.test(e.name) && !SKIP.test(e.name)) out.push(p);
  }
  return out.sort();
}

function cvaKeys(src, key) {
  // finds `variant: { primary: '...', ghost: '...' }` inside a cva()/tv() config
  const re = new RegExp(`\\b${key}\\s*:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, 'm');
  const m = src.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/^\s*['"]?([\w-]+)['"]?\s*:/gm)].map((x) => x[1]);
}

function jsdocTag(src, tag) {
  const m = src.match(new RegExp(`@${tag}\\s+([^\\n*]+)`));
  return m ? m[1].trim().split(/[|,\s]+/).filter(Boolean) : [];
}

export function scanComponents(root, cfg) {
  const dir = path.join(root, cfg.componentsDir);
  return listFiles(dir).map((file) => {
    const src = fs.readFileSync(file, 'utf8');
    const exportsList = [...src.matchAll(/export\s+(?:default\s+)?(?:function|const|class)\s+([A-Z][A-Za-z0-9]*)/g)].map((m) => m[1]);
    const reexports = [...src.matchAll(/export\s*\{([^}]+)\}/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()).filter((s) => /^[A-Z]/.test(s)));
    const all = [...new Set([...exportsList, ...reexports])];
    const primitives = [...new Set([
      ...[...src.matchAll(/from\s+['"]@base-ui\/react\/([\w-]+)['"]/g)].map((m) => `base-ui/${m[1]}`),
      ...[...src.matchAll(/from\s+['"](react-aria-components|react-aria)['"]/g)].map((m) => m[1]),
    ])];
    const variants = [...new Set([...cvaKeys(src, 'variant'), ...jsdocTag(src, 'variants')])];
    const sizes = [...new Set([...cvaKeys(src, 'size'), ...jsdocTag(src, 'sizes')])];
    const status = jsdocTag(src, 'status')[0] || 'stable';
    const base = path.basename(file).replace(/\.[jt]sx$/, '');
    const name = all.find((n) => n.toLowerCase() === base.replace(/-/g, '').toLowerCase()) || all[0] || base;
    return {
      name,
      file: path.relative(root, file).split(path.sep).join('/'),
      exports: all,
      primitives,
      variants,
      sizes,
      status,
      client: /^\s*['"]use client['"]/.test(src),
    };
  });
}

export function inventoryTable(items) {
  if (!items.length) return '_No components yet. Build one with the component-build skill._';
  const code = (xs) => (xs.length ? xs.map((x) => `\`${x}\``).join(' ') : '—');
  return [
    '| Component | File | Exports | Primitive | Variants | Sizes | Status |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...items.map((i) => `| ${i.name} | \`${i.file}\` | ${code(i.exports)} | ${code(i.primitives)} | ${code(i.variants)} | ${code(i.sizes)} | ${i.status} |`),
  ].join('\n');
}
