import { Plus } from '@phosphor-icons/react';
import { BAR_TABS } from './nav';

// Barra inferior: cuatro destinos y, al centro, el botón de agregar
// elevado dentro de una muesca. El botón sabe qué agregar según la
// pantalla (la etiqueta lo dice para lectores de pantalla).
export const TabBar = ({ activeTab, onChange, onAdd, addLabel }) => {
    const [first, second, third, fourth] = BAR_TABS;

    const renderTab = (tab) => {
        const { id, label, icon: Icon } = tab;
        const active = activeTab === id;
        return (
            <button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                aria-current={active ? 'page' : undefined}
                className="relative flex flex-col items-center gap-1 pb-1 pt-3 transition-transform active:scale-90"
                style={{ color: active ? 'var(--primary)' : 'var(--ink-3)', transitionDuration: '140ms' }}
            >
                <Icon size={26} weight={active ? 'fill' : 'regular'} style={{ transition: 'transform 320ms var(--spring)', transform: active ? 'translateY(-2px) scale(1.08)' : 'none' }} />
                <span className="text-[11px] font-semibold leading-none">{label}</span>
                <span
                    aria-hidden="true"
                    className="absolute bottom-0 h-[3px] rounded-full"
                    style={{ width: active ? 18 : 0, background: 'var(--primary)', transition: 'width 320ms var(--spring)' }}
                />
            </button>
        );
    };

    return (
        <nav aria-label="Navegación principal" className="xl:hidden fixed inset-x-0 bottom-0 z-50" style={{ paddingBottom: 'var(--safe-bottom)' }}>
            <div className="tabbar mx-auto grid max-w-xl grid-cols-5 items-end px-2" style={{ paddingBottom: 6 }}>
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
                className="absolute left-1/2 flex h-[62px] w-[62px] -translate-x-1/2 items-center justify-center rounded-full text-white transition-transform active:scale-90"
                style={{
                    top: -26,
                    background: 'var(--grad-hero)',
                    boxShadow: '0 16px 28px -8px var(--primary-glow)',
                    transitionDuration: '160ms',
                }}
            >
                <Plus size={28} weight="bold" />
            </button>
        </nav>
    );
};
