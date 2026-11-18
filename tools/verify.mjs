#!/usr/bin/env node
// ui-foundry: render routes in a real browser across viewports + themes, screenshot them, and audit
// the rendered DOM against the design tokens (off-palette colors, fonts, type scale), WCAG text
// contrast, overflow, tap targets, accessible names, image alts, console errors (+ axe if installed).
//
//   node design/tools/verify.mjs [--url http://localhost:3000] [--routes / /pricing]
//        [--viewports 390 1440] [--themes light dark] [--wait 300] [--json] [--root dir]
//
// Requires a running dev server and Playwright (npm i -D playwright && npx playwright install chromium).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { parseArgs, findRoot, loadConfig, loadTokens, buildModel, rel, c } from './lib/tokens.mjs';
import { parseColor, deltaE, composite, contrastRatio } from './lib/color.mjs';
import { launch, slug, stamp } from './lib/browser.mjs';

const args = parseArgs();
const root = path.resolve(args.root || findRoot());
const cfg = loadConfig(root);
const V = cfg.verify;
const list = (x, d) => (x === undefined ? d : (Array.isArray(x) ? x : String(x).split(',')).flatMap((s) => String(s).split(',')).filter(Boolean));
const baseUrl = (args.url || V.baseUrl).replace(/\/$/, '');
const routes = list(args.routes, V.routes);
const viewports = list(args.viewports, V.viewports).map(Number);
const themes = list(args.themes, V.themes);
const wait = Number(args.wait || 300);
const outDir = path.join(root, cfg.designDir, '.verify', stamp());

const { json } = loadTokens(root, cfg);
const model = buildModel(json);
const semColors = model.vars.filter((v) => v.tier === 'semantic' && v.group === 'color');
const palette = {
  light: semColors.map((v) => parseColor(v.light)).filter(Boolean),
  dark: semColors.map((v) => parseColor(v.dark ?? v.light)).filter(Boolean),
};
const fontStacks = model.vars.filter((v) => v.group === 'font').map((v) => String(v.light));
// next/font renders families like "__Geist_5cfdac" / "__Geist_Fallback_5cfdac" — normalise to "geist"
const normFamily = (f) => f.trim().replace(/^["']|["']$/g, '').replace(/^__/, '').replace(/(_Fallback)?_[0-9a-f]{5,}$/i, '').replace(/_/g, ' ').toLowerCase();
const tokenFamilies = new Set(fontStacks.flatMap((s) => s.split(',').filter((f) => !/var\(/.test(f)).map(normFamily)));
const fontCheckable = tokenFamilies.size > 0;
const textSizesPx = model.vars.filter((v) => v.group === 'text').map((v) => {
  const s = String(v.light); return s.endsWith('rem') ? parseFloat(s) * 16 : parseFloat(s);
}).filter((n) => !Number.isNaN(n));

// Runs inside the page. Keep it self-contained.
const AUDIT = () => {
  const MAX = 4000;
  const vis = (el, cs) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0;
  };
  const sel = (el) => {
    const parts = [];
    for (let e = el, i = 0; e && e.nodeType === 1 && i < 3; e = e.parentElement, i++) {
      let s = e.tagName.toLowerCase();
      if (e.id) { s += '#' + e.id; parts.unshift(s); break; }
      const cls = [...e.classList].filter((x) => !/^(__|css-)/.test(x)).slice(0, 2);
      if (cls.length) s += '.' + cls.join('.');
      parts.unshift(s);
    }
    return parts.join(' > ');
  };
  const els = [...document.querySelectorAll('body *')].slice(0, MAX);
  const colors = [], text = [], targets = [], unnamed = [], fonts = {}, sizes = {};
  for (const el of els) {
    const cs = getComputedStyle(el);
    if (!vis(el, cs)) continue;
    if (['svg', 'path', 'g', 'circle', 'rect', 'line', 'polyline', 'polygon', 'use'].includes(el.tagName.toLowerCase())) continue;
    const s = sel(el);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText) {
      colors.push(['color', cs.color, s]);
      const fam = cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
      fonts[fam] = (fonts[fam] || 0) + 1;
      sizes[cs.fontSize] = (sizes[cs.fontSize] || 0) + 1;
      if (text.length < 1500) {
        const chain = [];
        for (let a = el, i = 0; a && i < 20; a = a.parentElement, i++) {
          const acs = getComputedStyle(a);
          if (acs.backgroundImage && acs.backgroundImage !== 'none') { chain.push('IMAGE'); break; }
          chain.push(acs.backgroundColor);
        }
        text.push({ sel: s, color: cs.color, chain, size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight) || 400, sample: el.textContent.trim().slice(0, 40) });
      }
    }
    if (cs.backgroundColor && !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(cs.backgroundColor)) colors.push(['background', cs.backgroundColor, s]);
    if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') colors.push(['border', cs.borderTopColor, s]);
    if (el.matches('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch]')) {
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 24) targets.push({ sel: s, w: Math.round(r.width), h: Math.round(r.height) });
      const labelled = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title')
        || (el.labels && el.labels.length) || (el.innerText || '').trim() || el.querySelector('img[alt]:not([alt=""]),svg[aria-label],[aria-label]') || el.getAttribute('placeholder');
      if (!labelled) unnamed.push({ sel: s, tag: el.tagName.toLowerCase() });
    }
  }
  const imgsNoAlt = [...document.querySelectorAll('img:not([alt])')].map(sel).slice(0, 20);
  const vw = window.innerWidth;
  const overflow = document.documentElement.scrollWidth > vw + 1;
  const offenders = overflow ? els.filter((e) => e.getBoundingClientRect().right > vw + 1).slice(0, 5).map(sel) : [];
  return { colors, text, targets, unnamed, imgsNoAlt, overflow, offenders, fonts, sizes, title: document.title };
};

