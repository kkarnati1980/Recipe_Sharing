// theme.js — CookCircle color helpers + Kitchen Daylight / Evening Hearth themes

export const FONT = "'Hanken Grotesk',-apple-system,system-ui,sans-serif";

// pick a readable text color (near-black or white) for a given background hex
export function onColor(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#1a1208' : '#ffffff';
}

// hex -> rgba() with the given alpha
export function alpha(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// build a full token set from the current tweak state (light = Kitchen Daylight, dark = Evening Hearth)
export function theme(t) {
  const onPrimary = onColor(t.primary);
  if (t.dark) return {
    onPrimary, dark: true,
    bg: '#15110D', text: '#F6EEE2', dim: '#b8a892', faint: '#7d7060',
    surface: '#241C14', surfaceBd: '#34291d', line: '#2c241a',
    stepBg: '#241C14', stepBd: '#34291d', ghostBg: '#241C14', ghostBd: '#34291d', ghostText: '#e3d7c5',
    solidBg: '#F6EEE2', solidText: '#1a1208', inputBg: '#1d1710', inputText: '#F6EEE2', placeholder: '#8a7c69',
    chipBg: '#241C14', chipBd: '#34291d', scrim: 'rgba(5,4,2,.62)', sheet: '#1b1610',
  };
  return {
    onPrimary, dark: false,
    bg: '#FBF6EE', text: '#2A211B', dim: '#6f6356', faint: '#a2937e',
    surface: '#ffffff', surfaceBd: '#ece2d3', line: '#ece2d3',
    stepBg: '#ffffff', stepBd: alpha(t.primary, .30), ghostBg: '#ffffff', ghostBd: '#e7ddcd', ghostText: '#5c5043',
    solidBg: '#2A211B', solidText: '#ffffff', inputBg: '#ffffff', inputText: '#2A211B', placeholder: '#a99a82',
    chipBg: '#ffffff', chipBd: '#e7ddcd', scrim: 'rgba(42,33,27,.42)', sheet: '#FBF6EE',
  };
}
