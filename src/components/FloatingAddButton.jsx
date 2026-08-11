import { Plus } from 'lucide-react';

// Botón de agregar, único y flotante en toda la app -- ya no vive incrustado
// en el rail (desktop) ni en la píldora del dock (mobile). Antes competía
// por espacio junto a la navegación; ahora es su propio elemento, siempre en
// la esquina inferior derecha, con margen real (no pegado al borde) tanto en
// mobile como en desktop. Esto también deja la píldora/rail de navegación
// simétrica, con Inicio como eje central.
export const FloatingAddButton = ({ activeTab, onClick }) => {
    const label = activeTab === 'personal' ? 'Agregar al presupuesto' : activeTab === 'libreta' ? 'Nueva deuda' : 'Nuevo gasto';

    return (
        <button
            type="button"
            onClick={onClick}
            className="fixed z-70 right-5 bottom-[6.5rem] xl:right-8 xl:bottom-8 h-14 w-14 xl:h-16 xl:w-16 rounded-full flex items-center justify-center font-extrabold transition-all active:scale-90 hover:scale-105"
            style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                color: 'var(--accent-contrast)',
                boxShadow: '0 18px 40px -12px rgba(232, 24, 156, 0.6)',
            }}
            aria-label={label}
            title={label}
        >
            <Plus size={24} className="xl:hidden" />
            <Plus size={26} className="hidden xl:block" />
        </button>
    );
};