async function maybeAxe(page) {
  for (const base of [path.join(root, 'package.json')]) {
    try {
      const req = createRequire(base);
      const mod = await import(pathToFileURL(req.resolve('@axe-core/playwright')).href);
      const AxeBuilder = mod.default || mod.AxeBuilder;
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      return res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length }));
    } catch {}
  }
  return null;
}

function analyze(raw, theme, viewport) {
  const issues = [];
  const add = (severity, rule, message, detail) => issues.push({ severity, rule, message, detail });
  // off-palette colors
  const pal = palette[theme] || palette.light;
  const seen = new Map();
  for (const [prop, value, sel] of raw.colors) {
    const p = parseColor(value);
    if (!p || p.a < 1) continue; // translucent overlays/opacity modifiers are derived from tokens
    const d = Math.min(...pal.map((k) => deltaE(p, k)));
    if (d > V.offPaletteTolerance) {
      const key = `${prop}:${value}`;
      if (!seen.has(key)) seen.set(key, { prop, value, count: 0, sample: sel, deltaE: Number(d.toFixed(3)) });
      seen.get(key).count++;
    }
  }
  const off = [...seen.values()].sort((a, b) => b.count - a.count);
  if (off.length > V.maxOffPalette) add('error', 'off-palette', `${off.length} rendered colors are not semantic tokens`, off.slice(0, 12));
  // contrast
  const fails = new Map();
  for (const t of raw.text) {
    if (t.chain.includes('IMAGE')) continue;
    let bg = { r: 1, g: 1, b: 1, a: 1 };
    for (const b of [...t.chain].reverse()) { const p = parseColor(b); if (p && p.a > 0) bg = composite(p, bg); }
    const fg = parseColor(t.color);
    if (!fg) continue;
    const ratio = contrastRatio(fg, bg);
    const large = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700);
    const min = large ? 3 : 4.5;
    if (ratio < min) {
      const key = `${t.color}|${JSON.stringify(bg)}`;
      if (!fails.has(key)) fails.set(key, { ratio: Number(ratio.toFixed(2)), min, color: t.color, sample: t.sample, sel: t.sel, count: 0 });
      fails.get(key).count++;
    }
  }
  if (fails.size) add('error', 'contrast', `${fails.size} text color/background combinations fail WCAG AA`, [...fails.values()].slice(0, 10));
  // fonts & type scale
  if (fontCheckable) {
    const stray = Object.entries(raw.fonts).filter(([f]) => !tokenFamilies.has(normFamily(f)));
    if (stray.length) add('warn', 'font-family', `Fonts not in tokens: ${stray.map(([f, n]) => `${f} (${n})`).join(', ')}`);
  }
  if (textSizesPx.length) {
    const stray = Object.entries(raw.sizes).filter(([s]) => !textSizesPx.some((t) => Math.abs(t - parseFloat(s)) < 0.6));
    if (stray.length) add('warn', 'type-scale', `Font sizes off the type scale: ${stray.map(([s, n]) => `${s} ×${n}`).join(', ')}`);
  }
  if (raw.overflow) add('error', 'overflow', `Horizontal overflow at ${viewport}px`, raw.offenders);
  if (viewport <= 480 && raw.targets.length) add('warn', 'tap-target', `${raw.targets.length} interactive elements smaller than 24×24px`, raw.targets.slice(0, 8));
  if (raw.unnamed.length) add('error', 'accessible-name', `${raw.unnamed.length} interactive elements have no accessible name`, raw.unnamed.slice(0, 8));
  if (raw.imgsNoAlt.length) add('error', 'img-alt', `${raw.imgsNoAlt.length} images missing alt`, raw.imgsNoAlt);
  return issues;
}

