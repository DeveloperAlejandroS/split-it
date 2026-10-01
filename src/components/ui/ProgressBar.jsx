// Barra de progreso con relleno que crece desde 0 al montarse.
const TONES = {
    primary: 'var(--grad-hero)',
    pos: 'var(--grad-teal)',
    neg: 'var(--grad-coral)',
    soft: 'var(--lilac)',
};

export const ProgressBar = ({ pct, tone = 'primary', height = 8, track = 'var(--card-soft)' }) => (
    <div className="w-full overflow-hidden rounded-full" style={{ height, background: track }} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: TONES[tone] || tone, transition: 'width 700ms var(--ease-ios)' }}
        />
    </div>
);
