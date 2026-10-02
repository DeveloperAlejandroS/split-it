// Barra de progreso con relleno que crece desde 0 al montarse.
const TONES = {
    primary: 'var(--grad-hero)',
    pos: 'var(--grad-teal)',
    neg: 'var(--grad-coral)',
    soft: 'var(--lilac)',
};

export const ProgressBar = ({ pct, tone = 'primary', height = 8, track = 'var(--card-soft)', label }) => {
    const value = Math.max(0, Math.min(100, pct));
    return (
        <div className="w-full overflow-hidden rounded-full" style={{ height, background: track }} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
            {/* El relleno mide siempre el 100 % y se recorta: animar `clip-path` no recalcula el layout como animar `width`. */}
            <div
                className="bar-fill h-full w-full rounded-full"
                style={{ clipPath: `inset(0 ${100 - value}% 0 0 round 999px)`, background: TONES[tone] || tone, transition: 'clip-path 700ms var(--ease-ios)' }}
            />
        </div>
    );
};
