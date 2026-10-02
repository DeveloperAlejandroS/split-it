// Color de la app: a partir de UN color base se derivan todos los tokens de
// marca (primario, degradé, lienzo teñido, tarjetas, sombras) para claro y
// oscuro. Los semánticos (turquesa = entra, coral = sale, rojo = peligro) no
// cambian nunca: el color de la app personaliza la marca, no el significado.
//
// El CSS resultante se guarda en localStorage y un script en index.html lo
// inyecta antes del primer pintado, así no hay destello del color por defecto.

export const ACCENT_KEY = 'splitit_accent';
export const ACCENT_CSS_KEY = 'splitit_accent_css';
export const STYLE_ID = 'accent-style';

export const ACCENT_PRESETS = [
    { id: 'violet', label: 'Violeta', hex: '#5b2ee5' },
    { id: 'ocean', label: 'Océano', hex: '#1f6fe5' },
    { id: 'fuchsia', label: 'Fucsia', hex: '#d6338a' },
    { id: 'forest', label: 'Bosque', hex: '#2f7d4f' },
    { id: 'graphite', label: 'Grafito', hex: '#3c3f58' },
];
export const DEFAULT_ACCENT = ACCENT_PRESETS[0].hex;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

const hexToHsl = (hex) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return null;
    const n = parseInt(m[1], 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0;
    let s = 0;
    if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    return { h, s: s * 100, l: l * 100 };
};

const hsl = (h, s, l, a) => `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%${a !== undefined ? ` / ${a}` : ''})`;

// hsl -> "r g b" para sombras (rgb(var(--shadow-rgb) / .3))
const hslToRgbTriplet = (h, s, l) => {
    const sat = s / 100;
    const lig = l / 100;
    const k = (n) => (n + h / 30) % 12;
    const a = sat * Math.min(lig, 1 - lig);
    const f = (n) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)).join(' ');
};

export const isValidHex = (hex) => /^#[0-9a-f]{6}$/i.test(hex);

export const buildAccentCss = (hex) => {
    const base = hexToHsl(hex);
    if (!base || hex.toLowerCase() === DEFAULT_ACCENT) return '';
    const { h } = base;
    // Grafito y otros colores casi sin saturación: se respetan, sin forzar color.
    const s = base.s < 12 ? base.s : clamp(base.s, 45, 88);
    // Blanco sobre el primario debe leerse: se limita la luminosidad.
    const l = clamp(base.l, 30, 46);
    const tintS = s < 12 ? 8 : 55;

    const light = [
        ['--primary', hsl(h, s, l)],
        ['--primary-deep', hsl(h, s, l - 12)],
        ['--primary-soft', hsl(h, s, l, 0.1)],
        ['--primary-glow', hsl(h, s, l, 0.38)],
        ['--lilac', hsl(h, s < 12 ? s : 90, 82)],
        ['--periwinkle', hsl(h, s < 12 ? s : 80, 72)],
        ['--grad-hero', `linear-gradient(140deg, ${hsl(h, s, l + 8)} 0%, ${hsl(h, s, l)} 52%, ${hsl(h, s, l - 16)} 100%)`],
        ['--grad-lilac', `linear-gradient(140deg, ${hsl(h, s < 12 ? s : 100, 87)} 0%, ${hsl(h, s < 12 ? s : 90, 76)} 100%)`],
        ['--bg', hsl(h, tintS, 94)],
        ['--bg-2', hsl(h, tintS - 5, 90)],
        ['--card-soft', hsl(h, tintS + 5, 97)],
        ['--card-tint', hsl(h, s < 12 ? s : 100, 95)],
        ['--shadow-rgb', hslToRgbTriplet(h, s < 12 ? s : 60, 38)],
        ['--sheet-bg', hsl(h, tintS, 94, 0.92)],
        ['--fill-2', hsl(h, s, l, 0.12)],
    ];
    const dark = [
        ['--primary', hsl(h, s, 72)],
        ['--primary-deep', hsl(h, s, l)],
        ['--primary-soft', hsl(h, s, 72, 0.2)],
        ['--primary-glow', hsl(h, s, 72, 0.5)],
        ['--lilac', hsl(h, s < 12 ? s : 90, 82)],
        ['--grad-hero', `linear-gradient(140deg, ${hsl(h, s, l + 8)} 0%, ${hsl(h, s, l)} 52%, ${hsl(h, s, l - 16)} 100%)`],
        ['--bg', hsl(h, s < 12 ? 10 : 58, 8)],
        ['--bg-2', hsl(h, s < 12 ? 10 : 55, 12)],
        ['--card', hsl(h, s < 12 ? 10 : 52, 15)],
        ['--card-soft', hsl(h, s < 12 ? 10 : 45, 21)],
        ['--card-tint', hsl(h, s < 12 ? 10 : 45, 26)],
        ['--shadow-rgb', '0 0 0'],
        ['--sheet-bg', hsl(h, s < 12 ? 10 : 58, 8, 0.92)],
        ['--material', hsl(h, s < 12 ? 10 : 52, 15, 0.8)],
        ['--glass-bg', hsl(h, s < 12 ? 10 : 48, 20, 0.56)],
        ['--glass-bg-strong', hsl(h, s < 12 ? 10 : 45, 26, 0.78)],
        ['--fill-2', hsl(h, s, 72, 0.22)],
    ];
    const block = (sel, rows) => `${sel}{${rows.map(([k, v]) => `${k}:${v}`).join(';')}}`;
    return block(":root[data-accent][data-theme='light']", light) + block(":root[data-accent][data-theme='dark']", dark);
};

// Aplica (o quita) el color en el documento y lo recuerda en este dispositivo.
export const applyAccent = (hex) => {
    const css = isValidHex(hex) ? buildAccentCss(hex) : '';
    let el = document.getElementById(STYLE_ID);
    if (!el) {
        el = document.createElement('style');
        el.id = STYLE_ID;
        document.head.appendChild(el);
    }
    el.textContent = css;
    document.documentElement.toggleAttribute('data-accent', css !== '');
    try {
        localStorage.setItem(ACCENT_KEY, css ? hex : DEFAULT_ACCENT);
        localStorage.setItem(ACCENT_CSS_KEY, css);
    } catch { /* modo privado: el color vale para esta sesión */ }
};

export const readAccent = () => {
    try { return localStorage.getItem(ACCENT_KEY) || DEFAULT_ACCENT; } catch { return DEFAULT_ACCENT; }
};
