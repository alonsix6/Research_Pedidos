# Reset R&A - Sistema de Gestión de Pedidos

Sistema completo de gestión de pedidos para el equipo de Research & Analytics de Reset (agencia de medios en Lima, Perú).

## Características

### Dashboard Web
- **Diseño OP-1**: Estética inspirada en Teenage Engineering con LCD display y botones 3D
- **Tiempo Real**: Actualizaciones automáticas via Supabase Realtime
- **Modo Oscuro/Claro**: Toggle de tema con persistencia en localStorage
- **Vista Compacta**: Alternar entre vista normal y compacta
- **Búsqueda y Filtros**: Búsqueda por cliente, descripción o solicitante
- **Filtro por Miembro**: Ver estadísticas y pedidos por integrante del equipo
- **Drag & Drop**: Reorganización de pedidos (preparado para Kanban)
- **Atajos de Teclado**: Navegación rápida (Alt+N, Alt+R, Alt+K, etc.)
- **Sonidos**: Feedback auditivo opcional
- **Accesibilidad WCAG AA**: Contraste de colores, focus visible, landmarks ARIA

### Bot de Telegram
- **Comandos Completos**: Gestión de pedidos desde Telegram
- **Botones Inline**: Interacción rápida sin escribir comandos
- **Menú Interactivo**: Acceso rápido a todas las funciones
- **Recordatorio Diario**: Resumen automático a las 9AM (Lunes a Viernes)

### Base de Datos
- **Supabase (PostgreSQL)**: Almacenamiento robusto y escalable
- **Row Level Security**: Seguridad a nivel de fila
- **Realtime**: Sincronización instantánea

## Stack Tecnológico

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **UI**: Lucide React (iconos), Framer Motion (animaciones), dnd-kit (drag & drop)
- **Backend**: Netlify Functions (serverless)
- **Database**: Supabase (PostgreSQL)
- **Bot**: Telegram Bot API + Webhook
- **Cron Jobs**: GitHub Actions
- **Deploy**: Netlify

## Instalación

1. **Clonar el repositorio**:
```bash
git clone https://github.com/alonsix6/Research_Pedidos.git
cd Research_Pedidos
```

2. **Instalar dependencias**:
```bash
npm install
```

3. **Configurar variables de entorno**:
```bash
cp .env.example .env.local
# Editar .env.local con tus credenciales
```

4. **Ejecutar en desarrollo**:
```bash
npm run dev
```

El dashboard estará disponible en `http://localhost:3000`

## Bot de Telegram

### Configuración del Webhook

Una vez desplegado en Netlify, configurar el webhook del bot:

```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-site.netlify.app/.netlify/functions/telegram-webhook"}'
```

### Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `/ayuda` | Ver todos los comandos disponibles |
| `/menu` | Abrir menú con botones interactivos |
| `/ver` | Ver todos los pedidos activos |
| `/mios` | Ver pedidos asignados a ti |
| `/hoy` | Pedidos que vencen hoy |
| `/semana` | Pedidos de esta semana |
| `/urgente` | Pedidos urgentes (< 2 días) |
| `/nuevopedido` | Crear nuevo pedido (flujo guiado) |
| `/completar` | Marcar pedido como completado |

### Botones Inline

El bot incluye botones interactivos para:
- Completar pedidos con un tap
- Ver detalles de cada pedido
- Navegar entre secciones
- Confirmar acciones

## Diseño - Estética OP-1

El diseño está inspirado en el Teenage Engineering OP-1, con:

