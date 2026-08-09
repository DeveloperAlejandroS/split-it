// Utilidades de marca — acento "brass" (dorado envejecido) sobre base espresso.
// Reemplaza al antiguo esquema violeta. Usa CSS vars (definidas en index.css)
// en vez de colores Tailwind fijos, así ambos temas (claro/oscuro) heredan
// el valor correcto automáticamente.
export const brandPalette = {
    brandIcon: 'bg-gradient-to-br from-(--accent) to-(--accent-strong) shadow-[0_0_20px_rgba(212,162,78,0.35)]',
    mainButton: 'bg-gradient-to-br from-(--accent) to-(--accent-strong) shadow-[0_15px_35px_rgba(212,162,78,0.3)] border-(--accent)/20 hover:shadow-[0_15px_35px_rgba(212,162,78,0.5)]',
    islandShell: 'border-(--surface-border) bg-(--surface-strong) shadow-[0_20px_35px_rgba(212,162,78,0.14)]',
    quickSettings: 'bg-white/5 border-white/10 text-(--accent) hover:bg-white/10',
    selection: 'selection:bg-(--accent)/30',
    orbPrimary: 'bg-(--accent)/16',
    orbSecondary: 'bg-(--info)/10',
};
