# Split.it Frontend

Frontend de Split.it, una app para gestionar gastos compartidos, amigos y solicitudes entre usuarios autenticados.

## Tecnologías

- React 19
- Vite
- Tailwind CSS v4
- Lucide React

## Funcionalidades

- Inicio de sesión y registro de usuarios.
- Dashboard con balance, actividad y gastos.
- Creación de gastos compartidos.
- Búsqueda y selección de participantes por usuario, correo o teléfono.
- Lista de amigos del usuario autenticado.
- Solicitudes de amistad pendientes y aceptación desde la interfaz.
- Modales y paneles flotantes integrados con la UI principal.

## Requisitos

- Node.js 18 o superior.
- La API de backend disponible y accesible desde el frontend.

## Instalación

```bash
npm install
```

## Scripts disponibles

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Desarrollo

Levanta el proyecto en modo desarrollo con:

```bash
npm run dev
```

Luego abre la URL que muestra Vite en el navegador.

## API

Este frontend consume la API de Split.it en:

```text
https://expense-tracker-api-0762.onrender.com
```

La documentación de los endpoints del backend está en el archivo `ENDPOINTS.md`.

## Estructura general

- `src/components/`: componentes de la interfaz.
- `src/utils/`: utilidades compartidas.
- `src/App.jsx`: orquestación principal de vistas, datos y navegación.
- `src/main.jsx`: punto de entrada de React.

## Notas

- El registro de usuario usa campos extendidos como `username`, `first_name`, `last_name` y `phone`.
- Los campos opcionales del registro y perfil se manejan desde la interfaz según el contrato definido en `ENDPOINTS.md`.
