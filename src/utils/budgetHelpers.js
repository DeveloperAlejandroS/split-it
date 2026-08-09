export const getCurrentMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const shiftMonthKey = (monthKey, delta) => {
    const [year, month] = monthKey.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const monthKeyToLabel = (monthKey) => {
    const [year, month] = monthKey.split('-').map(Number);
    const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('es-CL', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
};

// `higherActualIsGood`: en Ingresos y Ahorros, gastar/juntar más de lo
// planeado es bueno (verde). En Gastos y Deudas, es al revés: pasarte del
// presupuesto es la señal de alerta (rojo). Se usa para pintar la
// diferencia Presupuestado vs Actual con el color correcto en cada fila.
export const SECTION_META = {
    income: {
        label: 'Ingresos',
        addLabel: 'Nombre del ingreso (ej. Sueldo)',
        description: 'Dinero que entra este mes: sueldo, pagos extra, préstamos que te hacen.',
        higherActualIsGood: true,
    },
    fixed_expense: {
        label: 'Gastos Fijos',
        addLabel: 'Nombre del gasto fijo (ej. Arriendo)',
        description: 'Gastos que se repiten todos los meses: arriendo, servicios, cuotas.',
        allowSavingsLink: true,
        higherActualIsGood: false,
    },
    tracked_expense: {
        label: 'Seguimiento de Gastos',
        addLabel: 'Nombre del gasto (ej. Almuerzo)',
        description: 'Gastos variables del día a día: comida, salidas, transporte.',
        allowSavingsLink: true,
        higherActualIsGood: false,
    },
    saving: {
        label: 'Ahorros',
        addLabel: 'Nombre del ahorro (ej. Fondo emergencia)',
        description: 'Dinero apartado este mes. Se completa sola con las filas marcadas "→ Ahorros" en Gastos Fijos o Seguimiento.',
        higherActualIsGood: true,
    },
    debt: {
        label: 'Deudas',
        addLabel: 'Nombre de la deuda (ej. Tarjeta)',
        description: 'Pagos que hiciste este mes a deudas que ya tenías (no deudas nuevas).',
        higherActualIsGood: false,
    },
};

// Compara lo Actual contra lo Presupuestado y devuelve cómo mostrarlo:
// null si coinciden (nada que resaltar), o { diff, isGood } con el signo
// correcto según si en esta sección gastar/juntar de más es bueno o malo.
export const getVariance = (section, budgetedAmount, actualAmount) => {
    const diff = actualAmount - budgetedAmount;
    if (diff === 0) return null;

    const meta = SECTION_META[section];
    const isGood = meta?.higherActualIsGood ? diff > 0 : diff < 0;

    return { diff, isGood };
};
