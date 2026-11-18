#!/usr/bin/env node
// ui-foundry: scan the component library and refresh the inventory table in design/components.md.
//   node design/tools/inventory.mjs [--check] [--json] [--root dir]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, findRoot, loadConfig, replaceBlock, rel, c } from './lib/tokens.mjs';
import { scanComponents, inventoryTable } from './lib/inventory.mjs';

const args = parseArgs();
const root = path.resolve(args.root || findRoot());
const cfg = loadConfig(root);
const items = scanComponents(root, cfg);

if (args.json) { console.log(JSON.stringify(items, null, 2)); process.exit(0); }

const file = path.join(root, cfg.designDir, 'components.md');
if (!fs.existsSync(file)) { console.error(c.red(`✖ ${rel(root, file)} not found`)); process.exit(1); }
const text = fs.readFileSync(file, 'utf8');
const r = replaceBlock(text, 'inventory', inventoryTable(items));
if (!r.found) { console.error(c.red('✖ components.md has no <!-- ui-foundry:generated:inventory --> block')); process.exit(1); }

if (args.check) {
  if (r.text !== text) { console.error(c.red('✖ components.md inventory is stale. Run: npm run design:inventory')); process.exit(1); }
  console.log(c.green(`✔ inventory up to date (${items.length} components)`));
} else {
  if (r.text !== text) { fs.writeFileSync(file, r.text); console.log(c.green(`✔ updated ${rel(root, file)} (${items.length} components)`)); }
  else console.log(c.dim(`inventory unchanged (${items.length} components)`));
  const documented = new Set([...r.text.replace(/<!--[\s\S]*?-->/g, '').matchAll(/^##\s+([A-Z][\w]*)/gm)].map((m) => m[1]));
  const undocumented = items.filter((i) => !documented.has(i.name));
  undocumented.forEach((i) => console.warn(c.yellow(`⚠ ${i.name} has no "## ${i.name}" usage section in components.md`)));
}
