import { NAV_TABS } from './nav';

// Barra de pestañas inferior (móvil/tablet). Material translúcido con el
// contenido deslizándose por debajo; etiquetas siempre visibles (un ícono
// sin nombre obliga a adivinar); la pestaña activa se tinta.
export const TabBar = ({ activeTab, onChange, badges = {} }) => (
    <nav
        aria-label="Navegación principal"
        className="xl:hidden fixed inset-x-0 bottom-0 z-50 material border-t"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
        <ul className="mx-auto flex max-w-xl items-stretch justify-around px-1">
            {NAV_TABS.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                const badge = badges[id];
                return (
                    <li key={id} className="flex-1">
                        <button
                            type="button"
                            onClick={() => onChange(id)}
                            aria-current={active ? 'page' : undefined}
                            className="relative flex w-full flex-col items-center gap-0.5 pt-2 pb-1.5 transition-transform active:scale-95"
                            style={{ color: active ? 'var(--accent)' : 'var(--text-muted)', transitionDuration: '120ms' }}
                        >
                            <span className="relative">
                                <Icon
                                    size={25}
                                    strokeWidth={active ? 2.4 : 1.9}
                                    style={{ transition: 'transform 260ms var(--ease-ios)', transform: active ? 'scale(1.06)' : 'scale(1)' }}
                                />
                                {badge > 0 && (
                                    <span
                                        className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                                        style={{ background: 'var(--danger)' }}
                                    >
                                        {badge}
                                    </span>
                                )}
                            </span>
                            <span className="text-[10px] font-medium leading-tight" style={{ letterSpacing: 0.1 }}>{label}</span>
                        </button>
                    </li>
                );
            })}
        </ul>
    </nav>
);
