import { ChevronRight, HandCoins, PieChart, Receipt, UserRound } from 'lucide-react';
import { Sheet } from './ui/Sheet';

const OPTIONS = [
    { id: 'expense', icon: Receipt, color: '#af52de', title: 'Gasto compartido', hint: 'Divídelo con tus amigos' },
    { id: 'personal', icon: PieChart, color: '#34c759', title: 'Movimiento personal', hint: 'Ingreso, gasto, ahorro' },
    { id: 'owed', icon: UserRound, color: '#0a84ff', title: 'Alguien me debe', hint: 'Un préstamo que hiciste' },
    { id: 'owe', icon: HandCoins, color: '#ff9500', title: 'Yo debo', hint: 'Una deuda que tienes' },
];

// "+" desde Inicio: un solo punto de entrada que pregunta qué quieres
// registrar. En las demás pantallas el "+" ya sabe qué agregar (gasto en
// Gastos, movimiento en Presupuesto...), así no cambia de significado a
// escondidas.
export const AddMenuSheet = ({ isOpen, onClose, onPick }) => (
    <Sheet isOpen={isOpen} onClose={onClose} title="Agregar">
        <div className="ios-group">
            {OPTIONS.map(({ id, icon: Icon, color, title, hint }) => (
                <button key={id} type="button" className="ios-row" onClick={() => onPick(id)}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]" style={{ background: color }}>
                        <Icon size={19} color="#fff" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="t-body block font-medium">{title}</span>
                        <span className="t-footnote block text-secondary">{hint}</span>
                    </span>
                    <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                </button>
            ))}
        </div>
    </Sheet>
);
