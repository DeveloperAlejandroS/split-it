# Split.it Frontend

Frontend de Split.it, una aplicación moderna para gestionar gastos compartidos, amigos y solicitudes entre usuarios autenticados. Diseñada con un enfoque mobile-first y experiencia de usuario intuitiva.

## 🛠️ Tecnologías

- **React 19** - UI framework moderno
- **Vite** - Build tool rápido y eficiente
- **Tailwind CSS v4** - Utility-first CSS framework
- **Lucide React** - Iconos SVG de alta calidad
- **ESLint 9** - Linting y validación de código

## ✨ Funcionalidades

### Autenticación
- ✅ Registro de usuarios con datos extendidos (username, nombre completo, teléfono)
- ✅ Inicio de sesión con token JWT
- ✅ Persistencia de sesión en localStorage

### Gestión de Gastos
- ✅ Dashboard con balance total (dinero owed to me, i owe, net balance)
- ✅ Creación de gastos compartidos con múltiples participantes
- ✅ Detalle de gastos con modal interactivo
- ✅ Filtrado de gastos (all, owed_to_me, i_owe)
- ✅ Búsqueda inteligente de participantes por usuario, correo o teléfono
- ✅ Marcado de pagos realizados

### Gestión de Amigos
- ✅ Lista de amigos autenticados
- ✅ Solicitudes de amistad pendientes
- ✅ Aceptación/rechazo de solicitudes desde la UI
- ✅ Visualización de amigos en formulario de creación de gasto

### Interfaz y Experiencia
- ✅ Diseño glassmorphism con tema oscuro
- ✅ Navegación inferior compacta con dock flotante
- ✅ Modales y paneles flotantes para acciones
- ✅ Hamburger menu con drawer lateral
- ✅ Soporte de temas (actualmente dark mode por defecto)
- ✅ Diseño responsive mobile-first
- ✅ Animaciones suaves y transiciones

## 📋 Requisitos

- **Node.js** 18 o superior
- **npm** o **yarn** para gestión de dependencias
- **API Backend** accesible en `https://expense-tracker-api-0762.onrender.com`

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# O si usas yarn
yarn install
```

## 🚀 Scripts disponibles

```bash
# Iniciar servidor de desarrollo con hot reload
npm run dev

# Construir versión para producción
npm run build

# Verificar código con linter
npm run lint

# Previsualizar build de producción localmente
npm run preview
```

## 🏗️ Estructura del Proyecto

```
src/
├── components/           # Componentes React
│   ├── Amount.jsx
│   ├── BalanceCard.jsx
│   ├── BottomIsland.jsx
│   ├── CreateExpenseForm.jsx
│   ├── ExpenseCard.jsx
│   ├── ExpenseDetailModal.jsx
│   ├── ExpenseList.jsx
│   ├── FriendsView.jsx
│   ├── GlassCard.jsx
│   ├── HamburgerMenu.jsx
│   ├── LoginView.jsx
│   └── SideDrawer.jsx
├── utils/               # Funciones utilitarias
│   ├── helpers.js       # Funciones de formato y conversión
│   └── purplePalette.js # Configuración de colores
├── App.jsx              # Orquestación principal, rutas y lógica de estado
├── App.css              # Estilos globales
├── main.jsx             # Punto de entrada de React
└── index.css            # Estilos base
```

## 🔌 API Backend

Este frontend consume la API de Split.it:

**URL Base:** `https://expense-tracker-api-0762.onrender.com`

La documentación completa de endpoints está disponible en [ENDPOINTS.md](ENDPOINTS.md)

### Autenticación
- Usa JWT tokens enviados en header `Authorization: Bearer <token>`
- Token almacenado en localStorage bajo la clave `splitit_jwt`

## 🎨 Diseño y Estilos

### Paleta de Colores
- **Primario**: Violeta (acciones principales)
- **Fondo**: Tonos oscuros (slate/negro)
- **Éxito**: Verde/Emerald
- **Alerta**: Naranja/Rojo

### Características de Diseño
- Efecto glassmorphism con `backdrop-blur`
- Bordes sutiles con baja opacidad
- Sombras suaves y difusas
- Esquinas redondeadas amplias
- Animaciones smooth

Para más detalles, ver [DESIGN.md](DESIGN.md)

## 🔧 Configuración

### Variables de Entorno
- API URL centralizada en `src/config/api.js`, con default a `https://expense-tracker-api-0762.onrender.com`.
- Para apuntar a un backend local, crea un `.env.local` (ya ignorado por git) con:
  ```
  VITE_API_URL=http://localhost:3000
  ```

### Localización
- Formatos de moneda: CLP (Pesos Chilenos)
- Locale: es-CL (Español - Chile)
- Formateo de fechas: formato local

## 📝 Notas Importantes

- El registro de usuario acepta campos extendidos: `username`, `first_name`, `middle_name`, `last_name`, `second_last_name`, `birth_date`, `phone`
- Los campos opcionales se envían según disponibilidad en el formulario
- El tema se persiste en localStorage bajo `splitit_theme`
- El estado de la aplicación se maneja con React hooks (useState, useCallback, useEffect, useMemo)
- Scroll compacto para dock: Se activa cuando el scroll es > 24px

## 🚀 Desarrollo

1. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Abre la URL que muestra Vite en tu navegador (típicamente `http://localhost:5173`)

3. La aplicación recargará automáticamente cuando hagas cambios

## 📂 Archivos Importantes

- `vite.config.js` - Configuración de Vite con React y Tailwind
- `eslint.config.js` - Configuración de linting
- `index.html` - Template HTML principal
- `package.json` - Dependencias y scripts

## 🔍 Útil

- [API Endpoints Reference](ENDPOINTS.md)
- [Design System & Visual Guidelines](DESIGN.md)
