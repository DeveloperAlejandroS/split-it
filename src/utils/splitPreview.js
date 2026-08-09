// Mismo algoritmo de reparto en centavos que usa el backend
// (src/utils/splitCalculator.js en expense-tracker-api), solo para mostrar
// un preview en vivo mientras se completa el formulario. El cálculo
// autoritativo siempre lo hace el backend al crear/editar el gasto.
export const previewEqualSplit = (totalAmount, participantCount) => {
    const total = Number(totalAmount);
    if (!Number.isFinite(total) || total <= 0 || !Number.isInteger(participantCount) || participantCount <= 0) {
        return null;
    }

    const totalCents = Math.round(total * 100);
    const baseCents = Math.floor(totalCents / participantCount);
    const remainderCents = totalCents - baseCents * participantCount;

    return {
        baseAmount: baseCents / 100,
        // Cuántas personas (de las primeras en la lista) reciben 1 centavo extra.
        peopleWithExtraCent: remainderCents,
        extraAmount: (baseCents + 1) / 100,
    };
};

export const sumCustomAmounts = (amounts) =>
    amounts.reduce((sum, amount) => sum + (Number.isFinite(Number(amount)) ? Number(amount) : 0), 0);
