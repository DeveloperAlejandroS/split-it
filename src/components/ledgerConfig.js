// Dos libros espejo: "Me deben" (/libreta) y "Debo" (/debts). Misma forma de
// datos, mismo flujo, distinto sentido del dinero -- por eso comparten UI.
export const LEDGER = {
    owed: {
        base: '/libreta',
        nameKey: 'debtor_name',
        addTitle: 'Alguien me debe',
        nameLabel: '¿Quién te debe?',
        namePlaceholder: 'Nombre',
        paidVerb: 'te pagó',
        abonoTitle: 'Registrar abono',
        abonoCta: 'Registrar abono',
        effect: 'Al registrar un abono, entra como ingreso en tu presupuesto de este mes.',
        confirmEffect: (amount) => `Entran ${amount} como ingreso en tu presupuesto de este mes.`,
        createEffect: 'Anotarlo aquí no mueve tu presupuesto: solo cuenta cuando te paguen.',
    },
    owe: {
        base: '/debts',
        nameKey: 'creditor_name',
        addTitle: 'Yo debo',
        nameLabel: '¿A quién le debes?',
        namePlaceholder: 'Nombre o entidad',
        paidVerb: 'le pagaste',
        abonoTitle: 'Registrar pago',
        abonoCta: 'Registrar pago',
        effect: 'Al registrar un pago, sale de tu caja en tu presupuesto de este mes.',
        confirmEffect: (amount) => `Salen ${amount} de tu caja en tu presupuesto de este mes.`,
        createEffect: 'Se suma a lo que debes y puedes ir abonando poco a poco.',
    },
};

