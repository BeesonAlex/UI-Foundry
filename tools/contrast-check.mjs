#!/usr/bin/env node
// ui-foundry: WCAG contrast report for semantic color pairs in light + dark modes.
//   node design/tools/contrast-check.mjs [--json] [--pair fg bg] [--root dir]
import path from 'node:path';
import { parseArgs, findRoot, loadConfig, loadTokens, buildModel, c } from './lib/tokens.mjs';
import { checkContrast } from './lib/contrast.mjs';
import { contrastRatio } from './lib/color.mjs';

const args = parseArgs();
const root = path.resolve(args.root || findRoot());
const cfg = loadConfig(root);

if (args.pair && Array.isArray(args.pair)) {
  // ad-hoc check of two raw colors: --pair "#fff" "oklch(0.5 0.1 250)"
  const r = contrastRatio(args.pair[0], args.pair[1]);
  console.log(r ? r.toFixed(2) : 'unparsable');
  process.exit(0);
}

const { json } = loadTokens(root, cfg);
const model = buildModel(json);
if (model.errors.length) { model.errors.forEach((e) => console.error(c.red(`✖ ${e}`))); process.exit(1); }
const results = checkContrast(model.vars, cfg.contrast.pairs);

if (args.json) { console.log(JSON.stringify(results, null, 2)); process.exit(results.some((r) => !r.ok && r.level === 'error') ? 1 : 0); }

let errors = 0, warns = 0;
for (const mode of ['light', 'dark']) {
  console.log(c.bold(`\n${mode.toUpperCase()}`));
  for (const r of results.filter((x) => x.mode === mode)) {
    const label = `${r.fg} on ${r.bg}`.padEnd(46);
    if (r.missing) { console.log(`  ${c.yellow('?')} ${label} ${c.dim('token missing')}`); warns++; continue; }
    if (r.unparsable) { console.log(`  ${c.yellow('?')} ${label} ${c.dim(`cannot parse ${r.fv} / ${r.bv}`)}`); warns++; continue; }
    const ratio = r.ratio.toFixed(2).padStart(5);
    if (r.ok) console.log(`  ${c.green('✔')} ${label} ${ratio}  ${c.dim(`≥ ${r.min}`)}`);
    else if (r.level === 'warn') { console.log(`  ${c.yellow('⚠')} ${label} ${ratio}  ${c.dim(`< ${r.min}`)}`); warns++; }
    else { console.log(`  ${c.red('✖')} ${label} ${ratio}  ${c.red(`< ${r.min}`)}`); errors++; }
  }
}
console.log(`\n${errors ? c.red(`${errors} failing`) : c.green('all required pairs pass')}${warns ? c.yellow(`, ${warns} warnings`) : ''}`);
process.exit(errors ? 1 : 0);