const browser = await launch(root).catch((e) => { console.error(c.red(`✖ ${e.message}`)); process.exit(2); });
fs.mkdirSync(outDir, { recursive: true });
const results = [];
for (const route of routes) {
  for (const theme of themes) {
    for (const vw of viewports) {
      const ctx = await browser.newContext({ viewport: { width: vw, height: 900 }, colorScheme: theme === 'dark' ? 'dark' : 'light', deviceScaleFactor: 1 });
      await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme);
      const page = await ctx.newPage();
      const consoleErrors = [];
      page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
      page.on('pageerror', (e) => consoleErrors.push(String(e.message).slice(0, 300)));
      const url = baseUrl + route;
      const entry = { route, theme, viewport: vw, url, issues: [] };
      try {
        const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        if (resp && resp.status() >= 400) entry.issues.push({ severity: 'error', rule: 'http', message: `HTTP ${resp.status()}` });
        await page.evaluate((t) => {
          const d = document.documentElement;
          d.classList.toggle('dark', t === 'dark'); d.classList.toggle('light', t === 'light'); d.dataset.theme = t;
        }, theme);
        await page.evaluate(() => document.fonts && document.fonts.ready);
        await page.waitForTimeout(wait);
        const shot = path.join(outDir, `${slug(route)}@${vw}-${theme}.png`);
        await page.screenshot({ path: shot, fullPage: !args['no-full-page'] });
        entry.screenshot = rel(root, shot);
        const raw = await page.evaluate(AUDIT);
        entry.title = raw.title;
        entry.issues.push(...analyze(raw, theme, vw));
        const axe = await maybeAxe(page);
        if (axe) axe.forEach((v) => entry.issues.push({ severity: ['critical', 'serious'].includes(v.impact) ? 'error' : 'warn', rule: `axe/${v.id}`, message: `${v.help} (${v.nodes} nodes)` }));
      } catch (e) {
        entry.issues.push({ severity: 'error', rule: 'load', message: e.message.split('\n')[0] });
      }
      if (consoleErrors.length) entry.issues.push({ severity: 'error', rule: 'console', message: `${consoleErrors.length} console errors`, detail: [...new Set(consoleErrors)].slice(0, 5) });
      results.push(entry);
      await ctx.close();
      const e = entry.issues.filter((i) => i.severity === 'error').length;
      const w = entry.issues.filter((i) => i.severity === 'warn').length;
      console.log(`${e ? c.red('✖') : c.green('✔')} ${route} @${vw} ${theme}  ${c.dim(`${e} errors, ${w} warnings`)}  ${c.dim(entry.screenshot || '')}`);
    }
  }
}
await browser.close();

// report
const totalErr = results.reduce((n, r) => n + r.issues.filter((i) => i.severity === 'error').length, 0);
const totalWarn = results.reduce((n, r) => n + r.issues.filter((i) => i.severity === 'warn').length, 0);
const md = [
  `# UI verification — ${new Date().toISOString()}`,
  '',
  `Base URL: ${baseUrl} · ${results.length} renders · **${totalErr} errors, ${totalWarn} warnings**`,
  '',
  '| Route | Viewport | Theme | Errors | Warnings | Screenshot |',
  '| --- | --- | --- | --- | --- | --- |',
  ...results.map((r) => `| ${r.route} | ${r.viewport} | ${r.theme} | ${r.issues.filter((i) => i.severity === 'error').length} | ${r.issues.filter((i) => i.severity === 'warn').length} | ${r.screenshot ? `\`${path.basename(r.screenshot)}\`` : '—'} |`),
  '',
  ...results.filter((r) => r.issues.length).flatMap((r) => [
    `## ${r.route} @${r.viewport} ${r.theme}`,
    ...r.issues.map((i) => `- **${i.severity}** \`${i.rule}\` — ${i.message}${i.detail ? `\n  \`\`\`json\n  ${JSON.stringify(i.detail).slice(0, 1200)}\n  \`\`\`` : ''}`),
    '',
  ]),
  '## Next step',
  'Open the screenshots and review them against DESIGN.md (ui-verify skill, visual review rubric). Automated checks are the floor, not the bar.',
].join('\n');
fs.writeFileSync(path.join(outDir, 'report.md'), md);
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ baseUrl, results }, null, 2));
fs.writeFileSync(path.join(root, cfg.designDir, '.verify', 'latest.txt'), rel(root, outDir) + '\n');
if (args.json) console.log(JSON.stringify({ outDir: rel(root, outDir), totalErr, totalWarn, results }, null, 2));
console.log(`\n${totalErr ? c.red('✖') : c.green('✔')} ${totalErr} errors, ${totalWarn} warnings → ${rel(root, path.join(outDir, 'report.md'))}`);
process.exit(totalErr ? 1 : 0);
