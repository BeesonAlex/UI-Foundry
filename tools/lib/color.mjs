// ui-foundry color math: parsing, OKLCH <-> sRGB, gamut mapping, WCAG contrast.
// Zero dependencies. All channels are 0..1 gamma-encoded sRGB unless noted.

const NAMED = {
  transparent: [0, 0, 0, 0],
  white: [1, 1, 1, 1],
  black: [0, 0, 0, 1],
};

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function num(token, scale = 1) {
  token = String(token).trim();
  if (token === 'none') return 0;
  if (token.endsWith('%')) return (parseFloat(token) / 100) * scale;
  return parseFloat(token);
}

function splitArgs(inner) {
  // supports "a b c / d" and "a, b, c, d"
  let alpha = 1;
  let body = inner.trim();
  if (body.includes('/')) {
    const [main, a] = body.split('/');
    body = main;
    alpha = num(a, 1);
  }
  const parts = body.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 4 && alpha === 1) alpha = num(parts.pop(), 1);
  return { parts, alpha };
}

export function oklabToSrgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [toGamma(r), toGamma(g), toGamma(bb)];
}

export function srgbToOklab(r, g, b) {
  r = toLinear(r); g = toLinear(g); b = toLinear(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklchToSrgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  return oklabToSrgb(L, C * Math.cos(h), C * Math.sin(h));
}

export function srgbToOklch(r, g, b) {
  const [L, a, bb] = srgbToOklab(r, g, b);
  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, C < 1e-4 ? 0 : H];
}

const inGamut = (rgb, eps = 1e-4) => rgb.every((c) => c >= -eps && c <= 1 + eps);

/** Reduce chroma until the OKLCH color fits in sRGB. Returns [L, C, H]. */
export function gamutMapOklch(L, C, H) {
  if (inGamut(oklchToSrgb(L, C, H))) return [L, C, H];
  let lo = 0, hi = C;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToSrgb(L, mid, H))) lo = mid; else hi = mid;
  }
  return [L, lo, H];
}

