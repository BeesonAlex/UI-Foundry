#!/usr/bin/env node
// ui-foundry init: scaffold the design system workspace into a React/Next.js project.
//
//   node <plugin>/tools/init.mjs [--root .] [--cursor] [--ci] [--no-components] [--no-specimen]
//                                [--style tailwind|css-modules] [--force] [--install]
//
// Creates design/ (tokens.json, DESIGN.md, components.md, config, tools), seeds components/ui with
// Base UI exemplars, adds the /design-system specimen route, wires global CSS, package.json scripts,
// AGENTS.md (+ CLAUDE.md import), and optionally Cursor rules/skills and CI.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(here, '..');
const T = (...p) => path.join(pluginRoot, 'templates', ...p);

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const root = path.resolve(opt('root', process.cwd()));
const force = flag('force');
const log = [];
const say = (s) => { log.push(s); console.log(s); };
const R = (p) => path.relative(root, p).split(path.sep).join('/') || '.';
const exists = (p) => fs.existsSync(p);
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function write(file, content, { overwrite = force } = {}) {
  if (exists(file) && !overwrite) { say(`  · kept ${R(file)}`); return false; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  say(`  ✔ ${R(file)}`);
  return true;
}
function copyDir(src, dest, opts = {}) {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d, opts);
    else write(d, fs.readFileSync(s), opts);
  }
}
const relImport = (fromFile, toFile) => {
  let r = path.relative(path.dirname(fromFile), toFile).split(path.sep).join('/').replace(/\.(tsx?|jsx?)$/, '');
  return r.startsWith('.') ? r : './' + r;
};

// ---- detect ---------------------------------------------------------------
const pkgPath = path.join(root, 'package.json');
if (!exists(pkgPath)) { console.error('✖ No package.json here. Run inside a React/Next.js project (or pass --root).'); process.exit(1); }
const pkg = readJson(pkgPath);
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const twVersion = deps.tailwindcss ? parseInt(String(deps.tailwindcss).replace(/[^\d]/g, '').slice(0, 1) || '0', 10) : 0;
const style = opt('style', deps.tailwindcss ? 'tailwind' : 'css-modules');
if (style === 'tailwind' && twVersion && twVersion < 4) say('⚠ Tailwind < v4 detected. ui-foundry targets Tailwind v4 (@theme). Upgrade: npx @tailwindcss/upgrade');
for (const nc of ['next.config.ts', 'next.config.mjs', 'next.config.js']) {
  const p = path.join(root, nc);
  if (exists(p) && /["']\*\.css["']\s*:\s*\{[^}]*@tailwindcss\/turbopack/s.test(fs.readFileSync(p, 'utf8')) && style === 'css-modules') {
    say(`⚠ ${nc} routes every *.css file through @tailwindcss/turbopack as global CSS — CSS Modules (*.module.css) lose their scoping. Use --style tailwind, or narrow that rule.`);
  }
}
const useSrc = exists(path.join(root, 'src'));
const appDir = ['src/app', 'app'].map((d) => path.join(root, d)).find(exists);
const compDirRel = opt('components-dir', useSrc ? 'src/components/ui' : 'components/ui');
const compDir = path.join(root, compDirRel);
const libDir = path.join(root, useSrc ? 'src/lib' : 'lib');
let alias = null;
for (const tsc of ['tsconfig.json', 'jsconfig.json']) {
  const p = path.join(root, tsc);
  if (!exists(p)) continue;
  try {
    const txt = fs.readFileSync(p, 'utf8').replace(/\/\/.*$/gm, '').replace(/,\s*([}\]])/g, '$1');
    const paths = JSON.parse(txt).compilerOptions?.paths || {};
    if (paths['@/*']) alias = paths['@/*'][0].replace(/\*$/, '').replace(/^\.\//, '');
  } catch {}
}
say(`ui-foundry init → ${root}`);
say(`  next: ${deps.next ? 'yes' : 'no'} · tailwind: ${deps.tailwindcss || 'no'} · components: ${style} · app dir: ${appDir ? R(appDir) : 'none'} · alias @/*: ${alias === null ? 'none' : alias || './'}`);

