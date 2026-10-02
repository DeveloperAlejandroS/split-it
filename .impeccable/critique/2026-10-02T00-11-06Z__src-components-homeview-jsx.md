---
target: Inicio (HomeView)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:E:\\Proyectos y repos\\split-it-front\\src\\components\\HomeView.jsx"
target_fingerprint: "sha256:79ed51b4bcfafbf7a6a0dd6f04382f2899f5c433c9e5f2012011362fd46331fb"
target_path: "E:\\Proyectos y repos\\split-it-front\\src\\components\\HomeView.jsx"
timestamp: 2026-10-02T00-11-06Z
slug: src-components-homeview-jsx
---
# Critica de Inicio (HomeView.jsx)

Method: DEGRADED single-context (no sub-agents; A before B)

Score: 28/40 (Bueno). Heuristicas: 1=3, 2=3, 3=3, 4=3, 5=3, 6=3, 7=3, 8=3, 9=2, 10=2.

## Veredicto de especificidad
Identidad propia en detalles (turquesa/coral con significado fijo, cifra "Lo que tienes", deuda no es plata hasta que se paga); composicion de panel fintech estandar. Detector: 33 avisos de deriva respecto a DESIGN.md (22 colores, 6 tamanos de letra, 3 easings con rebote, 2 radios).

## Problemas prioritarios
- [P1] Fallos silenciosos muestran dinero equivocado (Home traga errores de red; caja 0 sin aviso). Fix: conservar ultimos valores, aviso con reintento, esqueleto. Comando: harden.
- [P1] La cifra principal no se explica (que cuenta y que no). Fix: linea fija o detalle. Comando: clarify.
- [P2] Colores de la dona fijos (#5b2ee5, #a595ff) ignoran el color de la app. Fix: usar variables. Comando: colorize.
- [P2] Amigos solo como icono en encabezado movil. Fix: acceso etiquetado / onboarding. Comando: onboard.
- [P2] Escritorio usa 768px de 1440px. Fix: dos columnas desde 1280px. Comando: layout.

## Personas
Casey: Amigos y avatar fuera del alcance del pulgar; "Ver mas" 36px. Jordan: sin guia en cuenta vacia. Sam: foco y etiquetas bien; dona sin alternativa textual verificada.

## Observaciones menores
"Ver mas" a 36px; sombras de fichas duplican tokens; "Salio" 12px en ink-3.
