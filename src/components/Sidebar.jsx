import { Plus } from '@phosphor-icons/react';
import { NAV_TABS } from './nav';
import { Avatar } from './ui/Avatar';
import { Logo } from './ui/Logo';

// Barra lateral de escritorio: tarjeta flotante sobre el lienzo, con el
// botón de agregar arriba (en móvil vive al centro de la barra inferior).
export const Sidebar = ({ activeTab, onChange, badges = {}, userName, userEmail, onOpenAccount, onAdd, addLabel }) => (
    <aside className="hidden xl:flex fixed bottom-4 left-4 top-4 z-40 w-60 flex-col card p-4">
        <div className="flex items-center gap-3 px-2 pb-5 pt-1">
            <Logo size={38} />
            <span className="title">Split.it</span>
        </div>

        <button type="button" onClick={onAdd} className="btn btn-primary btn-block mb-4">
            <Plus size={18} weight="bold" />
            {addLabel}
        </button>

        <nav aria-label="Navegación principal" className="flex flex-col gap-1.5">
            {NAV_TABS.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onChange(id)}
                        aria-current={active ? 'page' : undefined}
                        className="flex h-11 items-center gap-3 rounded-full px-4 text-left transition-all active:scale-[0.98]"
                        style={{
                            background: active ? 'var(--card-tint)' : 'transparent',
                            color: active ? 'var(--primary)' : 'var(--ink-2)',
                            fontWeight: active ? 700 : 500,
                            fontSize: 15,
                        }}
                    >
                        <Icon size={22} weight={active ? 'fill' : 'regular'} />
                        <span className="flex-1">{label}</span>
                        {badges[id] > 0 && <span className="chip" style={{ background: 'var(--neg-bright)', color: '#fff', height: 22, padding: '0 8px' }}>{badges[id]}</span>}
                    </button>
                );
            })}
        </nav>

        <button type="button" onClick={onOpenAccount} className="mt-auto flex items-center gap-3 rounded-[20px] p-2 text-left transition-colors hover:bg-(--card-soft) active:scale-[0.98]">
            <Avatar name={userName} size={40} />
            <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold">{userName}</span>
                <span className="block truncate tiny">{userEmail}</span>
            </span>
        </button>
    </aside>
);
