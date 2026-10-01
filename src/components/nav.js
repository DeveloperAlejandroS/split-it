import { House, HandCoins, PieChart, Receipt, Users } from 'lucide-react';

// Cinco destinos, cada uno nombrado por lo que CONTIENE (no por un
// paraguas vago): Inicio, Gastos (gastos compartidos), Presupuesto
// (personal), Cuentas (me deben / debo) y Amigos.
export const NAV_TABS = [
    { id: 'home', label: 'Inicio', icon: House },
    { id: 'expenses', label: 'Gastos', icon: Receipt },
    { id: 'personal', label: 'Presupuesto', icon: PieChart },
    { id: 'accounts', label: 'Cuentas', icon: HandCoins },
    { id: 'friends', label: 'Amigos', icon: Users },
];