- **Paleta de colores**: Grises metálicos + naranja como acento
- **LCD Display**: Pantalla estilo LCD con números segmentados
- **Tipografía**: Monospace (JetBrains Mono, SF Mono)
- **Botones 3D**: Estilo físico rubber/silicone con sombras y efecto pressed
- **Indicadores LED**: Estados visuales con luces RGB
- **Modo Oscuro**: Tema oscuro completo con transiciones suaves

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Alt + N` | Nuevo pedido |
| `Alt + R` | Refrescar datos |
| `Alt + K` | Abrir búsqueda |
| `Alt + C` | Alternar vista compacta |
| `Alt + M` | Alternar sonido |
| `Alt + /` | Ver atajos |
| `Escape` | Cerrar modales |

## Estructura del Proyecto

```
reset-pedidos/
├── app/                       # Next.js App Router
│   ├── dashboard/            # Dashboard principal
│   │   ├── components/       # Componentes del dashboard
│   │   │   ├── controls/     # Botones 3D, controles
│   │   │   └── device/       # Frame, LCD, TopBar
│   │   └── page.tsx
│   ├── globals.css           # Estilos globales (tema OP-1)
│   ├── layout.tsx
│   └── page.tsx
├── lib/                      # Librerías compartidas
│   ├── hooks/               # Custom hooks (useTheme, useSettings, etc.)
│   ├── supabase.ts          # Cliente de Supabase
│   ├── telegram.ts          # Helpers del bot + inline buttons
│   ├── types.ts             # TypeScript types
│   └── utils.ts             # Utilidades
├── netlify/
│   └── functions/
│       └── telegram-webhook.ts  # Webhook del bot
├── scripts/
│   └── daily-reminder.js    # Script de recordatorio diario
├── .github/
│   └── workflows/
│       ├── daily-reminder.yml   # Cron 9AM Lima (Mon-Fri)
│       └── check-webhook.yml    # Verificación de webhook cada 6h
├── .env.local               # Variables de entorno (NO COMMITEAR)
├── .env.example             # Ejemplo de variables
├── netlify.toml             # Configuración de Netlify
└── package.json
```

## Base de Datos (Supabase)

### Tablas

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios del equipo |
| `requests` | Pedidos |
| `activity_log` | Historial de cambios |
| `conversation_state` | Estados del bot |

## Deploy a Netlify

1. **Conectar repositorio a Netlify**:
   - Ir a Netlify Dashboard
   - New site from Git
   - Seleccionar GitHub y el repositorio

2. **Configurar variables de entorno**:
   En Netlify: Site settings > Environment variables, agregar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`

3. **Deploy**:
   Netlify detectará automáticamente Next.js y usará la configuración de `netlify.toml`

4. **Configurar webhook del bot**:
   Ver sección "Bot de Telegram" arriba

## GitHub Actions

### Recordatorio Diario
- **Archivo**: `.github/workflows/daily-reminder.yml`
- **Horario**: 9AM Lima (14:00 UTC), Lunes a Viernes
- **Función**: Envía resumen de pedidos urgentes al grupo de Telegram

### Verificación de Webhook
- **Archivo**: `.github/workflows/check-webhook.yml`
- **Horario**: Cada 6 horas
- **Función**: Verifica y reconfigura el webhook si es necesario

### Secrets Requeridos

Configurar en GitHub > Settings > Secrets and variables > Actions:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

## Seguridad

- Service Role Key solo en server-side
- Anon Key está OK en frontend (RLS en Supabase)
- .env.local en .gitignore
- Validación de usuarios autorizados en el bot
- Headers de seguridad configurados en Netlify

## Timezone

Todo el sistema usa la zona horaria de Lima, Perú (UTC-5):
- Fechas mostradas en formato dd/MM/yyyy
- Recordatorios a las 9AM hora de Lima
- Cálculos de deadlines en timezone local

## Accesibilidad

El sistema cumple con WCAG AA:
- Contraste de colores mínimo 4.5:1
- Focus visible en todos los elementos interactivos
- Landmarks ARIA (main, nav, footer)
- Labels en todos los formularios
- Skip-to-content link
- Touch targets mínimo 44x44px

## Equipo

- **Alonso** (Analyst) - @alonsix6
- **Sol** (Assistant)
- **Estef** (Coordinator)

## Licencia

Uso interno de Reset R&A - Fahrenheit DDB

---

Desarrollado para el equipo de Research & Analytics de Reset
