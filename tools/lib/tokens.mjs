// ui-foundry token model: config loading, DTCG-style token flattening, reference
// resolution, mode (light/dark) handling and CSS variable naming.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const DEFAULT_CONFIG = {
  styling: 'both', // which token outputs to generate: 'tailwind' | 'css' | 'both'
  componentStyle: 'tailwind', // how library components are styled: 'tailwind' | 'css-modules'
  designDir: 'design',
  generatedDir: 'design/generated',
  componentsDir: 'components/ui',
  specimenRoute: '/design-system',
  darkMode: 'class', // 'class' | 'media' | 'class+media'
  tailwind: { reset: ['color', 'radius', 'shadow', 'text'] },
  lint: {
    include: ['app', 'src', 'components', 'pages'],
    exclude: ['node_modules', '.next', 'dist', 'build', 'design/generated', 'design/tools'],
    allow: ['app/design-system/**'],
    strict: false,
  },
  contrast: {
    // [foreground, background, minimum ratio]
    pairs: [
      ['foreground', 'background', 4.5],
      ['muted-foreground', 'background', 4.5],
      ['muted-foreground', 'muted', 4.5],
      ['card-foreground', 'card', 4.5],
      ['popover-foreground', 'popover', 4.5],
      ['primary-foreground', 'primary', 4.5],
      ['secondary-foreground', 'secondary', 4.5],
      ['accent-foreground', 'accent', 4.5],
      ['destructive-foreground', 'destructive', 4.5],
      ['success-foreground', 'success', 4.5],
      ['warning-foreground', 'warning', 4.5],
      ['primary', 'background', 3],
      ['ring', 'background', 3],
      ['input', 'background', 3, 'warn'],
      ['border', 'background', 1.3, 'warn'],
    ],
  },
  verify: {
    baseUrl: 'http://localhost:3000',
    routes: ['/design-system'],
    viewports: [390, 768, 1440],
    themes: ['light', 'dark'],
    offPaletteTolerance: 0.03,
    maxOffPalette: 0,
  },
};

export const REQUIRED_SEMANTIC_COLORS = [
  'background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground',
  'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground',
  'accent', 'accent-foreground', 'destructive', 'destructive-foreground', 'border', 'input', 'ring',
];

export const REQUIRED_SEMANTIC_GROUPS = ['color', 'font', 'text', 'radius', 'shadow', 'spacing'];

function deepMerge(a, b) {
  if (Array.isArray(b) || typeof b !== 'object' || b === null) return b ?? a;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in (a || {}) ? deepMerge(a[k], v) : v;
  return out;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, inline] = a.slice(2).split('=');
      if (inline !== undefined) args[k] = inline;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        // collect multiple values until the next flag
        const vals = [];
        while (argv[i + 1] && !argv[i + 1].startsWith('--')) vals.push(argv[++i]);
        args[k] = vals.length === 1 ? vals[0] : vals;
      } else args[k] = true;
    } else args._.push(a);
  }
  return args;
}

export function findRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(dir, 'design', 'design.config.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

export function loadConfig(root) {
  const file = path.join(root, 'design', 'design.config.json');
  let user = {};
  if (fs.existsSync(file)) user = JSON.parse(fs.readFileSync(file, 'utf8'));
  return deepMerge(DEFAULT_CONFIG, user);
}

export function tokensPath(root, cfg) {
  return path.join(root, cfg.designDir, 'tokens.json');
}

export function loadTokens(root, cfg) {
  const file = tokensPath(root, cfg);
  if (!fs.existsSync(file)) throw new Error(`No tokens file at ${path.relative(root, file)}. Run the foundry-setup skill (init.mjs) first.`);
  const raw = fs.readFileSync(file, 'utf8');
  return { raw, json: JSON.parse(raw), hash: hashTokens(raw) };
}

export function hashTokens(raw) {
  return crypto.createHash('sha256').update(JSON.stringify(JSON.parse(raw))).digest('hex').slice(0, 12);
}

/** Flatten a DTCG tree into leaves: { path: 'semantic.color.primary', $value, $type, $extensions, $description } */
export function flatten(tree) {
  const leaves = [];
  const walk = (node, p, inheritedType) => {
    if (node === null || typeof node !== 'object') return;
    const type = node.$type || inheritedType;
    if ('$value' in node) {
      leaves.push({ path: p.join('.'), $value: node.$value, $type: type, $extensions: node.$extensions || {}, $description: node.$description });
      return;
    }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v, [...p, k], type);
  };
  walk(tree, [], undefined);
  return leaves;
}

const REF = /\{([^{}]+)\}/g;

export function makeResolver(leaves) {
  const index = new Map(leaves.map((l) => [l.path, l]));
  const errors = [];
  const resolve = (value, mode, stack = []) => {
    if (Array.isArray(value)) return value.map((v) => resolve(v, mode, stack));
    if (typeof value !== 'string') return value;
    const whole = value.match(/^\{([^{}]+)\}$/);
    const lookup = (ref) => {
      if (stack.includes(ref)) { errors.push(`Circular reference: ${[...stack, ref].join(' -> ')}`); return undefined; }
      const target = index.get(ref);
      if (!target) { errors.push(`Unresolved reference {${ref}}${stack.length ? ` (from ${stack[stack.length - 1]})` : ''}`); return undefined; }
      return resolve(pickMode(target, mode), mode, [...stack, ref]);
    };
    if (whole) return lookup(whole[1]);
    return value.replace(REF, (_, ref) => {
      const v = lookup(ref);
      return Array.isArray(v) ? v.join(', ') : String(v);
    });
  };
  return { index, resolve, errors };
}

export function pickMode(leaf, mode) {
  if (mode && mode !== 'light') {
    const m = leaf.$extensions?.mode?.[mode];
    if (m !== undefined) return m;
  }
  return leaf.$value;
}

