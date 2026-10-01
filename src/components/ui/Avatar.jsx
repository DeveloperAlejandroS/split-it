// Avatar con iniciales. El color sale de un hash del nombre (paleta de
// colores de sistema de Apple), así una misma persona siempre se ve igual
// en toda la app.
const PALETTE = ['#ff9500', '#34c759', '#00b5c8', '#5856d6', '#af52de', '#ff2d55', '#ff6b35', '#0a84ff'];

const hash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
};

const initialsOf = (name) => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const Avatar = ({ name, size = 40, className = '' }) => (
    <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
        style={{
            width: size,
            height: size,
            fontSize: Math.round(size * 0.38),
            background: PALETTE[hash(String(name || '?')) % PALETTE.length],
            letterSpacing: 0,
        }}
    >
        {initialsOf(name)}
    </span>
);
