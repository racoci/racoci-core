export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export const ALLOWED_PALETTE = [
  '#ffffff', // Default/White
  '#00d2ff', // Neon Cyan
  '#a855f7', // Neon Violet
  '#22c55e', // Neon Green
  '#eab308', // Neon Gold
  '#f97316', // Neon Orange
  '#ec4899'  // Neon Pink
];

export const COLOR_NAMES_MAP: Record<string, string> = {
  'white': '#ffffff',
  'cyan': '#00d2ff',
  'blue': '#00d2ff',
  'purple': '#a855f7',
  'violet': '#a855f7',
  'green': '#22c55e',
  'gold': '#eab308',
  'yellow': '#eab308',
  'orange': '#f97316',
  'pink': '#ec4899',
  'red': '#ec4899'
};

export function hexToRgb(hex: string): RGB {
  let cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  if (cleaned.length !== 6) {
    return { r: 255, g: 255, b: 255 };
  }
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

export function getClosestAllowedColor(colorStr: string): string {
  if (!colorStr) return '#ffffff';

  const normalized = colorStr.trim().toLowerCase();

  // Handle named colors
  if (COLOR_NAMES_MAP[normalized]) {
    return COLOR_NAMES_MAP[normalized];
  }

  // Handle exact palette hex match
  if (ALLOWED_PALETTE.includes(normalized)) {
    return normalized;
  }

  let hex = normalized;
  if (!hex.startsWith('#')) {
    hex = '#' + hex;
  }

  const rgb = hexToRgb(hex);

  let minDistance = Infinity;
  let closestColor = '#ffffff';

  for (const allowedHex of ALLOWED_PALETTE) {
    const allowedRgb = hexToRgb(allowedHex);
    const dr = rgb.r - allowedRgb.r;
    const dg = rgb.g - allowedRgb.g;
    const db = rgb.b - allowedRgb.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = allowedHex;
    }
  }

  return closestColor;
}

export function getRelativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
}

export function applyContrastProtection(bgHex: string, fgHex: string): string {
  const bgRgb = hexToRgb(bgHex);
  const fgRgb = hexToRgb(fgHex);

  const bgL = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const fgL = getRelativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);

  const deltaL = Math.abs(fgL - bgL);

  if (deltaL < 0.38) {
    const fgHsl = rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b);
    let newL = fgHsl.l;

    if (bgL < 0.5) {
      // Dark background: boost lightness to at least 80% (0.8) and saturation to 100% (1.0)
      newL = Math.max(0.8, fgHsl.l);
    } else {
      // Light background: decrease lightness to at most 20% (0.2) and saturation to 100% (1.0)
      newL = Math.min(0.2, fgHsl.l);
    }

    const correctedRgb = hslToRgb(fgHsl.h, 1.0, newL);
    return rgbToHex(correctedRgb.r, correctedRgb.g, correctedRgb.b);
  }

  return fgHex;
}
