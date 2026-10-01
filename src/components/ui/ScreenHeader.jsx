// Encabezado de pantalla: saludo o categoría chiquita, título grande en
// Outfit y acciones en botones redondos (como en las referencias). No es
// sticky: el contenido manda; la navegación ya está abajo.
export const ScreenHeader = ({ kicker, title, subtitle, leading, actions }) => (
    <header className="flex items-start justify-between gap-3 pb-5" style={{ paddingTop: 'max(14px, var(--safe-top))' }}>
        <div className="flex min-w-0 items-center gap-3">
            {leading}
            <div className="min-w-0">
                {kicker && <p className="small">{kicker}</p>}
                <h1 className="display-1 truncate">{title}</h1>
                {subtitle && <p className="small mt-1">{subtitle}</p>}
            </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">{actions}</div>
    </header>
);

// Botón redondo de la barra superior. `tint` = acción principal (degradé).
export const NavAction = ({ label, onClick, children, tint = false, badge = 0 }) => (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={`btn btn-icon relative ${tint ? 'is-tint' : 'glass glass-interactive'}`}>
        {children}
        {badge > 0 && (
            <span
                className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ background: 'var(--neg-bright)' }}
            >
                {badge}
            </span>
        )}
    </button>
);
