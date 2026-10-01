// Avatar con iniciales. El color sale de un hash del nombre (paleta de
// colores de sistema de Apple), así una misma persona siempre se ve igual
// en toda la app.
const PALETTE = ['#5b2ee5', '#8d7bff', '#14a7c4', '#ff7a3d', '#3b1bb5', '#a595ff', '#12a594', '#e0558a'];

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

export const Avatar = ({ name, src, size = 40, className = '' }) => (
    <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
        style={{
            width: size,
            height: size,
            fontSize: Math.round(size * 0.38),
            background: PALETTE[hash(String(name || '?')) % PALETTE.length],
            letterSpacing: 0,
            overflow: 'hidden',
        }}
    >
        {src ? <img src={src} alt="" className="h-full w-full rounded-full object-cover" draggable="false" /> : initialsOf(name)}
    </span>
);
