---
target: Cuentas (AccountsView)
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:E:\\Proyectos y repos\\split-it-front\\src\\components\\AccountsView.jsx"
target_fingerprint: "sha256:f1c459108c2795f27242fdfad7c99725a0d91d8c51b664196d3dac45a71da72f"
target_path: "E:\\Proyectos y repos\\split-it-front\\src\\components\\AccountsView.jsx"
timestamp: 2026-10-02T01-11-14Z
slug: src-components-accountsview-jsx
---
# Critica de Cuentas (dual-agent)

Method: dual-agent (A: a0524f6abdfeea1e3 | B: adf90d24363eeb31e). Overlay disponible, servidor detenido.
Score: 22/40. Heuristicas: 1=2, 2=3, 3=1, 4=2, 5=2, 6=3, 7=2, 8=3, 9=1, 10=3.
Detector: AccountsView/LedgerSheets/ledgerConfig/ProgressBar 0 hallazgos; index.css 25 (3 bounce sancionados, 22 deriva). Cifras coinciden con la API.

## Problemas
- [P0] Etiquetas de las fichas 1.4-2.6:1 (blanco sobre degradado) y monto inactivo 3.2:1 por opacidad. Comando: colorize.
- [P0] Registrar abono con un toque: monto prellenado con el saldo completo, sin confirmar ni deshacer. Comando: harden.
- [P1] Carga y error muestran $0 y vacio falso; sin Reintentar. Comando: harden.
- [P1] Neto ambiguo, frase de un segmento junto al neto, sin enmarcar. Comando: clarify.
- [P2] Sin accion de agregar visible; doble primario en vacio; escritorio de una columna. Comando: layout.
- [P2] Saldadas por opacidad, sin tope ni total. Comando: polish.
- [P3] Abonado verde en deuda; campo de abono sin etiqueta; barra sin semantica; placeholder 1.65:1; montos largos recortados; reduced-motion de fichas. Comando: audit.
