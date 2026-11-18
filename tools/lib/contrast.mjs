import { contrastRatio, parseColor } from './color.mjs';

/**
 * Evaluate configured fg/bg pairs for every mode.
 * vars: model.vars from buildModel. Returns [{ mode, fg, bg, ratio, min, level, ok, missing }]
 */
export function checkContrast(vars, pairs, modes = ['light', 'dark']) {
  const colors = new Map(vars.filter((v) => v.tier === 'semantic' && v.group === 'color').map((v) => [v.name, v]));
  const results = [];
  for (const mode of modes) {
    for (const [fg, bg, min, level = 'error'] of pairs) {
      const F = colors.get(fg), B = colors.get(bg);
      if (!F || !B) { results.push({ mode, fg, bg, min, level: 'warn', ok: false, missing: true }); continue; }
      const fv = mode === 'dark' ? F.dark ?? F.light : F.light;
      const bv = mode === 'dark' ? B.dark ?? B.light : B.light;
      if (!parseColor(fv) || !parseColor(bv)) { results.push({ mode, fg, bg, min, level: 'warn', ok: false, unparsable: true, fv, bv }); continue; }
      const ratio = contrastRatio(fv, bv);
      results.push({ mode, fg, bg, min, level, ratio, ok: ratio >= min, fv, bv });
    }
  }
  return results;
}
