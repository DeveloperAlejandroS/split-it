---
target: Gastos (ExpensesView)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:E:\\Proyectos y repos\\split-it-front\\src\\components\\ExpensesView.jsx"
target_fingerprint: "sha256:0d7dabd9185e6b5b17314df739b222f68618d7d779ec3ccdbb28e343e07b01c4"
target_path: "E:\\Proyectos y repos\\split-it-front\\src\\components\\ExpensesView.jsx"
timestamp: 2026-10-02T00-46-34Z
slug: src-components-expensesview-jsx
---
# Critica de Gastos (dual-agent)

Method: dual-agent (A: ab3588f5eeb7b51c8 | B: a77aff62d23fec9fc). Overlay disponible, servidor detenido.
Score: 24/40. Heuristicas: 1=2, 2=3, 3=2, 4=2, 5=3, 6=3, 7=2, 8=2, 9=2, 10=3.
Detector: ExpensesView/ExpenseDetailSheet/CreateExpenseSheet 0 hallazgos; index.css 25 (3 bounce sancionados, 22 deriva).

## Problemas
- [P1] Pago por confirmar invisible en la lista (ExpenseRow ignora stake.awaiting). Comando: clarify.
- [P1] Neto del hero se lee como plata en mano; etiquetas a 0.8. Comando: quieter + clarify.
- [P2] Libro mayor bajo tres capas (primera fila a y=644 en movil). Comando: layout.
- [P2] Tarjetas de amigo sin direccion ni nombre accesible. Comando: audit.
- [P3] Filtros: vacio filtrado sin salida, saldados sin tope, opacity 0.85 baja contraste. Comando: distill.
- [P3] Hoja de detalle: bruto primero, botones 36px, Eliminar 3.09:1, Te deben 4.04:1. Comando: adapt.
- [Defecto] Foco no vuelve al abrir la hoja Crear gasto (cae en BODY).
- [Menor] Chips 11px/22px, filtros 38px, Cerrar/Cancelar 40px.
