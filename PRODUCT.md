# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Jóvenes y grupos de amigos en Colombia que comparten gastos del día a día (salidas, mercado, transporte) y quieren llevar su plata personal en el mismo lugar. Lo usan sobre todo desde el celular, muchas veces de pie y con prisa, justo después de pagar algo, y también desde el computador para revisar cuentas con calma. Cada persona tiene su propia cuenta; los amigos se encuentran por usuario, correo o teléfono.

## Product Purpose

Split.it permite dividir gastos con amigos y saber en cada momento quién le debe a quién, y a la vez llevar un presupuesto personal (ingresos, gastos fijos y del día a día, ahorros y deudas). El éxito es que una persona registre un gasto en segundos, que el otro lo vea al instante, y que ambas entiendan sus números sin hacer cuentas a mano.

## Positioning

Gastos compartidos y presupuesto personal en una sola app, hechos para Colombia. Donde otras apps de gastos compartidos solo cuentan quién debe a quién, Split.it conecta eso con la plata propia: lo que te deben no cuenta como ingreso hasta que te lo pagan, y la cifra principal es lo que realmente tienes. Pensada para pesos colombianos y para hablarle a la persona de tú.

## Operating Context

- Uso móvil primero, instalable como PWA (Agregar a inicio en iPhone, Instalar en Android), y también en escritorio con mouse y teclado.
- Los cambios hechos por otra persona (un gasto que te incluye, una solicitud de amistad) llegan en tiempo real y por notificación push.
- Un gasto compartido pasa por estados: pendiente, pago reportado por quien debe, y confirmado por quien pagó.
- Las deudas y préstamos con personas que no usan la app viven aparte, en Cuentas (Me deben / Debo), con abonos parciales.
- Backend propio (Express + Postgres en Supabase, desplegado en Render); frontend en Vercel.

## Capabilities and Constraints

- Gastos compartidos con reparto igual o personalizado, participantes elegidos entre amigos, reporte y confirmación de pagos.
- Presupuesto mensual por secciones (ingresos, gastos fijos, gastos del día a día, ahorros, deudas) con saldos que se heredan de un mes al siguiente.
- Amigos: solicitudes, aceptar o rechazar, eliminar (la relación se quita para los dos).
- Ajustes: perfil con foto, contraseña, tema (automático, claro, oscuro) y color de la app.
- Contabilidad de caja: nada cuenta como dinero propio hasta que se paga de verdad.
- Interfaz en español, montos en pesos colombianos sin decimales (observado en el código, no declarado como compromiso de marca).
- Debe funcionar bien en móvil y en escritorio.

## Brand Commitments

Nombre: Split.it. Los colores de significado (verde azulado = te deben, naranja = debes) y el color de la app personalizable son decisiones tomadas en el código; el usuario no las declaró como compromisos vinculantes para trabajo futuro.

## Evidence on Hand

- Un producto funcionando en producción (frontend en https://split-it-cyan.vercel.app) con datos reales del propietario y datos demo (usuarios alejo, diana, camilo).
- No hay testimonios, métricas de uso, precios ni casos de estudio; trabajo futuro no debe inventarlos.
- Imágenes de inspiración usadas en el rediseño: `E:\Downloads\Inspo Split-it`.

## Product Principles

1. Lo que importa es tu posición, no el total: mostrar lo que debes o te deben a ti, no el monto bruto del gasto.
2. Una deuda no es plata hasta que se paga: separar siempre lo que se tiene de lo que se espera.
3. Registrar es lo más frecuente: agregar un gasto debe tomar segundos y no requerir pensar.
4. Los números deben poder leerse de un vistazo, con signo y significado claros.
5. Lo que cambia por otra persona aparece sin recargar ni preguntar.

## Accessibility & Inclusion

Contraste legible sobre fondos de color, respeto de `prefers-reduced-motion` y `prefers-reduced-transparency`, objetivos táctiles cómodos en móvil y manejo completo por teclado en escritorio.
