import { ChartPieSlice, HandCoins, House, Receipt, UsersThree } from '@phosphor-icons/react';

// Destinos nombrados por lo que CONTIENEN. En móvil la barra muestra los
// cuatro primeros y el botón central de agregar; Amigos vive en el
// encabezado (con contador de solicitudes) y en la barra lateral de escritorio.
export const NAV_TABS = [
    { id: 'home', label: 'Inicio', icon: House },
    { id: 'expenses', label: 'Gastos', icon: Receipt },
    { id: 'personal', label: 'Presupuesto', icon: ChartPieSlice },
    { id: 'accounts', label: 'Cuentas', icon: HandCoins },
    { id: 'friends', label: 'Amigos', icon: UsersThree },
];

export const BAR_TABS = NAV_TABS.filter((t) => t.id !== 'friends');