const fontStack = (v) => (Array.isArray(v)
  ? v.map((f) => (/[\s]/.test(f) && !/^(var|ui-|system-ui)/.test(f) && !/^["']/.test(f) ? `"${f}"` : f)).join(', ')
  : v);

/** semantic.color.primary -> --color-primary ; component.button.height.md -> --button-height-md */
export function cssVarFor(p) {
  const parts = p.split('.');
  const tier = parts.shift();
  if (tier === 'primitive') return null; // primitives are never emitted
  if (tier === 'component') return `--${parts.join('-')}`;
  const [group, ...rest] = parts;
  const name = rest.join('-');
  switch (group) {
    case 'color': return `--color-${name}`;
    case 'font': return `--font-${name}`;
    case 'weight': return `--font-weight-${name}`;
    case 'text': return `--text-${name}`;
    case 'leading': return `--leading-${name}`;
    case 'tracking': return `--tracking-${name}`;
    case 'radius': return `--radius-${name}`;
    case 'shadow': return `--shadow-${name}`;
    case 'spacing': return name ? `--spacing-${name}` : '--spacing';
    case 'ease': return `--ease-${name}`;
    case 'duration': return `--duration-${name}`;
    case 'breakpoint': return `--breakpoint-${name}`;
    case 'container': return `--container-${name}`;
    case 'z': return `--z-${name}`;
    default: return `--${group}${name ? '-' + name : ''}`;
  }
}

// Tailwind v4 theme namespaces we place inside @theme
export const TAILWIND_NAMESPACES = ['color', 'font', 'weight', 'text', 'leading', 'tracking', 'radius', 'shadow', 'spacing', 'ease', 'breakpoint', 'container'];

/**
 * Build the emitted model.
 * Returns { vars: [{ path, group, name, cssVar, type, light, dark, extra: [{cssVar, light}] }], errors, warnings, leaves }
 */
export function buildModel(json) {
  const leaves = flatten(json);
  const { resolve, errors } = makeResolver(leaves);
  const warnings = [];
  const vars = [];
  for (const leaf of leaves) {
    const cssVar = cssVarFor(leaf.path);
    if (!cssVar) continue;
    const [tier, group, ...rest] = leaf.path.split('.');
    const name = rest.join('-');
    const fmt = (v) => (leaf.$type === 'fontFamily' || group === 'font' ? fontStack(v) : Array.isArray(v) ? v.join(', ') : v);
    const light = fmt(resolve(leaf.$value, 'light', [leaf.path]));
    const hasDark = leaf.$extensions?.mode?.dark !== undefined;
    const dark = hasDark ? fmt(resolve(leaf.$extensions.mode.dark, 'dark', [leaf.path])) : undefined;
    // A semantic token that references a primitive which itself has a dark mode, inherits it.
    const inheritedDark = !hasDark ? fmt(resolve(leaf.$value, 'dark', [leaf.path])) : undefined;
    const darkFinal = dark ?? (inheritedDark !== light ? inheritedDark : undefined);
    const extra = [];
    const ext = leaf.$extensions || {};
    if (group === 'text') {
      if (ext.lineHeight) extra.push({ cssVar: `${cssVar}--line-height`, light: String(ext.lineHeight) });
      if (ext.letterSpacing) extra.push({ cssVar: `${cssVar}--letter-spacing`, light: String(ext.letterSpacing) });
      if (ext.fontWeight) extra.push({ cssVar: `${cssVar}--font-weight`, light: String(ext.fontWeight) });
    }
    vars.push({ path: leaf.path, tier, group, name, cssVar, type: leaf.$type, light, dark: darkFinal, extra, ext, description: leaf.$description });
    if (tier === 'semantic' && group === 'color' && typeof leaf.$value === 'string' && !leaf.$value.startsWith('{')) {
      warnings.push(`${leaf.path} uses a raw value; semantic colors should reference primitives ({primitive.color...})`);
    }
  }
  return { vars, errors: [...new Set(errors)], warnings, leaves };
}

export function spacingScale(json) {
  return json?.semantic?.spacing?.$extensions?.scale || [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32];
}

export function rel(root, p) { return path.relative(root, p).split(path.sep).join('/'); }

export function writeIfChanged(file, content) {
  const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (prev === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
}

/** Replace content between <!-- ui-foundry:generated:NAME --> and <!-- /ui-foundry:generated:NAME --> */
export function replaceBlock(text, name, body) {
  const start = `<!-- ui-foundry:generated:${name} -->`;
  const end = `<!-- /ui-foundry:generated:${name} -->`;
  const i = text.indexOf(start), j = text.indexOf(end);
  if (i === -1 || j === -1 || j < i) return { text, found: false };
  return { text: text.slice(0, i + start.length) + '\n' + body.trim() + '\n' + text.slice(j), found: true };
}

export function readBlock(text, name) {
  const start = `<!-- ui-foundry:generated:${name} -->`;
  const end = `<!-- /ui-foundry:generated:${name} -->`;
  const i = text.indexOf(start), j = text.indexOf(end);
  if (i === -1 || j === -1) return null;
  return text.slice(i + start.length, j).trim();
}

export function setFrontmatterField(text, key, value) {
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return text;
  let fm = text.slice(0, end);
  const re = new RegExp(`^${key}:.*$`, 'm');
  fm = re.test(fm) ? fm.replace(re, `${key}: ${value}`) : `${fm}\n${key}: ${value}`;
  return fm + text.slice(end);
}

export function getFrontmatterField(text, key) {
  if (!text.startsWith('---')) return undefined;
  const end = text.indexOf('\n---', 3);
  const m = text.slice(0, end).match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return m ? m[1].trim() : undefined;
}

export const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};
