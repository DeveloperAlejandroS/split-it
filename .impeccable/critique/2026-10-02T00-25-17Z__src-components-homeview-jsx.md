---
target: Inicio (HomeView) segunda ronda dual-agent
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:E:\\Proyectos y repos\\split-it-front\\src\\components\\HomeView.jsx"
target_fingerprint: "sha256:12491fef9a5184f4f3332c78f996960f7ab11161d0c361a45162f29846d34c60"
target_path: "E:\\Proyectos y repos\\split-it-front\\src\\components\\HomeView.jsx"
timestamp: 2026-10-02T00-25-17Z
slug: src-components-homeview-jsx
---
# Critica de Inicio, segunda ronda (dual-agent)

Method: dual-agent (A: abb35d48ebe1ce0a8 | B: a8a82bc3140582ab0). A termino antes de que el detector entrara en la sintesis. Superposicion en navegador: disponible (puerto 8400, detenido).

Score: 25/40. Heuristicas: 1=3, 2=3, 3=3, 4=2, 5=3, 6=2, 7=2, 8=2, 9=3, 10=2.

## Detector
HomeView.jsx e index.html: 0 hallazgos. index.css: 25 (3 bounce-easing, 19 design-system-color, 3 design-system-font-size). Sin config: solo los 3 de rebote. Falsos positivos: swatch conico, #000 de mascara, borde de tabbar, 1.1:1 sobre degradados.

## Problemas prioritarios
- [P1] Dos tableros de igual peso sin relacion visible (hero violeta + fichas teal/coral). Comando: quieter / layout.
- [P1] Atencion enterrada; primera tarjeta violeta rompe The One Voice Rule. Comando: layout, clarify.
- [P1] Contraste real: avatar AS 3.07:1; Salio y correo 4.46:1; texto blanco sobre degradado ~4.3-4.4 en tramo claro. Comando: polish, colorize.
- [P2] Feed mezcla semanticas (cuenta abierta vs movimiento de caja); Debes->Gastos, Te deben->Cuentas. Comando: clarify.
- [P2] Escritorio desbalanceado 560 vs 828px. Comando: layout.
- [P3] Sin personas: el cuaderno compartido no aparece. Comando: delight.

## Observaciones menores
Dona "Salio" incluye Ahorros; Ver mas necesita 44px inline; title unico; sin skip link; 27 SVG sin aria-hidden.
