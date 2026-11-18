#!/usr/bin/env node
// ui-foundry: extract design signals from inspiration — live websites or image files.
//
//   node design/tools/inspect.mjs https://linear.app ./moodboard/poster.png [--out design/inspiration]
//
// Websites: screenshots + computed-style census (palette weighted by area/text, font families and the
// type ladder for h1–h3/body, radii, shadows, spacing rhythm, button styling, :root custom properties).
// Images: dominant palette via k-means. Results land in design/inspiration/<slug>/ (inspect.json + summary.md).
// Requires Playwright (npm i -D playwright && npx playwright install chromium).
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, findRoot, loadConfig, rel, c } from './lib/tokens.mjs';
import { parseColor, toHex, toOklchString, srgbToOklch, deltaE } from './lib/color.mjs';
import { launch, slug } from './lib/browser.mjs';

const args = parseArgs();
const root = path.resolve(args.root || findRoot());
const cfg = loadConfig(root);
const outBase = path.resolve(root, args.out || path.join(cfg.designDir, 'inspiration'));
const inputs = args._;
if (!inputs.length) { console.error('Usage: inspect.mjs <url|image> [...more] [--out dir]'); process.exit(1); }

const SITE_AUDIT = () => {
  const els = [...document.querySelectorAll('body *')].slice(0, 6000);
  const bg = {}, fg = {}, border = {}, radii = {}, shadows = {}, spacing = {}, families = {};
  const bump = (o, k, n = 1) => { if (k) o[k] = (o[k] || 0) + n; };
  for (const el of els) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none') continue;
    const area = Math.min(r.width * r.height, 1440 * 900);
    if (!/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) bump(bg, cs.backgroundColor, area);
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    if (own) { bump(fg, cs.color, own.length); bump(families, cs.fontFamily, own.length); }
    if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') bump(border, cs.borderTopColor);
    if (cs.borderTopLeftRadius !== '0px') bump(radii, cs.borderTopLeftRadius);
    if (cs.boxShadow !== 'none') bump(shadows, cs.boxShadow);
    for (const p of ['paddingTop', 'paddingLeft', 'rowGap', 'columnGap', 'marginBottom']) { const v = cs[p]; if (v && v !== '0px' && v !== 'normal' && v !== 'auto') bump(spacing, v); }
  }
  const type = {};
  for (const tag of ['h1', 'h2', 'h3', 'h4', 'p', 'li', 'a', 'button', 'small', 'code']) {
    const el = document.querySelector(tag);
    if (!el) continue;
    const cs = getComputedStyle(el);
    type[tag] = { family: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, transform: cs.textTransform, color: cs.color };
  }
  const buttons = [...document.querySelectorAll('button, a[class*="button" i], a[class*="btn" i], [role=button]')].slice(0, 6).map((b) => {
    const cs = getComputedStyle(b);
    return { text: (b.innerText || '').trim().slice(0, 30), bg: cs.backgroundColor, color: cs.color, radius: cs.borderRadius, padding: cs.padding, weight: cs.fontWeight, border: cs.border, shadow: cs.boxShadow };
  });
  const customProps = {};
  for (const sheet of [...document.styleSheets]) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of [...rules]) {
      if (rule.selectorText && /(^|,)\s*(:root|html)\b/.test(rule.selectorText)) {
        for (const prop of [...rule.style]) if (prop.startsWith('--') && Object.keys(customProps).length < 300) customProps[prop] = rule.style.getPropertyValue(prop).trim();
      }
    }
  }
  const containers = [...document.querySelectorAll('main, section, header, footer, [class*="container" i]')].slice(0, 20).map((e) => getComputedStyle(e).maxWidth).filter((v) => v && v !== 'none');
  return { title: document.title, bg, fg, border, radii, shadows, spacing, families, type, buttons, customProps, containers, scrollHeight: document.documentElement.scrollHeight };
};

const IMAGE_KMEANS = async (dataUrl) => {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const scale = Math.min(1, 160 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const px = [];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) px.push([d[i], d[i + 1], d[i + 2]]);
  const K = 10;
  let cents = Array.from({ length: K }, (_, i) => px[Math.floor((i + 0.5) * px.length / K)] || [0, 0, 0]);
  let assign = new Array(px.length).fill(0);
  for (let it = 0; it < 15; it++) {
    for (let i = 0; i < px.length; i++) {
      let best = 0, bd = Infinity;
      for (let k = 0; k < K; k++) { const c = cents[k]; const dd = (px[i][0] - c[0]) ** 2 + (px[i][1] - c[1]) ** 2 + (px[i][2] - c[2]) ** 2; if (dd < bd) { bd = dd; best = k; } }
      assign[i] = best;
    }
    const sums = Array.from({ length: K }, () => [0, 0, 0, 0]);
    px.forEach((p, i) => { const s = sums[assign[i]]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; });
    cents = sums.map((s, k) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : cents[k]));
  }
  const counts = new Array(K).fill(0); assign.forEach((a) => counts[a]++);
  return { width: img.width, height: img.height, clusters: cents.map((c, k) => ({ rgb: c.map(Math.round), share: counts[k] / px.length })).filter((x) => x.share > 0.004).sort((a, b) => b.share - a.share) };
};

function describe(colorStr) {
  const p = parseColor(colorStr);
  if (!p) return null;
  const [L, C, H] = srgbToOklch(p.r, p.g, p.b);
  return { hex: toHex({ ...p, a: 1 }), oklch: toOklchString({ ...p, a: 1 }), L: +L.toFixed(3), C: +C.toFixed(3), H: +H.toFixed(1) };
}

