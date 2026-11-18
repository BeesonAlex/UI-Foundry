#!/usr/bin/env node
// ui-foundry post-edit hook for Claude Code (PostToolUse) and Cursor (afterFileEdit + postToolUse).
//   design/tokens.json        → rebuild generated CSS/TS + DESIGN.md tables
//   components dir file       → refresh components.md inventory
//   UI code (.tsx/.css/…)     → design-lint that file; findings are fed back to the agent
// Claude Code: one PostToolUse call does everything; errors go to stderr with exit 2.
// Cursor: afterFileEdit (output ignored) does the rebuilds; postToolUse does the read-only checks and reports
// through `additional_context` (exit 2 there would mean "deny", not "feedback").
// Silent no-op in projects without design/design.config.json.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
const event = input.hook_event_name || (input.edits ? 'afterFileEdit' : 'PostToolUse');
const cursor = event === 'afterFileEdit' || event === 'postToolUse';
const doRebuild = event !== 'postToolUse';
const doCheck = event !== 'afterFileEdit';

const ti = input.tool_input || {};
const file = input.file_path || ti.file_path || ti.path || ti.target_file;
if (!file) process.exit(0);
// Cursor plugin hooks run from the plugin dir; pick the workspace root that contains the file.
const roots = (input.workspace_roots || []).map((r) => path.resolve(r));
const fileAbs = path.isAbsolute(file) ? file : null;
const root = (fileAbs && roots.find((r) => !path.relative(r, fileAbs).startsWith('..')))
  || process.env.CURSOR_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || roots[0] || input.cwd || process.cwd();
const cfgFile = path.join(root, 'design', 'design.config.json');
if (!fs.existsSync(cfgFile)) process.exit(0);

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); } catch {}
const abs = path.resolve(root, file);
const rel = path.relative(root, abs).split(path.sep).join('/');
if (rel.startsWith('..')) process.exit(0);
const toolsDir = fs.existsSync(path.join(root, 'design', 'tools', 'design-lint.mjs')) ? path.join(root, 'design', 'tools') : here;
const run = (script, args) => spawnSync(process.execPath, [path.join(toolsDir, script), '--root', root, ...args], { cwd: root, encoding: 'utf8' });
const context = [];
const problems = [];
const compDir = (cfg.componentsDir || 'components/ui').replace(/\/$/, '');

if (rel === 'design/tokens.json') {
  let built = true;
  if (doRebuild) {
    const r = run('tokens-build.mjs', []);
    if (r.status !== 0) { built = false; problems.push(`ui-foundry: tokens.json did not build:\n${r.stderr || r.stdout}`); }
  }
  if (doCheck && built) {
    const lint = run('design-lint.mjs', ['--scope', 'tokens,contrast', '--json']);
    try {
      const j = JSON.parse(lint.stdout);
      const errs = j.findings.filter((f) => f.severity === 'error');
      if (errs.length) problems.push(`ui-foundry: tokens.json has ${errs.length} problems:\n${errs.map((f) => `- [${f.rule}] ${f.message}`).join('\n')}`);
      else context.push(`ui-foundry rebuilt design/generated/* and the DESIGN.md token tables from tokens.json (contrast OK). Update DESIGN.md prose if the intent changed.${cursor ? ' If generated files look stale, run `npm run design:build`.' : ''}`);
    } catch {}
  }
} else if (/\.(tsx|jsx|ts|css|scss|mdx)$/.test(rel) && !rel.startsWith('design/')) {
  if (doRebuild && rel.startsWith(compDir + '/') && /\.[jt]sx$/.test(rel)) {
    const inv = run('inventory.mjs', []);
    if (/updated/.test(inv.stdout)) context.push('ui-foundry refreshed the inventory table in design/components.md.');
    if (/no "## /.test(inv.stderr)) context.push(inv.stderr.trim());
  }
  if (doCheck) {
    const r = run('design-lint.mjs', ['--scope', 'code', '--files', rel, '--json']);
    try {
      const j = JSON.parse(r.stdout);
      const errs = j.findings.filter((f) => f.severity === 'error');
      const warns = j.findings.filter((f) => f.severity === 'warn');
      const fmt = (f) => `- ${f.file}:${f.line} [${f.rule}] ${f.message}${f.hint ? ` → ${f.hint}` : ''}`;
      if (errs.length) problems.push(`ui-foundry design-lint: ${errs.length} error(s) in ${rel}. Fix them using design tokens/components:\n${errs.map(fmt).join('\n')}`);
      if (warns.length) context.push(`ui-foundry design-lint warnings in ${rel}:\n${warns.map(fmt).join('\n')}`);
    } catch {}
  }
}

const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
if (event === 'afterFileEdit') {
  // Cursor ignores afterFileEdit output; surface build failures in the hooks log only.
  if (problems.length) process.stderr.write(strip(problems.join('\n')) + '\n');
  process.exit(0);
}
if (cursor) {
  const text = [...problems, ...context].join('\n');
  if (text) process.stdout.write(JSON.stringify({ additional_context: strip(text) }));
  process.exit(0);
}
if (problems.length) { process.stderr.write(problems.join('\n') + '\n'); process.exit(2); }
if (context.length) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: strip(context.join('\n')) } }));
}
process.exit(0);
