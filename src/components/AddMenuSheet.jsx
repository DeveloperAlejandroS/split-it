import { ArrowsLeftRight, ChartPieSlice, HandCoins, Receipt } from '@phosphor-icons/react';
import { Sheet } from './ui/Sheet';

const OPTIONS = [
    { id: 'expense', icon: Receipt, tile: 'tile-violet', title: 'Gasto compartido', hint: 'Divídelo con tus amigos' },
    { id: 'personal', icon: ChartPieSlice, tile: 'tile-lilac', title: 'Movimiento', hint: 'Ingreso, gasto o ahorro' },
    { id: 'owed', icon: ArrowsLeftRight, tile: 'tile-teal', title: 'Me deben', hint: 'Un préstamo que hiciste' },
    { id: 'owe', icon: HandCoins, tile: 'tile-coral', title: 'Yo debo', hint: 'Una deuda que tienes' },
];

// "+" desde Inicio: cuatro mosaicos de color, uno por cosa que se puede
// registrar. En las demás pantallas el botón ya sabe qué agregar.
export const AddMenuSheet = ({ isOpen, onClose, onPick }) => (
    <Sheet isOpen={isOpen} onClose={onClose} title="¿Qué quieres registrar?">
        <div className="grid grid-cols-2 gap-3 pt-1">
            {OPTIONS.map(({ id, icon: Icon, tile, title, hint }) => (
                <button
                    key={id}
                    type="button"
                    onClick={() => onPick(id)}
                    className={`tile ${tile} flex min-h-[148px] flex-col justify-between p-4 text-left transition-transform active:scale-[0.96]`}
                    style={{ boxShadow: '0 16px 30px -16px rgba(60, 30, 160, 0.5)' }}
                >
                    <span className="bubble h-11 w-11 rounded-full" style={{ background: 'rgba(255,255,255,0.28)' }}>
                        <Icon size={24} weight="fill" />
                    </span>
                    <span>
                        <span className="heading block">{title}</span>
                        <span className="block text-[13px] leading-tight opacity-85">{hint}</span>
                    </span>
                </button>
            ))}
        </div>
    </Sheet>
);
