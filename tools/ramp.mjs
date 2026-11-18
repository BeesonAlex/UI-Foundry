#!/usr/bin/env node
// ui-foundry: generate perceptually even OKLCH ramps (50..950) from seed colors, as tokens.json primitives.
//
//   node design/tools/ramp.mjs brand="#4f46e5" neutral="#4f46e5" --neutral neutral
//   node design/tools/ramp.mjs accent="oklch(0.7 0.15 60)" --chroma 0.9
//
// name=seed pairs; names listed in --neutral get a low-chroma (tinted gray) ramp.
// Output is JSON you can paste under "primitive.color" in design/tokens.json (or --write to merge it in).
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, findRoot, loadConfig, tokensPath } from './lib/tokens.mjs';
import { rampFromSeed, parseColor, toHex } from './lib/color.mjs';

const args = parseArgs();
const neutrals = new Set([].concat(args.neutral || []).flatMap((s) => String(s).split(',')));
const chroma = Number(args.chroma || 1);
const pairs = args._.map((a) => a.split('=')).filter((p) => p.length === 2);
if (!pairs.length) { console.error('Usage: ramp.mjs name=<color> [...] [--neutral name] [--chroma 1] [--write]'); process.exit(1); }

const out = {};
for (const [name, seed] of pairs) {
  const ramp = rampFromSeed(seed.replace(/^["']|["']$/g, ''), { neutral: neutrals.has(name), chromaScale: chroma });
  out[name] = Object.fromEntries(Object.entries(ramp).map(([step, v]) => [step, { $value: v, $description: toHex(parseColor(v)) }]));
}

if (args.write) {
  const root = path.resolve(args.root || findRoot());
  const cfg = loadConfig(root);
  const file = tokensPath(root, cfg);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  json.primitive ??= {}; json.primitive.color ??= { $type: 'color' };
  Object.assign(json.primitive.color, out);
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(`✔ merged ${Object.keys(out).join(', ')} into ${path.relative(root, file)} — now run npm run design:build`);
} else {
  console.log(JSON.stringify(out, null, 2));
}
