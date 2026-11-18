#!/usr/bin/env node
// ui-foundry design linter. Keeps tokens, generated CSS, DESIGN.md, components.md and UI code in sync.
//
//   node design/tools/design-lint.mjs                      all scopes
//   --scope tokens|docs|code|contrast   (repeatable / comma-separated)
//   --files a.tsx b.css                 lint only these files (code scope)
//   --changed                           lint files changed vs git HEAD (code scope)
//   --json                              machine-readable output
//   --strict                            warnings fail the run
//
// Suppress: add `ui-foundry-ignore` in a comment on the offending line (or the line above),
// or `ui-foundry-ignore-file` anywhere in a file.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  parseArgs, findRoot, loadConfig, loadTokens, buildModel, REQUIRED_SEMANTIC_COLORS, REQUIRED_SEMANTIC_GROUPS,
  readBlock, getFrontmatterField, rel, c,
} from './lib/tokens.mjs';
import { parseColor, deltaE } from './lib/color.mjs';
import { checkContrast } from './lib/contrast.mjs';
import { scanComponents, inventoryTable } from './lib/inventory.mjs';
import { generate } from './tokens-build.mjs';

const args = parseArgs();
const root = path.resolve(args.root || findRoot());
const cfg = loadConfig(root);
const scopes = new Set(
  (Array.isArray(args.scope) ? args.scope : String(args.scope || 'tokens,docs,code,contrast').split(','))
    .flatMap((s) => String(s).split(',')).map((s) => s.trim()).filter(Boolean),
);
const strict = Boolean(args.strict || cfg.lint.strict);
const findings = [];
const add = (severity, rule, file, line, message, hint) => findings.push({ severity, rule, file, line, message, hint });

// ---------------------------------------------------------------------------
// tokens
let model = null, tokensJson = null;
try {
  const t = loadTokens(root, cfg);
  tokensJson = t.json;
  model = buildModel(t.json);
} catch (e) {
  add('error', 'tokens/load', `${cfg.designDir}/tokens.json`, 0, e.message);
}
const tokensFile = `${cfg.designDir}/tokens.json`;
const colorVars = model ? model.vars.filter((v) => v.tier === 'semantic' && v.group === 'color') : [];

if (scopes.has('tokens') && model) {
  model.errors.forEach((e) => add('error', 'tokens/ref', tokensFile, 0, e));
  model.warnings.forEach((w) => add('warn', 'tokens/raw-semantic', tokensFile, 0, w, 'Add a primitive and reference it, so palettes stay coherent.'));
  const names = new Set(colorVars.map((v) => v.name));
  REQUIRED_SEMANTIC_COLORS.filter((n) => !names.has(n)).forEach((n) =>
    add('error', 'tokens/required-color', tokensFile, 0, `Missing semantic color "${n}"`, 'Components rely on the full role set (shadcn-compatible names).'));
  const groups = new Set(model.vars.filter((v) => v.tier === 'semantic').map((v) => v.group));
  REQUIRED_SEMANTIC_GROUPS.filter((g) => !groups.has(g)).forEach((g) =>
    add('warn', 'tokens/required-group', tokensFile, 0, `No semantic.${g} tokens defined`));
  for (const v of colorVars) {
    if (!v.dark) add('warn', 'tokens/dark-missing', tokensFile, 0, `semantic.color.${v.name} has no dark value`, 'Add $extensions.mode.dark (or reference a primitive with one).');
    for (const [mode, val] of [['light', v.light], ['dark', v.dark]]) {
      if (val && !String(val).startsWith('var(') && !parseColor(val)) add('error', 'tokens/invalid-color', tokensFile, 0, `semantic.color.${v.name} (${mode}) is not a valid color: ${val}`);
    }
  }
  if (!model.errors.length) {
    try {
      const g = generate(root, cfg);
      const stale = Object.entries(g.files).filter(([f, content]) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== content).map(([f]) => rel(root, f));
      stale.forEach((f) => add('error', 'tokens/stale-generated', f, 0, 'Out of date with tokens.json', 'Run: npm run design:build'));
      g.missingBlocks?.forEach((b) => add('warn', 'docs/missing-block', `${cfg.designDir}/DESIGN.md`, 0, `No generated "${b}" block`, `Add <!-- ui-foundry:generated:${b} --><!-- /ui-foundry:generated:${b} -->`));
    } catch (e) { add('error', 'tokens/build', tokensFile, 0, e.message); }
  }
}