// CIE Lab/LCH (D50) -> sRGB. Chromium serialises many computed colors as lab().
export function labToSrgb(L, a, b) {
  const k = 24389 / 27, e = 216 / 24389;
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const xr = fx ** 3 > e ? fx ** 3 : (116 * fx - 16) / k;
  const yr = L > k * e ? fy ** 3 : L / k;
  const zr = fz ** 3 > e ? fz ** 3 : (116 * fz - 16) / k;
  const X50 = xr * 0.96422, Y50 = yr, Z50 = zr * 0.82521;
  const X = 0.9554734527042182 * X50 - 0.023098536874261423 * Y50 + 0.0632593086610217 * Z50;
  const Y = -0.028369706963208136 * X50 + 1.0099954580058226 * Y50 + 0.021041398966943008 * Z50;
  const Z = 0.012314001688319899 * X50 - 0.020507696433477912 * Y50 + 1.3303659366080753 * Z50;
  const r = 3.2409699419045226 * X - 1.537383177570094 * Y - 0.4986107602930034 * Z;
  const g = -0.9692436362808796 * X + 1.8759675015077202 * Y + 0.04155505740717559 * Z;
  const bl = 0.05563007969699366 * X - 0.20397695888897652 * Y + 1.0569715142428786 * Z;
  return [toGamma(Math.max(0, r)), toGamma(Math.max(0, g)), toGamma(Math.max(0, bl))];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

/**
 * Parse a CSS color string. Returns { r, g, b, a } (0..1, sRGB, gamut-clipped) or null.
 * Supports hex, rgb[a], hsl[a], oklch, oklab, color(srgb ...), a few named colors.
 */
export function parseColor(input) {
  if (input == null) return null;
  const s = String(input).trim().toLowerCase();
  if (NAMED[s]) { const [r, g, b, a] = NAMED[s]; return { r, g, b, a }; }
  let m;
  if ((m = s.match(/^#([0-9a-f]{3,8})$/))) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
  }
  if ((m = s.match(/^(rgba?|hsla?|oklch|oklab|lab|lch|color)\((.*)\)$/))) {
    const fn = m[1];
    let inner = m[2];
    if (fn === 'color') {
      const cm = inner.trim().match(/^(srgb|srgb-linear|display-p3)\s+(.*)$/);
      if (!cm) return null;
      const { parts, alpha } = splitArgs(cm[2]);
      let [r, g, b] = parts.map((p) => num(p, 1));
      if (cm[1] === 'srgb-linear') [r, g, b] = [r, g, b].map(toGamma);
      return { r: clamp01(r), g: clamp01(g), b: clamp01(b), a: alpha };
    }
    const { parts, alpha } = splitArgs(inner);
    if (parts.length < 3) return null;
    let rgb;
    if (fn.startsWith('rgb')) {
      rgb = parts.slice(0, 3).map((p) => (p.endsWith('%') ? num(p, 1) : num(p) / 255));
    } else if (fn.startsWith('hsl')) {
      rgb = hslToRgb(parseFloat(parts[0]), num(parts[1].endsWith('%') ? parts[1] : parts[1] + '%', 1), num(parts[2].endsWith('%') ? parts[2] : parts[2] + '%', 1));
    } else if (fn === 'oklch') {
      const L = num(parts[0], 1);
      const C = num(parts[1], 0.4);
      const H = parseFloat(parts[2]) || 0;
      rgb = oklchToSrgb(L, C, H);
    } else if (fn === 'lab') {
      rgb = labToSrgb(num(parts[0], 100), num(parts[1], 125), num(parts[2], 125));
    } else if (fn === 'lch') {
      const h = ((parseFloat(parts[2]) || 0) * Math.PI) / 180, C = num(parts[1], 150);
      rgb = labToSrgb(num(parts[0], 100), C * Math.cos(h), C * Math.sin(h));
    } else if (fn === 'oklab') {
      rgb = oklabToSrgb(num(parts[0], 1), num(parts[1], 0.4), num(parts[2], 0.4));
    }
    if (!rgb || rgb.some((x) => Number.isNaN(x))) return null;
    return { r: clamp01(rgb[0]), g: clamp01(rgb[1]), b: clamp01(rgb[2]), a: clamp01(alpha) };
  }
  return null;
}

export const isColorString = (s) => parseColor(s) !== null;

export function toHex({ r, g, b, a = 1 }) {
  const h = (x) => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}${a < 1 ? h(a) : ''}`;
}

export function formatOklch(L, C, H, alpha = 1) {
  const r = (x, d) => Number(x.toFixed(d));
  return `oklch(${r(L, 3)} ${r(C, 3)} ${r(H, 1)}${alpha < 1 ? ` / ${r(alpha, 2)}` : ''})`;
}

export function toOklchString(color) {
  const c = typeof color === 'string' ? parseColor(color) : color;
  const [L, C, H] = srgbToOklch(c.r, c.g, c.b);
  return formatOklch(L, C, H, c.a);
}

/** Composite fg (with alpha) over an opaque bg. */
export function composite(fg, bg) {
  const a = fg.a ?? 1;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}

export function luminance({ r, g, b }) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(fg, bg) {
  const F = typeof fg === 'string' ? parseColor(fg) : fg;
  let B = typeof bg === 'string' ? parseColor(bg) : bg;
  if (!F || !B) return null;
  if ((B.a ?? 1) < 1) B = composite(B, { r: 1, g: 1, b: 1, a: 1 });
  const f = (F.a ?? 1) < 1 ? composite(F, B) : F;
  const l1 = luminance(f), l2 = luminance(B);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Perceptual distance (deltaE in OKLab). ~0.02 is barely noticeable. */
export function deltaE(c1, c2) {
  const A = typeof c1 === 'string' ? parseColor(c1) : c1;
  const B = typeof c2 === 'string' ? parseColor(c2) : c2;
  if (!A || !B) return Infinity;
  const a = srgbToOklab(A.r, A.g, A.b), b = srgbToOklab(B.r, B.g, B.b);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * Build an 11-step ramp (50..950) from a seed color, in OKLCH, gamut-mapped to sRGB.
 * Lightness is fixed per step so ramps from different hues line up for contrast.
 */
export const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const RAMP_L = [0.975, 0.945, 0.895, 0.82, 0.73, 0.64, 0.555, 0.47, 0.385, 0.3, 0.225];
const RAMP_C = [0.12, 0.25, 0.45, 0.7, 0.9, 1.0, 0.95, 0.85, 0.7, 0.55, 0.42]; // chroma curve relative to seed

export function rampFromSeed(seed, { neutral = false, chromaScale = 1 } = {}) {
  const c = typeof seed === 'string' ? parseColor(seed) : seed;
  if (!c) throw new Error(`Cannot parse seed color: ${seed}`);
  const [, C0, H] = srgbToOklch(c.r, c.g, c.b);
  const baseC = neutral ? Math.min(C0, 0.02) : C0 * chromaScale;
  const out = {};
  RAMP_STEPS.forEach((step, i) => {
    const [L, C, h] = gamutMapOklch(RAMP_L[i], neutral ? baseC * (0.6 + 0.4 * RAMP_C[i]) : baseC * RAMP_C[i], H);
    out[step] = formatOklch(L, C, h);
  });
  return out;
}