function mergePalette(weighted, limit = 12) {
  const items = Object.entries(weighted).map(([v, w]) => ({ v, w, p: parseColor(v) })).filter((x) => x.p && x.p.a > 0.5).sort((a, b) => b.w - a.w);
  const merged = [];
  for (const it of items) {
    const hit = merged.find((m) => deltaE(m.p, it.p) < 0.03);
    if (hit) hit.w += it.w; else merged.push({ ...it });
  }
  const total = merged.reduce((s, m) => s + m.w, 0) || 1;
  return merged.slice(0, limit).map((m) => ({ ...describe(m.v), share: +(m.w / total).toFixed(3) }));
}

const top = (o, n = 8) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ value: k, count: Math.round(v) }));

const browser = await launch(root).catch((e) => { console.error(c.red(`✖ ${e.message}`)); console.error('Fallback: use your browser tool / WebFetch for sites and view images directly, then record notes in design/inspiration/.'); process.exit(2); });
for (const input of inputs) {
  const isUrl = /^https?:\/\//.test(input);
  const name = slug(isUrl ? input : path.basename(input).replace(/\.\w+$/, ''));
  const dir = path.join(outBase, name);
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let result;
  try {
    if (isUrl) {
      await page.goto(input, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => page.waitForTimeout(3000));
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(dir, 'above-fold.png') });
      const raw = await page.evaluate(SITE_AUDIT);
      await page.screenshot({ path: path.join(dir, 'full.png'), fullPage: raw.scrollHeight < 8000 });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(dir, 'mobile.png') });
      result = {
        source: input, kind: 'website', title: raw.title,
        palette: { backgrounds: mergePalette(raw.bg, 8), text: mergePalette(raw.fg, 6), borders: mergePalette(raw.border, 4) },
        typography: { families: top(raw.families, 5), ladder: raw.type },
        radii: top(raw.radii, 6), shadows: top(raw.shadows, 4), spacing: top(raw.spacing, 12), containers: [...new Set(raw.containers)].slice(0, 6),
        buttons: raw.buttons, customProperties: raw.customProps,
        screenshots: ['above-fold.png', 'full.png', 'mobile.png'],
      };
    } else {
      const abs = path.resolve(root, input);
      const ext = path.extname(abs).slice(1).toLowerCase().replace('jpg', 'jpeg');
      const dataUrl = `data:image/${ext === 'svg' ? 'svg+xml' : ext};base64,${fs.readFileSync(abs).toString('base64')}`;
      fs.copyFileSync(abs, path.join(dir, path.basename(abs)));
      await page.setContent('<html><body></body></html>');
      const raw = await page.evaluate(IMAGE_KMEANS, dataUrl);
      result = {
        source: input, kind: 'image', size: `${raw.width}×${raw.height}`,
        palette: { dominant: raw.clusters.map((k) => ({ ...describe(`rgb(${k.rgb.join(' ')})`), share: +k.share.toFixed(3) })) },
        screenshots: [path.basename(abs)],
      };
    }
  } catch (e) {
    console.error(c.red(`✖ ${input}: ${e.message.split('\n')[0]}`));
    await page.close();
    continue;
  }
  await page.close();
  fs.writeFileSync(path.join(dir, 'inspect.json'), JSON.stringify(result, null, 2));
  const sw = (p) => `| ${p.hex} | \`${p.oklch}\` | ${(p.share * 100).toFixed(1)}% |`;
  const table = (rows) => ['| Hex | OKLCH | Share |', '| --- | --- | --- |', ...rows.map(sw)].join('\n');
  const summary = [
    `# Inspiration: ${result.title || input}`,
    '',
    `Source: ${input} (${result.kind})`,
    '',
    ...Object.entries(result.palette).flatMap(([k, v]) => [`## Palette — ${k}`, table(v), '']),
    ...(result.typography ? ['## Typography', ...result.typography.families.map((f) => `- ${f.value} (${f.count} chars)`), '', '```json', JSON.stringify(result.typography.ladder, null, 2), '```', ''] : []),
    ...(result.radii ? ['## Shape', `Radii: ${result.radii.map((r) => r.value).join(', ') || '—'}`, '', `Shadows: ${result.shadows.map((s) => '`' + s.value + '`').join(' · ') || '—'}`, '', `Spacing rhythm (most common): ${result.spacing.map((s) => s.value).join(', ')}`, '', `Container widths: ${result.containers.join(', ') || '—'}`, ''] : []),
    ...(result.buttons?.length ? ['## Buttons', '```json', JSON.stringify(result.buttons, null, 2), '```', ''] : []),
    ...(result.customProperties && Object.keys(result.customProperties).length ? ['## :root custom properties (their own tokens)', '```css', ...Object.entries(result.customProperties).slice(0, 80).map(([k, v]) => `${k}: ${v};`), '```', ''] : []),
    '## Notes (fill in)',
    '- Take: <!-- fill: what specifically to borrow (e.g. "warm off-white canvas", "tight heading tracking") -->',
    '- Leave: <!-- fill: what not to copy (their brand color, logo, illustrations) -->',
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'summary.md'), summary);
  console.log(`${c.green('✔')} ${input} → ${rel(root, dir)}/ (summary.md, inspect.json, ${result.screenshots.join(', ')})`);
}
await browser.close();
