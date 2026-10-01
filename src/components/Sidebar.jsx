import { Coins } from 'lucide-react';
import { NAV_TABS } from './nav';
import { Avatar } from './ui/Avatar';

// Barra lateral (escritorio, ≥1280px): mismas cinco secciones que la
// TabBar, pero con etiqueta al lado y la cuenta abajo -- en desktop hay
// espacio de sobra, así que nada de íconos mudos.
export const Sidebar = ({ activeTab, onChange, badges = {}, userName, userEmail, onOpenAccount }) => (
    <aside
        className="hidden xl:flex fixed left-0 top-0 z-40 h-full w-64 flex-col material border-r px-3 py-5"
    >
        <div className="flex items-center gap-3 px-3 pb-6">
            <div
                className="flex h-9 w-9 items-center justify-center rounded-[10px]"
                style={{ background: 'linear-gradient(135deg, var(--brand), var(--accent-2))' }}
            >
                <Coins size={18} color="#fff" />
            </div>
            <span className="t-title" style={{ fontSize: 20 }}>Split.it</span>
        </div>

        <nav aria-label="Navegación principal" className="flex flex-col gap-1">
            {NAV_TABS.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                const badge = badges[id];
                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onChange(id)}
                        aria-current={active ? 'page' : undefined}
                        className="flex h-10 items-center gap-3 rounded-[10px] px-3 text-left transition-colors active:scale-[0.98]"
                        style={{
                            background: active ? 'var(--accent-soft)' : 'transparent',
                            color: active ? 'var(--accent)' : 'var(--text-primary)',
                            fontWeight: active ? 600 : 500,
                            fontSize: 15,
                        }}
                    >
                        <Icon size={20} strokeWidth={active ? 2.3 : 1.9} />
                        <span className="flex-1">{label}</span>
                        {badge > 0 && (
                            <span className="rounded-full px-1.5 text-[11px] font-bold text-white" style={{ background: 'var(--danger)' }}>{badge}</span>
                        )}
                    </button>
                );
            })}
        </nav>

        <button
            type="button"
            onClick={onOpenAccount}
            className="mt-auto flex items-center gap-3 rounded-[12px] p-2 text-left transition-colors hover:bg-(--fill) active:scale-[0.98]"
        >
            <Avatar name={userName} size={36} />
            <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold">{userName}</span>
                <span className="block truncate t-caption text-secondary">{userEmail}</span>
            </span>
        </button>
    </aside>
);