// ---------------------------------------------------------------------------
// contrast
if (scopes.has('contrast') && model && !model.errors.length) {
  for (const r of checkContrast(model.vars, cfg.contrast.pairs)) {
    if (r.ok) continue;
    const msg = r.missing ? `contrast pair ${r.fg}/${r.bg}: token missing`
      : r.unparsable ? `contrast pair ${r.fg}/${r.bg}: cannot parse colors`
        : `${r.fg} on ${r.bg} (${r.mode}) = ${r.ratio.toFixed(2)}:1, needs ${r.min}:1`;
    add(r.level === 'warn' || r.missing ? 'warn' : 'error', 'contrast', tokensFile, 0, msg, 'Adjust lightness of the semantic mapping, not the primitive ramp, where possible.');
  }
}

// ---------------------------------------------------------------------------
// docs
const designMdPath = path.join(root, cfg.designDir, 'DESIGN.md');
const componentsMdPath = path.join(root, cfg.designDir, 'components.md');
const REQUIRED_SECTIONS = ['Brand', 'Color', 'Typography', 'Layout', 'Shape', 'Motion', 'Components', 'Voice', 'Do', 'Accessibility'];

if (scopes.has('docs')) {
  const designRel = rel(root, designMdPath);
  if (!fs.existsSync(designMdPath)) add('error', 'docs/missing', designRel, 0, 'DESIGN.md not found');
  else {
    const md = fs.readFileSync(designMdPath, 'utf8');
    const lines = md.split('\n');
    const headings = lines.filter((l) => /^##\s/.test(l)).map((l) => l.replace(/^##\s+(\d+\.\s*)?/, '').toLowerCase());
    REQUIRED_SECTIONS.filter((s) => !headings.some((h) => h.startsWith(s.toLowerCase()))).forEach((s) =>
      add('error', 'docs/section', designRel, 0, `Missing "## ${s}…" section`));
    const ph = lines.map((l, i) => (/\bTODO\b|\{\{[^}]*\}\}|<!--\s*fill/i.test(l) ? i + 1 : 0)).filter(Boolean);
    if (ph.length > 3) add('warn', 'docs/placeholder', designRel, ph[0], `${ph.length} unfilled placeholders (lines ${ph.slice(0, 12).join(', ')}${ph.length > 12 ? '…' : ''})`, 'Run the theme-from-inspiration skill to write the brief.');
    else ph.forEach((n) => add('warn', 'docs/placeholder', designRel, n, `Unfilled placeholder: ${lines[n - 1].trim().slice(0, 80)}`));
    if (model && !model.errors.length) {
      const fmHash = getFrontmatterField(md, 'tokens_hash');
      const { hash } = loadTokens(root, cfg);
      if (fmHash !== hash) add('error', 'docs/hash', designRel, 1, `tokens_hash ${fmHash || '(none)'} ≠ tokens.json ${hash}`, 'Run: npm run design:build');
      // Stray colors in hand-written prose must match a token (light or dark) or a primitive.
      const known = [];
      for (const v of colorVars) { known.push(v.light); if (v.dark) known.push(v.dark); }
      for (const l of model.leaves.filter((x) => x.path.startsWith('primitive.color'))) known.push(l.$value);
      const knownParsed = known.map(parseColor).filter(Boolean);
      let inGenerated = false;
      lines.forEach((l, i) => {
        if (/<!-- ui-foundry:generated:/.test(l)) inGenerated = true;
        if (/<!-- \/ui-foundry:generated:/.test(l)) { inGenerated = false; return; }
        if (inGenerated) return;
        for (const m of l.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|\b(?:oklch|rgb|rgba|hsl|hsla)\([^)]*\)/g)) {
          const p = parseColor(m[0]);
          if (p && !knownParsed.some((k) => deltaE(p, k) < 0.02)) add('warn', 'docs/stray-color', designRel, i + 1, `${m[0]} is not a current token value`, 'Prose references a color that no longer exists — update the text or the tokens.');
        }
      });
    }
  }

  const compRel = rel(root, componentsMdPath);
  if (!fs.existsSync(componentsMdPath)) add('error', 'docs/missing', compRel, 0, 'components.md not found');
  else {
    const md = fs.readFileSync(componentsMdPath, 'utf8');
    const items = scanComponents(root, cfg);
    const current = readBlock(md, 'inventory');
    if (current === null) add('error', 'docs/inventory-block', compRel, 0, 'No <!-- ui-foundry:generated:inventory --> block');
    else if (current.trim() !== inventoryTable(items).trim()) add('error', 'docs/inventory-stale', compRel, 0, 'Inventory table does not match components on disk', 'Run: npm run design:inventory');
    const documented = new Set([...md.replace(/<!--[\s\S]*?-->/g, '').matchAll(/^##\s+([A-Z][\w]*)/gm)].map((m) => m[1]));
    const specimenFile = ['specimens.tsx', 'specimens.jsx'].map((f) => path.join(root, cfg.componentsDir, f)).find((f) => fs.existsSync(f));
    const specimenSrc = specimenFile ? fs.readFileSync(specimenFile, 'utf8') : '';
    for (const it of items) {
      if (!documented.has(it.name)) add('warn', 'docs/component-undocumented', compRel, 0, `${it.name} has no "## ${it.name}" usage section`);
      if (specimenFile && !new RegExp(`\\b${it.name}\\b`).test(specimenSrc)) add('warn', 'docs/specimen-missing', rel(root, specimenFile), 0, `${it.name} is not shown on the specimen page`, 'Add an example so ui-verify can screenshot it.');
    }
  }
}

// ---------------------------------------------------------------------------
// code
const globToRe = (g) => {
  let s = g.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  s = s.replace(/\*\*\//g, '\u0000').replace(/\*\*/g, '\u0001').replace(/\*/g, '[^/]*');
  s = s.replace(/\u0000/g, '(?:.*/)?').replace(/\u0001/g, '.*');
  return new RegExp(`^${s}$`);
};
const allowRes = (cfg.lint.allow || []).map(globToRe);
const excluded = (r) => (cfg.lint.exclude || []).some((e) => r === e || r.startsWith(e + '/') || r.split('/').includes(e));
const CODE_EXT = /\.(tsx|jsx|ts|js|mdx|css|scss)$/;

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const r = rel(root, p);
    if (excluded(r)) continue;
    if (e.isDirectory()) out.push(...walk(p));
    else if (CODE_EXT.test(e.name)) out.push(p);
  }
  return out;
}

let files = [];
if (args.files) files = (Array.isArray(args.files) ? args.files : [args.files]).map((f) => path.resolve(root, f));
else if (args.changed) {
  try {
    const out = execSync('git diff --name-only HEAD && git ls-files --others --exclude-standard', { cwd: root, encoding: 'utf8' });
    files = out.split('\n').filter(Boolean).map((f) => path.join(root, f));
  } catch { files = []; }
} else files = (cfg.lint.include || []).flatMap((d) => walk(path.join(root, d)));
files = [...new Set(files)].filter((f) => fs.existsSync(f) && CODE_EXT.test(f) && !excluded(rel(root, f)));

const TW_PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const COLOR_UTIL = 'bg|text|border|border-[trblxy]|ring|ring-offset|outline|fill|stroke|from|via|to|divide|placeholder|caret|accent|decoration|shadow';
const RE = {
  twPalette: new RegExp(`(?<![\\w-])(?:[\\w-]+:)*(${COLOR_UTIL})-(${TW_PALETTE})-(50|[1-9]00|950)(?:\\/\\d+)?(?![\\w-])`, 'g'),
  twBW: new RegExp(`(?<![\\w-])(?:[\\w-]+:)*(${COLOR_UTIL})-(white|black)(?:\\/\\d+)?(?![\\w-])`, 'g'),
  arbitrary: /(?<![\w-])(?:[\w-]+:)*(-?[a-z][\w-]*?)-\[([^\]\s]+)\]/g,
  hex: /(?<![\w&/#\[-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g,
  colorFn: /(?<![\w-])(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g,
  darkColor: new RegExp(`(?<![\\w-])dark:(?:[\\w-]+:)*(?:${COLOR_UTIL})-[\\w-]+`, 'g'),
  baseUiImport: /from\s+['"]@base-ui\/react(?:\/[\w-]+)?['"]|from\s+['"]react-aria-components['"]/,
  rawElement: /<(button|select|textarea|dialog)\b|<input\b(?![^>]*type=["'](?:hidden)["'])/g,
  inlineStyle: /style=\{\{([^}]*)\}\}/g,
  fontArbitrary: /(?<![\w-])font-\[/g,
};
const SPACING_PROPS = /^(-?(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y))$/;
const TYPE_PROPS = /^(text|leading|tracking|font)$/;
const SHAPE_PROPS = /^(rounded(?:-[a-z]+)?|shadow|ring|border(?:-[trblxy])?|outline)$/;
const ROLE_HINT = (u) => (u === 'text' ? 'text-foreground, text-muted-foreground, text-primary, text-destructive'
  : u.startsWith('border') || u === 'divide' ? `${u}-border, ${u}-input`
    : u.startsWith('ring') || u === 'outline' ? `${u}-ring`
      : `${u}-background, ${u}-card, ${u}-muted, ${u}-primary, ${u}-accent`);
const looksLikeColor = (v) => /^#|^(rgb|hsl|oklch|oklab|color)\(|^(white|black)$/i.test(v);
const compDir = cfg.componentsDir.replace(/\/$/, '');

function lintFile(abs) {
  const r = rel(root, abs);
  const src = fs.readFileSync(abs, 'utf8');
  if (/ui-foundry-ignore-file/.test(src)) return;
  if (allowRes.some((re) => re.test(r))) return;
  const isCss = /\.(css|scss)$/.test(abs);
  const inComponents = r.startsWith(compDir + '/');
  const usesTw = cfg.componentStyle === 'tailwind' || cfg.styling === 'tailwind';
  const lines = src.split('\n');
  let inBlockComment = false;
  lines.forEach((line, idx) => {
    const n = idx + 1;
    if (/ui-foundry-ignore/.test(line) || /ui-foundry-ignore/.test(lines[idx - 1] || '')) return;
    // strip comments (rough) so commented examples don't trip rules
    let code = line;
    if (inBlockComment) { const end = code.indexOf('*/'); if (end === -1) return; code = code.slice(end + 2); inBlockComment = false; }
    code = code.replace(/\/\*.*?\*\//g, '');
    const open = code.indexOf('/*');
    if (open !== -1) { code = code.slice(0, open); inBlockComment = true; }
    if (!isCss) code = code.replace(/(^|[^:])\/\/.*$/, '$1');
    if (!code.trim()) return;

    // raw colors
    for (const m of code.matchAll(RE.hex)) {
      if (/href=|url\(|#[a-z]+-/.test(code.slice(Math.max(0, m.index - 6), m.index + m[0].length + 1))) continue;
      add('error', 'code/raw-color', r, n, `Raw color ${m[0]}`, 'Use a semantic token (bg-primary / var(--color-primary)). If the color is new, add it to tokens.json first.');
    }
    for (const m of code.matchAll(RE.colorFn)) {
      if (isCss && /^\s*--/.test(code)) continue; // custom property definitions are allowed in CSS (rare; prefer tokens)
      add('error', 'code/raw-color', r, n, `Raw color function ${m[0]}…)`, 'Use a semantic token instead.');
    }
    if (!isCss && usesTw) {
      for (const m of code.matchAll(RE.twPalette)) add('error', 'code/tw-palette', r, n, `Default Tailwind palette class "${m[0]}"`, `Use a semantic role, e.g. ${ROLE_HINT(m[1])}.`);
      for (const m of code.matchAll(RE.twBW)) add('error', 'code/tw-palette', r, n, `"${m[0]}" bypasses the theme`, `Use ${m[1]}-background / ${m[1]}-foreground (they flip in dark mode).`);
      for (const m of code.matchAll(RE.arbitrary)) {
        const prop = m[1].replace(/^-/, ''), val = m[2];
        if (/^(var\(|--)/.test(val)) continue;
        if (looksLikeColor(val)) add('error', 'code/arbitrary-color', r, n, `Arbitrary color ${m[0]}`, 'Use a semantic color utility.');
        else if (SPACING_PROPS.test(prop)) add('error', 'code/arbitrary-spacing', r, n, `Arbitrary spacing ${m[0]}`, 'Use the spacing scale (p-4, gap-6…). Add a step to semantic.spacing scale if truly needed.');
        else if (TYPE_PROPS.test(prop)) add('error', 'code/arbitrary-type', r, n, `Arbitrary type value ${m[0]}`, 'Use text-* / leading-* / font-* tokens.');
        else if (SHAPE_PROPS.test(prop)) add('error', 'code/arbitrary-shape', r, n, `Arbitrary shape value ${m[0]}`, 'Use rounded-* / shadow-* tokens.');
        else if (prop === 'z') add('warn', 'code/arbitrary-z', r, n, `Arbitrary z-index ${m[0]}`, 'Prefer a layering token or the Base UI portal root (isolation: isolate).');
      }
      for (const m of code.matchAll(RE.darkColor)) add('warn', 'code/dark-variant', r, n, `"${m[0]}" — semantic tokens already switch with the theme`, 'Remove the dark: override; fix the token mapping instead.');
    }
    for (const m of code.matchAll(RE.fontArbitrary)) add('error', 'code/font-family', r, n, 'Arbitrary font-family', 'Use font-sans / font-display / font-mono tokens.');
    if (isCss) {
      for (const decl of code.matchAll(/(?:^|[;{\s])(font-family|font-size|padding[\w-]*|margin[\w-]*|gap|row-gap|column-gap|border-radius|box-shadow)\s*:\s*([^;}]+)/g)) {
        if (/var\(|inherit|initial|unset|^\s*0\s*$|^\s*auto\s*$|^\s*none\s*$/.test(decl[2])) continue;
        add('warn', 'css/literal-value', r, n, `${decl[1]}: ${decl[2].trim()} — literal value`, 'Use var(--space-N) / var(--text-*) / var(--radius-*) / var(--font-*).');
      }
    } else {
      if (!inComponents && RE.baseUiImport.test(code)) add('warn', 'code/primitive-outside-library', r, n, 'Headless primitive imported outside the component library', `Wrap it in ${compDir}/ and import the wrapper.`);
      if (!inComponents && /\.(tsx|jsx|mdx)$/.test(abs)) {
        for (const m of code.matchAll(RE.rawElement)) add('warn', 'code/raw-element', r, n, `Raw <${m[1] || 'input'}> in feature code`, `Use the ${compDir} component (Button, Input, Select, Dialog…).`);
      }
      for (const m of code.matchAll(RE.inlineStyle)) {
        if (/\b\d+(px|rem|em)\b|#[0-9a-f]{3,8}\b|rgba?\(|oklch\(|:\s*\d{2,}\b/i.test(m[1])) add('warn', 'code/inline-style', r, n, 'Inline style with literal values', 'Use classes / CSS modules with tokens. Dynamic values via CSS variables are fine.');
      }
    }
  });
}

if (scopes.has('code')) files.forEach(lintFile);

// ---------------------------------------------------------------------------
// report
const errors = findings.filter((f) => f.severity === 'error');
const warns = findings.filter((f) => f.severity === 'warn');
const failed = errors.length > 0 || (strict && warns.length > 0);

if (args.json) {
  console.log(JSON.stringify({ ok: !failed, errors: errors.length, warnings: warns.length, findings }, null, 2));
} else {
  const byFile = new Map();
  for (const f of findings) { if (!byFile.has(f.file)) byFile.set(f.file, []); byFile.get(f.file).push(f); }
  for (const [file, list] of byFile) {
    console.log(c.bold(`\n${file}`));
    for (const f of list) {
      const sev = f.severity === 'error' ? c.red('error') : c.yellow('warn ');
      console.log(`  ${String(f.line || '').padStart(4)}  ${sev}  ${c.dim(f.rule.padEnd(30))} ${f.message}`);
      if (f.hint) console.log(`        ${c.dim('↳ ' + f.hint)}`);
    }
  }
  const scanned = scopes.has('code') ? ` · ${files.length} code files` : '';
  console.log(`\n${failed ? c.red('✖') : c.green('✔')} design-lint [${[...scopes].join(',')}]${scanned}: ${errors.length} errors, ${warns.length} warnings${strict ? ' (strict)' : ''}`);
}
process.exit(failed ? 1 : 0);