// ---- design workspace ---------------------------------------------------------
say('\nDesign workspace');
const designDir = path.join(root, 'design');
for (const f of ['tokens.json', 'DESIGN.md', 'components.md']) write(path.join(designDir, f), fs.readFileSync(T('design', f)));
for (const f of fs.readdirSync(path.join(pluginRoot, 'playbooks'))) write(path.join(designDir, 'playbooks', f), fs.readFileSync(path.join(pluginRoot, 'playbooks', f)), { overwrite: true });
write(path.join(designDir, 'inspiration', 'README.md'), fs.readFileSync(T('design', 'inspiration', 'README.md')));
const cfg = readJson(T('design', 'design.config.json'));
cfg.styling = style === 'tailwind' ? 'both' : 'css';
cfg.componentStyle = style;
cfg.componentsDir = compDirRel;
cfg.lint.include = ['app', 'src', 'components', 'pages', 'lib'].filter((d) => exists(path.join(root, d)));
if (appDir) cfg.lint.allow = [`${R(appDir)}/design-system/**`];
write(path.join(designDir, 'design.config.json'), JSON.stringify(cfg, null, 2) + '\n');
// tools are always refreshed (they are versioned with the plugin)
const toolsDest = path.join(designDir, 'tools');
for (const f of fs.readdirSync(here, { recursive: true })) {
  const s = path.join(here, f);
  if (fs.statSync(s).isDirectory()) continue;
  if (/^(init|hook-post-edit)\.mjs$/.test(path.basename(f))) continue;
  const d = path.join(toolsDest, f);
  fs.mkdirSync(path.dirname(d), { recursive: true });
  fs.copyFileSync(s, d);
}
say(`  ✔ ${R(toolsDest)}/ (refreshed)`);

