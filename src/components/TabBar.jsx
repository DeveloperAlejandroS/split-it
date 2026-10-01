import { Plus } from '@phosphor-icons/react';
import { BAR_TABS } from './nav';

// Barra inferior flotante de vidrio (cápsula separada de los bordes, como la
// de iOS 26): cuatro destinos y, al centro, el botón de agregar elevado. Una
// "lente" se desliza bajo la pestaña activa. El botón sabe qué agregar según
// la pantalla (la etiqueta lo dice para lectores de pantalla).
// Columnas: 0, 1 = izquierda; 2 = hueco del botón; 3, 4 = derecha.
const COLUMN_OF = [0, 1, 3, 4];

export const TabBar = ({ activeTab, onChange, onAdd, addLabel }) => {
    const activeIndex = BAR_TABS.findIndex((t) => t.id === activeTab);
    const column = activeIndex >= 0 ? COLUMN_OF[activeIndex] : -1;

    const renderTab = (tab) => {
        const { id, label, icon: Icon } = tab;
        const active = activeTab === id;
        return (
            <button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                aria-current={active ? 'page' : undefined}
                className="relative z-10 flex flex-col items-center justify-center gap-1 py-2 transition-transform active:scale-90"
                style={{ color: active ? 'var(--primary)' : 'var(--ink-2)', transitionDuration: '140ms' }}
            >
                <Icon size={25} weight={active ? 'fill' : 'regular'} style={{ transition: 'transform 360ms var(--spring)', transform: active ? 'translateY(-1px) scale(1.08)' : 'none' }} />
                <span className="text-[11px] font-semibold leading-none">{label}</span>
            </button>
        );
    };

    const [first, second, third, fourth] = BAR_TABS;

    return (
        <nav
            aria-label="Navegación principal"
            className="xl:hidden fixed inset-x-0 bottom-0 z-50 px-4"
            style={{ paddingBottom: 'max(14px, var(--safe-bottom))' }}
        >
            <div className="relative mx-auto max-w-md">
                <div className="tabbar glass relative grid grid-cols-5 items-stretch px-2 py-1">
                    <span
                        aria-hidden="true"
                        className="tabbar-lens"
                        style={{
                            left: 8,
                            width: 'calc((100% - 16px) / 5)',
                            transform: `translateX(${Math.max(column, 0) * 100}%)`,
                            opacity: column >= 0 ? 1 : 0,
                        }}
                    />
                    {renderTab(first)}
                    {renderTab(second)}
                    <span aria-hidden="true" />
                    {renderTab(third)}
                    {renderTab(fourth)}
                </div>
                <button
                    type="button"
                    onClick={onAdd}
                    aria-label={addLabel}
                    title={addLabel}
                    className="absolute left-1/2 top-0 z-20 flex h-[60px] w-[60px] -translate-x-1/2 -translate-y-[34%] items-center justify-center rounded-full text-white transition-transform active:scale-90"
                    style={{
                        background: 'var(--grad-hero)',
                        color: '#fff',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 0 0 1px rgba(255,255,255,0.18), 0 16px 28px -8px var(--primary-glow)',
                        transitionDuration: '160ms',
                    }}
                >
                    <Plus size={28} weight="bold" />
                </button>
            </div>
        </nav>
    );
};
