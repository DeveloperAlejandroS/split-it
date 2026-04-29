export const GlassCard = ({
    children,
    className = '',
    theme = 'dark'
}) => {
    // Use CSS variables so both dark and light themes render correctly.
    // Previously the light variant hardcoded `text-slate-900` which clashed
    // with components that rely on `text-primary` / `text-secondary` vars.
    return (
        <div
            className={`glass-shell rounded-3xl backdrop-blur-lg ${className}`}
            style={{
                background: theme === 'light' ? 'rgba(255,255,255,0.45)' : 'rgba(15,15,25,0.60)',
                border: theme === 'light' ? '1px solid rgba(255,255,255,0.55)' : '1px solid rgba(255,255,255,0.09)',
                color: 'var(--text-primary)',
            }}
        >
            {children}
        </div>
    );
};