// ---- components -----------------------------------------------------------
const aliasImport = (target) => (alias !== null ? `@/${path.relative(path.join(root, alias), target).split(path.sep).join('/')}` : null);
if (!flag('no-components')) {
  say('\nComponent library');
  const src = T('components', style === 'tailwind' ? 'tailwind' : 'css');
  const cnTarget = path.join(libDir, 'cn');
  for (const f of fs.readdirSync(src)) {
    if (f === 'USAGE.md') continue;
    if (f === 'cn.ts') { write(path.join(libDir, 'cn.ts'), fs.readFileSync(path.join(src, f))); continue; }
    let content = fs.readFileSync(path.join(src, f), 'utf8');
    const dest = path.join(compDir, f);
    content = content.replace(/'@\/lib\/cn'/g, `'${aliasImport(cnTarget) ?? relImport(dest, cnTarget)}'`);
    write(dest, content);
  }
  const compMd = path.join(designDir, 'components.md');
  const usage = fs.readFileSync(path.join(src, 'USAGE.md'), 'utf8');
  const md = fs.readFileSync(compMd, 'utf8');
  if (!/^## Button/m.test(md.replace(/<!--[\s\S]*?-->/g, ''))) { fs.writeFileSync(compMd, `${md.trimEnd()}\n\n${usage}`); say(`  ✔ ${R(compMd)} (usage sections)`); }
}

// ---- specimen route -------------------------------------------------------------
if (appDir && !flag('no-specimen')) {
  say('\nSpecimen route');
  const dest = path.join(appDir, 'design-system');
  const pageFile = path.join(dest, 'page.tsx');
  const tokensTs = path.join(designDir, 'generated', 'tokens');
  const specimensTs = path.join(compDir, 'specimens');
  let page = fs.readFileSync(T('specimen', 'page.tsx'), 'utf8')
    .replace('__TOKENS_IMPORT__', relImport(pageFile, tokensTs))
    .replace('__SPECIMENS_IMPORT__', aliasImport(specimensTs) ?? relImport(pageFile, specimensTs));
  write(pageFile, page);
  write(path.join(dest, 'theme-toggle.tsx'), fs.readFileSync(T('specimen', 'theme-toggle.tsx')));
  write(path.join(dest, 'design-system.css'), fs.readFileSync(T('specimen', 'design-system.css')));
}

function commentDemoBlocks(css) {
  let out = '', i = 0;
  while (i < css.length) {
    if (css.startsWith('/*', i)) { const j = css.indexOf('*/', i + 2); const k = j === -1 ? css.length : j + 2; out += css.slice(i, k); i = k; continue; }
    const brace = css.indexOf('{', i), semi = css.indexOf(';', i);
    if (brace === -1 || (semi !== -1 && semi < brace)) { const k = semi === -1 ? css.length : semi + 1; out += css.slice(i, k); i = k; continue; }
    let depth = 0, k = brace;
    for (; k < css.length; k++) { if (css[k] === '{') depth++; else if (css[k] === '}' && --depth === 0) break; }
    const block = css.slice(i, k + 1), prelude = css.slice(i, brace).trim();
    const demo = /^@theme\s+inline$/.test(prelude)
      || (/^:root$/.test(prelude) && /--(background|foreground)\s*:/.test(block))
      || (/^@media\s*\(prefers-color-scheme:\s*dark\)$/.test(prelude) && /--(background|foreground)\s*:/.test(block))
      || (/^body$/.test(prelude) && /var\(--(background|foreground)\)/.test(block));
    const lead = block.match(/^\s*/)[0];
    out += demo ? `${lead}/* ui-foundry: replaced by design tokens\n${block.trim().replace(/\*\//g, '* /')}\n*/` : block;
    i = k + 1;
  }
  return out;
}

// ---- global css -----------------------------------------------------------------
say('\nGlobal stylesheet');
const globals = [appDir && path.join(appDir, 'globals.css'), path.join(root, 'src/styles/globals.css'), path.join(root, 'styles/globals.css')].filter(Boolean).find(exists);
const genFile = path.join(designDir, 'generated', style === 'tailwind' ? 'tailwind.css' : 'tokens.css');
const BASE_MARK = '/* ui-foundry:base */';
const base = `
${BASE_MARK}
*, ::before, ::after { border-color: var(--color-border); }
html { font-family: var(--font-sans); }
body {
  position: relative; /* Base UI: lets iOS Safari backdrops cover the page */
  background: var(--color-background);
  color: var(--color-foreground);
  -webkit-font-smoothing: antialiased;
}
::selection { background: color-mix(in oklch, var(--color-primary) 25%, transparent); }
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
`;
if (globals) {
  let css = fs.readFileSync(globals, 'utf8');
  const imp = `@import "${path.relative(path.dirname(globals), genFile).split(path.sep).join('/')}";`;
  if (!css.includes('design/generated/')) {
    if (style === 'tailwind' && /@import\s+["']tailwindcss["'];?/.test(css)) css = css.replace(/(@import\s+["']tailwindcss["'];?)/, `$1\n${imp}`);
    else css = `${imp}\n${css}`;
    // create-next-app ships demo variables / @theme inline / body styles that would shadow the tokens:
    // comment out those top-level blocks (brace-aware, never nests comments).
    css = commentDemoBlocks(css);
  }
  if (!css.includes(BASE_MARK)) css += base;
  fs.writeFileSync(globals, css);
  say(`  ✔ ${R(globals)} (imports ${R(genFile)} + base layer)`);
} else say(`  ⚠ No globals.css found — import ${R(genFile)} in your root stylesheet and add the base layer from the README.`);

// ---- package.json scripts ---------------------------------------------------------
say('\npackage.json scripts');
pkg.scripts ??= {};
const scripts = {
  'design:build': 'node design/tools/tokens-build.mjs',
  'design:lint': 'node design/tools/design-lint.mjs',
  'design:contrast': 'node design/tools/contrast-check.mjs',
  'design:inventory': 'node design/tools/inventory.mjs',
  'design:inspect': 'node design/tools/inspect.mjs',
  'design:ramp': 'node design/tools/ramp.mjs',
  'design:verify': 'node design/tools/verify.mjs',
  'design:check': 'node design/tools/tokens-build.mjs --check && node design/tools/inventory.mjs --check && node design/tools/design-lint.mjs',
};
for (const [k, v] of Object.entries(scripts)) if (!pkg.scripts[k] || force) pkg.scripts[k] = v;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
say(`  ✔ ${Object.keys(scripts).join(', ')}`);

// ---- agent instructions ------------------------------------------------------------
say('\nAgent instructions');
const agentsMd = path.join(root, 'AGENTS.md');
const snippet = fs.readFileSync(T('agents', 'AGENTS.section.md'), 'utf8').replaceAll('{{componentsDir}}', compDirRel).replaceAll('{{style}}', style);
const START = '<!-- ui-foundry:agents -->', END = '<!-- /ui-foundry:agents -->';
let agents = exists(agentsMd) ? fs.readFileSync(agentsMd, 'utf8') : '# AGENTS.md\n';
agents = agents.includes(START) ? agents.replace(new RegExp(`${START}[\\s\\S]*?${END}`), `${START}\n${snippet.trim()}\n${END}`) : `${agents.trimEnd()}\n\n${START}\n${snippet.trim()}\n${END}\n`;
fs.writeFileSync(agentsMd, agents);
say(`  ✔ ${R(agentsMd)} (ui-foundry section)`);
const claudeMd = path.join(root, 'CLAUDE.md');
const claude = exists(claudeMd) ? fs.readFileSync(claudeMd, 'utf8') : '';
if (!/@AGENTS\.md/.test(claude)) { fs.writeFileSync(claudeMd, `${claude.trimEnd()}${claude ? '\n\n' : ''}@AGENTS.md\n`); say(`  ✔ ${R(claudeMd)} (imports AGENTS.md)`); }

if (flag('cursor')) {
  say('\nCursor');
  write(path.join(root, '.cursor', 'rules', 'ui-foundry.mdc'), fs.readFileSync(T('cursor', 'ui-foundry.mdc'), 'utf8').replaceAll('{{componentsDir}}', compDirRel), { overwrite: true });
  const skillsSrc = path.join(pluginRoot, 'skills');
  for (const s of fs.readdirSync(skillsSrc)) copyDir(path.join(skillsSrc, s), path.join(root, '.cursor', 'skills', s), { overwrite: true });
}

if (flag('ci')) {
  say('\nCI');
  write(path.join(root, '.github', 'workflows', 'design-system.yml'), fs.readFileSync(T('ci', 'design-system.yml')));
  write(path.join(root, '.githooks', 'pre-commit'), fs.readFileSync(T('ci', 'pre-commit')));
  try { fs.chmodSync(path.join(root, '.githooks', 'pre-commit'), 0o755); } catch {}
  try { execSync('git config core.hooksPath .githooks', { cwd: root, stdio: 'ignore' }); say('  ✔ git core.hooksPath = .githooks'); } catch { say('  · run: git config core.hooksPath .githooks'); }
}

// ---- gitignore ----------------------------------------------------------------------
const gi = path.join(root, '.gitignore');
const giTxt = exists(gi) ? fs.readFileSync(gi, 'utf8') : '';
if (!giTxt.includes('design/.verify')) fs.writeFileSync(gi, `${giTxt.trimEnd()}\n\n# ui-foundry verification screenshots\ndesign/.verify/\n`);

// ---- dependencies + first build --------------------------------------------------------
const need = ['@base-ui/react'].concat(style === 'tailwind' ? ['class-variance-authority', 'clsx', 'tailwind-merge'] : []).filter((d) => !deps[d]);
const needDev = ['playwright'].filter((d) => !deps[d]);
const pm = exists(path.join(root, 'pnpm-lock.yaml')) ? 'pnpm add' : exists(path.join(root, 'yarn.lock')) ? 'yarn add' : exists(path.join(root, 'bun.lockb')) || exists(path.join(root, 'bun.lock')) ? 'bun add' : 'npm i';
const cmds = [need.length && `${pm} ${need.join(' ')}`, needDev.length && `${pm} -D ${needDev.join(' ')} && npx playwright install chromium`].filter(Boolean);
if (flag('install') && cmds.length) {
  for (const cmd of cmds) {
    say(`\n$ ${cmd}`);
    try { execSync(cmd, { cwd: root, stdio: 'inherit' }); } catch { say(`  ⚠ "${cmd}" failed — run it yourself. (verify/inspect fall back to a system Chrome if Playwright's browser is missing.)`); }
  }
}
say('\nFirst build');
try { execSync('node design/tools/tokens-build.mjs', { cwd: root, stdio: 'inherit' }); execSync('node design/tools/inventory.mjs', { cwd: root, stdio: 'inherit' }); } catch { say('  ⚠ build failed — see above'); }

say(`
Done. Next steps:
${!flag('install') && cmds.length ? cmds.map((c) => `  1. ${c}`).join('\n') + '\n' : ''}  • Develop the theme:  theme-from-inspiration skill (links / images → tokens + DESIGN.md)
  • See it:             npm run dev → ${appDir ? '/design-system' : '(add a specimen route)'}
  • Keep it honest:     npm run design:check   (CI: --ci flag adds a workflow + pre-commit hook)`);
