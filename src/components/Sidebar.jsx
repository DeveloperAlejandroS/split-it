import { Plus } from '@phosphor-icons/react';
import { NAV_TABS } from './nav';
import { Avatar } from './ui/Avatar';
import { Logo } from './ui/Logo';

// Alto de cada enlace + separación: la pastilla activa se desplaza en
// múltiplos de este paso.
const LINK_HEIGHT = 44;
const LINK_GAP = 6;

// Barra lateral de escritorio: tarjeta flotante sobre el lienzo, con el
// botón de agregar arriba (en móvil vive al centro de la barra inferior).
// Los atajos de teclado (N, 1–5) se muestran al pasar el mouse por la barra.
export const Sidebar = ({ activeTab, onChange, badges = {}, userName, userEmail, userAvatar, onOpenAccount, onAdd, addLabel }) => {
    const activeIndex = NAV_TABS.findIndex((t) => t.id === activeTab);

    return (
        <aside className="sidebar hidden xl:flex fixed bottom-4 left-4 top-4 z-40 w-60 flex-col card p-4">
            <div className="flex items-center gap-3 px-2 pb-5 pt-1">
                <Logo size={38} />
                <span className="title">Split.it</span>
            </div>

            <button type="button" onClick={onAdd} className="btn btn-primary btn-block mb-4">
                <Plus size={18} weight="bold" />
                <span className="flex-1 text-left">{addLabel}</span>
                <kbd className="kbd kbd-on-primary">N</kbd>
            </button>

            <nav aria-label="Navegación principal" className="relative flex flex-col" style={{ gap: LINK_GAP }}>
                <span
                    aria-hidden="true"
                    className="side-pill"
                    style={{
                        height: LINK_HEIGHT,
                        transform: `translateY(${Math.max(activeIndex, 0) * (LINK_HEIGHT + LINK_GAP)}px)`,
                        opacity: activeIndex >= 0 ? 1 : 0,
                    }}
                />
                {NAV_TABS.map(({ id, label, icon: Icon }, i) => {
                    const active = activeTab === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onChange(id)}
                            aria-current={active ? 'page' : undefined}
                            aria-keyshortcuts={String(i + 1)}
                            className="side-link"
                            style={{ height: LINK_HEIGHT }}
                        >
                            <Icon size={22} weight={active ? 'fill' : 'regular'} />
                            <span className="flex-1">{label}</span>
                            {badges[id] > 0 && <span className="chip" style={{ background: 'var(--neg-bright)', color: '#fff', height: 22, padding: '0 8px' }}>{badges[id]}</span>}
                            <kbd className="kbd">{i + 1}</kbd>
                        </button>
                    );
                })}
            </nav>

            <button type="button" onClick={onOpenAccount} className="side-account mt-auto flex items-center gap-3 rounded-[20px] p-2 text-left active:scale-[0.98]">
                <Avatar name={userName} src={userAvatar} size={40} />
                <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold">{userName}</span>
                    <span className="block truncate tiny">{userEmail}</span>
                </span>
            </button>
        </aside>
    );
};
