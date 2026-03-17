# Reset R&A - Sistema de Gestion de Pedidos

> Sistema completo de gestion de pedidos para equipos de trabajo. Dashboard web en tiempo real + Bot de Telegram + Recordatorios automaticos.
> Desarrollado originalmente para el equipo de Research & Analytics de Reset (agencia de medios en Lima, Peru).

---

## Tabla de Contenidos

- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Stack Tecnologico](#stack-tecnologico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Base de Datos (Supabase)](#base-de-datos-supabase)
  - [Schema SQL Completo](#schema-sql-completo)
  - [Relaciones entre Tablas](#relaciones-entre-tablas)
  - [Indices Recomendados](#indices-recomendados)
  - [Row Level Security (RLS)](#row-level-security-rls)
- [Variables de Entorno](#variables-de-entorno)
- [Instalacion y Setup desde Cero](#instalacion-y-setup-desde-cero)
  - [1. Clonar e Instalar](#1-clonar-e-instalar)
  - [2. Configurar Supabase](#2-configurar-supabase)
  - [3. Configurar Bot de Telegram](#3-configurar-bot-de-telegram)
  - [4. Variables de Entorno Local](#4-variables-de-entorno-local)
  - [5. Ejecutar en Desarrollo](#5-ejecutar-en-desarrollo)
- [Guia de Supabase](#guia-de-supabase)
- [Bot de Telegram](#bot-de-telegram)
- [Dashboard Web](#dashboard-web)
  - [Features](#features)
  - [Atajos de Teclado](#atajos-de-teclado)
  - [Diseno OP-1](#diseno-op-1)
- [Deploy a Netlify](#deploy-a-netlify)
- [GitHub Actions (Cron Jobs)](#github-actions-cron-jobs)
- [Guia de Escalabilidad: Duplicar para Otro Equipo](#guia-de-escalabilidad-duplicar-para-otro-equipo)
  - [Opcion A: Mismo Supabase con team_id (Multi-Tenancy)](#opcion-a-mismo-supabase-con-team_id-multi-tenancy)
  - [Opcion B: Proyecto Supabase Separado](#opcion-b-proyecto-supabase-separado)
  - [Comparativa de Opciones](#comparativa-de-opciones)
- [Seguridad](#seguridad)
- [Accesibilidad](#accesibilidad)
- [Troubleshooting](#troubleshooting)
- [Equipo y Licencia](#equipo-y-licencia)

---

## Arquitectura del Sistema

```
                         +-------------------+
                         |   GitHub Actions   |
                         | (Cron Jobs)        |
                         | - daily-reminder   |
                         | - check-webhook    |
                         +--------+----------+
                                  |
                                  | 9AM Lima (L-V)
                                  v
+------------------+    +-------------------+    +------------------+
|  Dashboard Web   |    |     Supabase      |    |  Bot Telegram    |
|  (Next.js 14)    |<-->|  (PostgreSQL)     |<-->| (Netlify Func)   |
|                  |    |                   |    |                  |
|  - CRUD pedidos  |    | - users           |    | - /nuevopedido   |
|  - Realtime      |    | - requests        |    | - /ver, /mios    |
|  - Filtros       |    | - activity_log    |    | - /completar     |
|  - Drag & Drop   |    | - conversation_   |    | - Inline buttons |
|  - Historial     |    |   state           |    | - Flujo guiado   |
+------------------+    +-------------------+    +------------------+
        |                       ^                        |
        |                       |                        |
        v                       v                        v
   Netlify CDN            Supabase Realtime        Telegram API
   (Static +              (WebSocket)              (Webhook)
    Functions)
```

### Flujo de Datos

1. **Dashboard Web** se conecta a Supabase via `@supabase/supabase-js` con la Anon Key (segura por RLS)
2. **Realtime**: El dashboard se suscribe al canal `requests-changes` para recibir INSERT/UPDATE/DELETE en tiempo real
3. **Bot de Telegram**: Recibe mensajes via webhook en una Netlify Function. Usa la Service Role Key para operaciones server-side
4. **Daily Reminder**: GitHub Actions ejecuta `scripts/daily-reminder.js` a las 9AM Lima (14:00 UTC) de lunes a viernes
5. **Webhook Check**: GitHub Actions verifica cada 6 horas que el webhook del bot esta activo y lo reconfigura si es necesario

---

## Stack Tecnologico

| Capa | Tecnologia | Version | Proposito |
|------|-----------|---------|-----------|
| **Frontend** | Next.js (App Router) | 14.2.x | Framework React con SSR/SSG |
| **Lenguaje** | TypeScript | 5.x | Tipado estatico |
| **Estilos** | Tailwind CSS | 3.4.x | Utility-first CSS |
| **Animaciones** | Framer Motion | 12.x | Animaciones declarativas |
| **Iconos** | Lucide React | 0.562.x | Iconos SVG |
| **Drag & Drop** | dnd-kit | 6.x | Reordenamiento de pedidos |
| **Fechas** | date-fns + date-fns-tz | 2.x | Manipulacion de fechas (timezone Lima) |
| **Sonidos** | use-sound | 5.x | Feedback auditivo |
| **PWA** | Serwist | 9.x | Service Worker / offline |
| **Database** | Supabase (PostgreSQL) | 2.39.x | Base de datos + Realtime + Auth |
| **Serverless** | Netlify Functions | 5.x | Webhook del bot |
| **Deploy** | Netlify | - | Hosting + CDN + Functions |
| **Cron** | GitHub Actions | - | Tareas programadas |
| **Bot** | Telegram Bot API | - | Interfaz de chat |

---

## Estructura del Proyecto

```
Research_Pedidos/
├── app/                              # Next.js App Router
│   ├── dashboard/                    # Pagina principal del dashboard
│   │   ├── components/               # Componentes del dashboard
│   │   │   ├── controls/             # Controles UI
│   │   │   │   ├── Button3D.tsx      # Boton estilo Teenage Engineering (rubber/silicone 3D)
│   │   │   │   ├── CalendarPicker.tsx # Date picker personalizado estilo LCD
│   │   │   │   └── ...               # Otros controles (toggles, selects)
│   │   │   ├── device/               # Componentes del "dispositivo" OP-1
│   │   │   │   ├── DeviceFrame.tsx   # Marco exterior del dispositivo
│   │   │   │   ├── LCDScreen.tsx     # Pantalla LCD principal
│   │   │   │   └── TopBar.tsx        # Barra superior con indicadores
│   │   │   ├── PedidoModal.tsx       # Modal crear/editar pedido (formulario completo)
│   │   │   ├── PedidoPad.tsx         # Tarjeta individual de pedido (vista en grid)
│   │   │   ├── HistoryModal.tsx      # Modal de historial (pedidos completados, paginado)
│   │   │   └── ...                   # Otros componentes (filtros, stats, shortcuts)
│   │   └── page.tsx                  # Pagina principal: layout, estado global, handlers CRUD
│   ├── globals.css                   # Sistema de diseno completo (variables CSS, temas, tipografia)
│   ├── layout.tsx                    # Layout raiz (fonts, metadata, providers)
│   └── page.tsx                      # Landing page (redirige a /dashboard)
│
├── lib/                              # Librerias compartidas
│   ├── hooks/                        # Custom hooks de React
│   │   ├── useRealtimeRequests.ts    # Hook: fetch inicial + suscripcion Realtime a tabla requests
│   │   ├── useTeamMembers.ts         # Hook: carga lista de usuarios desde tabla users
│   │   ├── useSettings.tsx           # Context provider: tema, sonido, vista compacta
│   │   ├── useTheme.ts              # Hook: dark/light mode con persistencia localStorage
│   │   └── useKeyboardShortcuts.ts   # Hook: atajos de teclado globales (Alt+N, Alt+R, etc.)
│   ├── supabase.ts                   # Cliente Supabase dual: getSupabase() (anon) + getSupabaseAdmin() (service role)
│   ├── conversation.ts              # CRUD del estado conversacional del bot (get/save/clear)
│   ├── telegram.ts                   # Helpers: enviar mensajes, inline keyboards, validar usuarios
│   ├── types.ts                      # Interfaces TypeScript de TODAS las tablas y tipos del sistema
│   ├── utils.ts                      # Utilidades: timezone Lima, prioridad automatica, formateo fechas
│   └── validateEnv.ts               # Validacion de variables de entorno (client + server)
│
├── netlify/
│   └── functions/
│       └── telegram-webhook.ts       # Webhook principal del bot: parsea comandos, flujo conversacional,
│                                     # inline buttons, rate limiting, CRUD de pedidos via Telegram
│
├── scripts/
│   ├── daily-reminder.js             # Script Node.js: envia resumen de pedidos urgentes a Telegram (9AM Lima)
│   └── insert-users.sql              # SQL: insertar usuarios del equipo (upsert por telegram_id)
│
├── public/
│   └── sounds/                       # Archivos de audio para feedback (click, success, etc.)
│
├── .github/
│   └── workflows/
│       ├── daily-reminder.yml        # Cron: 9AM Lima (14:00 UTC), lunes a viernes
│       └── check-webhook.yml         # Cron: cada 6 horas, verifica/reconfigura webhook del bot
│
├── .env.example                      # Template de variables de entorno (todas documentadas)
├── .env.local                        # Variables de entorno reales (NO en git, en .gitignore)
├── netlify.toml                      # Config Netlify: build, redirects, headers de seguridad, functions
├── tailwind.config.ts                # Config Tailwind: colores custom, fuentes, breakpoints
├── tsconfig.json                     # Config TypeScript
├── next.config.mjs                   # Config Next.js
└── package.json                      # Dependencias y scripts (dev, build, start, lint)
```

---

## Base de Datos (Supabase)

### Schema SQL Completo

Ejecutar este SQL en el **SQL Editor de Supabase** para crear todas las tablas desde cero:

```sql
-- ============================================================
-- SCHEMA COMPLETO: Sistema de Gestion de Pedidos
-- Ejecutar en Supabase SQL Editor (en orden)
-- ============================================================

-- 1. TABLA: users
-- Miembros del equipo, vinculados por su Telegram ID
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id TEXT UNIQUE NOT NULL,
  telegram_username TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('analyst', 'assistant', 'coordinator', 'practicante')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: requests
-- Pedidos/tareas del equipo (tabla principal)
-- ============================================================
CREATE TABLE IF NOT EXISTS requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client TEXT NOT NULL,
  description TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_role TEXT NOT NULL DEFAULT '',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: activity_log
-- Historial de cambios en pedidos (auditoria)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: conversation_state
-- Estado del flujo conversacional del bot de Telegram
-- Se usa para mantener el contexto cuando un usuario esta creando un pedido paso a paso
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_state (
  chat_id TEXT NOT NULL,
  user_id TEXT,
  step TEXT NOT NULL DEFAULT 'idle',
  data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chat_id, COALESCE(user_id, ''))
);
```

### Relaciones entre Tablas

```
users
├── requests.assigned_to  →  users.id  (FK, ON DELETE SET NULL)
├── requests.created_by   →  users.id  (FK, NOT NULL)
└── activity_log.user_id  →  users.id  (FK, ON DELETE SET NULL)

requests
└── activity_log.request_id  →  requests.id  (FK, ON DELETE CASCADE)

conversation_state
└── (independiente, usa chat_id + user_id como PK compuesto)
```

### Indices Recomendados

```sql
-- Indices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_deadline ON requests(deadline);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_requests_created_by ON requests(created_by);
CREATE INDEX IF NOT EXISTS idx_activity_log_request_id ON activity_log(request_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
```

### Row Level Security (RLS)

Habilitar RLS en Supabase para proteger los datos. Las policies actuales permiten lectura publica (anon key) y escritura via service role:

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;

-- Policy: Lectura publica para users (el dashboard necesita listar miembros)
CREATE POLICY "Allow public read on users"
  ON users FOR SELECT
  USING (true);

-- Policy: Lectura publica para requests (el dashboard muestra todos los pedidos)
CREATE POLICY "Allow public read on requests"
  ON requests FOR SELECT
  USING (true);

-- Policy: Insert/Update/Delete via service role (solo server-side)
-- El service role key bypasea RLS automaticamente, asi que no necesita policies explicitas.
-- Si quieres permitir inserts desde el frontend (anon key), agrega:
CREATE POLICY "Allow public insert on requests"
  ON requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on requests"
  ON requests FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on requests"
  ON requests FOR DELETE
  USING (true);

-- Lectura publica para activity_log
CREATE POLICY "Allow public read on activity_log"
  ON activity_log FOR SELECT
  USING (true);
```

### Habilitar Realtime

En el dashboard de Supabase:
1. Ir a **Database > Replication**
2. Activar la publicacion `supabase_realtime` para la tabla `requests`
3. Alternativamente, ejecutar:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE requests;
```

---

## Variables de Entorno

| Variable | Tipo | Donde se usa | Descripcion |
|----------|------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Publica | Frontend + Backend + GitHub Actions | URL del proyecto Supabase (ej: `https://xxxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publica | Frontend + GitHub Actions | Anon key de Supabase (segura por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Privada** | Solo Netlify Functions (server) | Service role key (bypasea RLS, NUNCA exponer en frontend) |
| `TELEGRAM_BOT_TOKEN` | **Privada** | Netlify Functions + GitHub Actions | Token del bot de Telegram (de @BotFather) |
| `TELEGRAM_CHAT_ID` | **Privada** | Netlify Functions + GitHub Actions | ID del grupo/chat de Telegram donde opera el bot |
| `TELEGRAM_WEBHOOK_SECRET` | **Privada** | Netlify Functions + GitHub Actions | Token secreto para validar webhooks (generar con `openssl rand -hex 32`) |
| `SITE_URL` | **Privada** | GitHub Actions (check-webhook) | URL del sitio en Netlify (ej: `https://research-pedidos.netlify.app`) |

### Donde configurar cada variable

| Lugar | Variables |
|-------|----------|
| `.env.local` (desarrollo local) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` |
| **Netlify** (Site settings > Environment) | Todas las anteriores |
| **GitHub Actions** (Settings > Secrets) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `SITE_URL` |

---

## Instalacion y Setup desde Cero

### 1. Clonar e Instalar

```bash
git clone https://github.com/alonsix6/Research_Pedidos.git
cd Research_Pedidos
npm install
```

### 2. Configurar Supabase

1. Ir a [supabase.com](https://supabase.com) y crear una cuenta/proyecto
2. En el dashboard de Supabase, ir a **SQL Editor**
3. Copiar y ejecutar el [Schema SQL Completo](#schema-sql-completo) de arriba (crea las 4 tablas)
4. Ejecutar los [Indices Recomendados](#indices-recomendados)
5. Ejecutar las [Policies de RLS](#row-level-security-rls)
6. [Habilitar Realtime](#habilitar-realtime) para la tabla `requests`
7. Ir a **Settings > API** y copiar:
   - `Project URL` → sera `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → sera `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → sera `SUPABASE_SERVICE_ROLE_KEY`

### 3. Configurar Bot de Telegram

1. Abrir Telegram y buscar **@BotFather**
2. Enviar `/newbot` y seguir las instrucciones
3. Guardar el token → sera `TELEGRAM_BOT_TOKEN`
4. Crear un grupo en Telegram y agregar el bot
5. Para obtener el `TELEGRAM_CHAT_ID`:
   - Agregar el bot al grupo
   - Enviar un mensaje en el grupo
   - Abrir en el navegador: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Buscar `"chat":{"id": -XXXXXXXXX}` → ese numero negativo es el `TELEGRAM_CHAT_ID`
6. Generar un webhook secret: `openssl rand -hex 32` → sera `TELEGRAM_WEBHOOK_SECRET`

### 4. Variables de Entorno Local

```bash
cp .env.example .env.local
```

Editar `.env.local` con los valores obtenidos:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=-100123456789
TELEGRAM_WEBHOOK_SECRET=tu_secret_generado
```

### 5. Ejecutar en Desarrollo

```bash
npm run dev
```

El dashboard estara disponible en `http://localhost:3000/dashboard`

### 6. Insertar Usuarios del Equipo

Editar `scripts/insert-users.sql` con los datos de tu equipo y ejecutar en Supabase SQL Editor:

```sql
INSERT INTO users (telegram_id, telegram_username, name, role)
VALUES
  ('TELEGRAM_ID_AQUI', 'username', 'Nombre', 'analyst')
ON CONFLICT (telegram_id) DO UPDATE SET
  telegram_username = EXCLUDED.telegram_username,
  name = EXCLUDED.name,
  role = EXCLUDED.role;
```

**Roles disponibles**: `analyst`, `assistant`, `coordinator`, `practicante`

---

## Guia de Supabase

### Cliente Dual (lib/supabase.ts)

El sistema usa dos clientes de Supabase:

```
getSupabase()       → Anon Key     → Frontend (browser)     → Respeta RLS
getSupabaseAdmin()  → Service Role → Server (Netlify Func)  → Bypasea RLS
```

- **`supabase`** (export por defecto): Proxy lazy-initialized que usa `getSupabase()`. Es seguro para el frontend.
- **`getSupabaseAdmin()`**: Solo se usa en `netlify/functions/telegram-webhook.ts` para operaciones del bot.

### Realtime (lib/hooks/useRealtimeRequests.ts)

El hook `useRealtimeRequests` hace:
1. Fetch inicial de todos los pedidos ordenados por deadline
2. Se suscribe al canal `requests-changes` en Supabase Realtime
3. Escucha eventos `INSERT`, `UPDATE`, `DELETE` y actualiza el state local
4. Expone `isConnected` para mostrar el estado de la conexion en el UI

### Tipos (lib/types.ts)

Todas las interfaces TypeScript estan en `lib/types.ts`:

| Tipo | Tabla/Uso |
|------|-----------|
| `User` | Tabla `users` |
| `Request` | Tabla `requests` |
| `ActivityLog` | Tabla `activity_log` |
| `ConversationState` | Tabla `conversation_state` |
| `RequestWithUser` | Request + usuario asignado/creador (join) |
| `TelegramMessage` | Mensaje entrante de Telegram |
| `TelegramUpdate` | Update de Telegram (wrapper) |
| `ConversationStep` | Enum de pasos del flujo conversacional |
| `NewRequestData` | Datos parciales al crear pedido desde el bot |
| `UserRole` | `'analyst' \| 'assistant' \| 'coordinator' \| 'practicante'` |
| `RequestStatus` | `'pending' \| 'in_progress' \| 'completed' \| 'cancelled'` |
| `RequestPriority` | `'low' \| 'normal' \| 'high' \| 'urgent'` |

### Utilidades de Timezone (lib/utils.ts)

Todo el sistema usa **timezone de Lima, Peru (UTC-5)**:

```typescript
LIMA_TIMEZONE = 'America/Lima'
toLimaTime(date)        // UTC → Lima
fromLimaTime(date)      // Lima → UTC
formatLimaDate(date)    // Formatea en dd/MM/yyyy
```

La prioridad se calcula automaticamente segun dias restantes:
- `urgent`: Vence hoy o ya paso
- `high`: Vence en 1-3 dias
- `normal`: Vence en 4-7 dias
- `low`: Mas de 7 dias

---

## Bot de Telegram

### Comandos Disponibles

| Comando | Descripcion |
|---------|-------------|
| `/ayuda` | Ver todos los comandos disponibles |
| `/menu` | Abrir menu con botones interactivos |
| `/ver` | Ver todos los pedidos activos |
| `/mios` | Ver pedidos asignados a ti |
| `/hoy` | Pedidos que vencen hoy |
| `/semana` | Pedidos de esta semana |
| `/urgente` | Pedidos urgentes (< 2 dias) |
| `/nuevopedido` | Crear nuevo pedido (flujo guiado paso a paso) |
| `/completar` | Marcar pedido como completado |

### Flujo Conversacional (nuevopedido)

El bot guia al usuario paso a paso para crear un pedido:

```
1. /nuevopedido           → "Para que cliente/cuenta?"
2. Usuario: "Nike"        → "Que necesitan exactamente?"
3. Usuario: "Reporte..."  → "Quien lo solicito? (nombre, cargo)"
4. Usuario: "Andrea, ej." → "Fecha de entrega? (25/12, manana, en 3 dias)"
5. Usuario: "en 3 dias"   → "Quien se encarga? (1-5)"
6. Usuario: "1"           → Pedido creado! (resumen)
```

El estado de cada conversacion se guarda en la tabla `conversation_state` y se limpia al completar o cancelar.

### Botones Inline

El bot incluye botones interactivos (inline keyboards) para:
- Completar pedidos con un tap
- Ver detalles de cada pedido
- Navegar entre secciones
- Confirmar acciones

### Configurar Webhook (post-deploy)

Una vez desplegado en Netlify:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://tu-sitio.netlify.app/.netlify/functions/telegram-webhook",
    "secret_token": "<TU_WEBHOOK_SECRET>"
  }'
```

### Verificar Webhook

```bash
curl -s "https://api.telegram.org/bot<TOKEN>/getWebhookInfo" | python3 -m json.tool
```

---

## Dashboard Web

### Features

- **Tiempo Real**: Actualizaciones automaticas via Supabase Realtime (WebSocket)
- **CRUD Completo**: Crear, editar, completar y eliminar pedidos
- **Busqueda y Filtros**: Por cliente, descripcion, solicitante, estado, prioridad
- **Filtro por Miembro**: Ver estadisticas y pedidos por integrante del equipo
- **Vista Compacta**: Alternar entre vista normal y compacta (Alt+C)
- **Modo Oscuro/Claro**: Toggle de tema con persistencia en localStorage
- **Drag & Drop**: Reorganizacion de pedidos (preparado para Kanban)
- **Historial**: Modal con pedidos completados, busqueda y paginacion
- **Sonidos**: Feedback auditivo opcional (Alt+M para toggle)
- **CalendarPicker**: Selector de fecha personalizado estilo LCD (no usa `<input type="date">`)
- **PWA**: Service Worker para funcionamiento offline basico

### Atajos de Teclado

| Atajo | Accion |
|-------|--------|
| `Alt + N` | Nuevo pedido |
| `Alt + R` | Refrescar datos |
| `Alt + K` | Abrir busqueda |
| `Alt + C` | Alternar vista compacta |
| `Alt + M` | Alternar sonido |
| `Alt + /` | Ver atajos |
| `Escape` | Cerrar modales |

### Diseno OP-1

El diseno esta inspirado en el **Teenage Engineering OP-1**:

- **Paleta de colores**: Gris oscuro (`#0D0D0D`, `#1A1A1A`) + cyan (`var(--te-cyan)`) + naranja (`var(--te-orange)`)
- **LCD Display**: Pantalla estilo LCD con numeros segmentados
- **Tipografia**: Monospace — JetBrains Mono, SF Mono
- **Botones 3D**: Estilo fisico rubber/silicone con sombras y efecto pressed
- **Indicadores LED**: Estados visuales con luces RGB
- **Variables CSS**: Definidas en `app/globals.css` (buscar `--te-cyan`, `--te-orange`, etc.)

---

## Deploy a Netlify

### Paso a Paso

1. **Conectar repositorio a Netlify**:
   - Ir a [netlify.com](https://netlify.com) > New site from Git
   - Seleccionar GitHub > Seleccionar el repositorio

2. **Configurar build**:
   - Build command: `npm run build` (auto-detectado via `netlify.toml`)
   - Publish directory: `.next`
   - Functions directory: `netlify/functions`

3. **Configurar variables de entorno** en Site settings > Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `TELEGRAM_WEBHOOK_SECRET`

4. **Deploy**: Netlify detecta automaticamente Next.js y despliega

5. **Post-deploy**: Configurar el webhook de Telegram con la URL de Netlify (ver seccion [Bot de Telegram](#configurar-webhook-post-deploy))

### Configuracion de Netlify (netlify.toml)

El archivo `netlify.toml` incluye:
- **Build config**: Comando, publish dir, functions dir
- **Redirects**: `/api/*` → `/.netlify/functions/:splat` (proxy)
- **Headers de seguridad**: X-Frame-Options, HSTS, CSP, XSS-Protection, etc.
- **Functions bundler**: esbuild (rapido)

---

## GitHub Actions (Cron Jobs)

### Recordatorio Diario

| Config | Valor |
|--------|-------|
| **Archivo** | `.github/workflows/daily-reminder.yml` |
| **Horario** | 9:00 AM Lima = 14:00 UTC, Lunes a Viernes |
| **Cron** | `0 14 * * 1-5` |
| **Script** | `scripts/daily-reminder.js` |
| **Funcion** | Envia resumen de pedidos urgentes al grupo de Telegram |

### Verificacion de Webhook

| Config | Valor |
|--------|-------|
| **Archivo** | `.github/workflows/check-webhook.yml` |
| **Horario** | Cada 6 horas |
| **Cron** | `0 */6 * * *` |
| **Funcion** | Verifica que el webhook del bot esta activo; lo reconfigura si no |

### Secrets Requeridos en GitHub

Configurar en **GitHub > Settings > Secrets and variables > Actions**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET` (opcional, para firma del webhook)
- `SITE_URL` (URL de Netlify, ej: `https://research-pedidos.netlify.app`)

---

## Guia de Escalabilidad: Duplicar para Otro Equipo

Hay **dos opciones** para que otro equipo use este sistema. Ambas son validas; la eleccion depende de tus necesidades.

### Opcion A: Mismo Supabase con team_id (Multi-Tenancy)

**Usar el mismo proyecto de Supabase** para multiples equipos, aislando datos con una columna `team_id`.

#### Paso 1: Crear tabla `teams`

```sql
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- identificador corto, ej: 'reset-ra', 'equipo-b'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar tu equipo actual
INSERT INTO teams (name, slug) VALUES ('Reset R&A', 'reset-ra');
```

#### Paso 2: Agregar `team_id` a tablas existentes

```sql
-- Obtener el UUID del equipo existente
-- SELECT id FROM teams WHERE slug = 'reset-ra';
-- Usa ese UUID en los DEFAULT de abajo

-- Agregar columna a users
ALTER TABLE users ADD COLUMN team_id UUID REFERENCES teams(id);
UPDATE users SET team_id = (SELECT id FROM teams WHERE slug = 'reset-ra');
ALTER TABLE users ALTER COLUMN team_id SET NOT NULL;

-- Agregar columna a requests
ALTER TABLE requests ADD COLUMN team_id UUID REFERENCES teams(id);
UPDATE requests SET team_id = (SELECT id FROM teams WHERE slug = 'reset-ra');
ALTER TABLE requests ALTER COLUMN team_id SET NOT NULL;

-- Agregar columna a activity_log
ALTER TABLE activity_log ADD COLUMN team_id UUID REFERENCES teams(id);
UPDATE activity_log SET team_id = (SELECT id FROM teams WHERE slug = 'reset-ra');
ALTER TABLE activity_log ALTER COLUMN team_id SET NOT NULL;

-- Agregar columna a conversation_state
ALTER TABLE conversation_state ADD COLUMN team_id UUID REFERENCES teams(id);
UPDATE conversation_state SET team_id = (SELECT id FROM teams WHERE slug = 'reset-ra');

-- Indices para filtrar por team_id
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_requests_team_id ON requests(team_id);
CREATE INDEX idx_activity_log_team_id ON activity_log(team_id);
```

#### Paso 3: Actualizar RLS Policies

```sql
-- Eliminar policies anteriores
DROP POLICY IF EXISTS "Allow public read on users" ON users;
DROP POLICY IF EXISTS "Allow public read on requests" ON requests;
DROP POLICY IF EXISTS "Allow public insert on requests" ON requests;
DROP POLICY IF EXISTS "Allow public update on requests" ON requests;
DROP POLICY IF EXISTS "Allow public delete on requests" ON requests;

-- Nuevas policies filtradas por team_id
-- El frontend debe enviar team_id en las queries

CREATE POLICY "Team isolation: users"
  ON users FOR SELECT
  USING (true);  -- Los usuarios se filtran en la app por team_id

CREATE POLICY "Team isolation: select requests"
  ON requests FOR SELECT
  USING (true);  -- Se filtra en la app por team_id

CREATE POLICY "Team isolation: insert requests"
  ON requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Team isolation: update requests"
  ON requests FOR UPDATE
  USING (true);

CREATE POLICY "Team isolation: delete requests"
  ON requests FOR DELETE
  USING (true);
```

#### Paso 4: Cambios en el Codigo

Agregar variable de entorno `NEXT_PUBLIC_TEAM_ID` y modificar estos archivos:

| Archivo | Cambio |
|---------|--------|
| `.env.example` | Agregar `NEXT_PUBLIC_TEAM_ID=uuid-del-equipo` |
| `lib/hooks/useRealtimeRequests.ts` | Agregar `.eq('team_id', TEAM_ID)` al fetch |
| `lib/hooks/useTeamMembers.ts` | Agregar `.eq('team_id', TEAM_ID)` al fetch |
| `app/dashboard/components/PedidoModal.tsx` | Incluir `team_id` en inserts |
| `app/dashboard/page.tsx` | Incluir `team_id` en updates/deletes |
| `netlify/functions/telegram-webhook.ts` | Filtrar por `team_id` en todas las queries del bot |
| `scripts/daily-reminder.js` | Agregar filtro por `team_id` |
| `lib/conversation.ts` | Incluir `team_id` en conversation state |

#### Paso 5: Para cada nuevo equipo

1. Insertar equipo en tabla `teams`
2. Insertar usuarios con el `team_id` correcto
3. Desplegar una nueva instancia del frontend con `NEXT_PUBLIC_TEAM_ID` distinto
4. Crear un nuevo bot de Telegram (o usar el mismo con un `TEAM_ID` en las variables de la Netlify Function)

---

### Opcion B: Proyecto Supabase Separado

**Crear un proyecto Supabase nuevo** para cada equipo. Mas simple, aislamiento total.

#### Paso a Paso

1. **Crear nuevo proyecto** en [supabase.com](https://supabase.com)
2. **Ejecutar el [Schema SQL Completo](#schema-sql-completo)** en el nuevo proyecto
3. **Ejecutar [Indices](#indices-recomendados) y [RLS Policies](#row-level-security-rls)**
4. **Habilitar [Realtime](#habilitar-realtime)** para tabla `requests`
5. **Fork/clonar** este repositorio
6. **Configurar `.env.local`** con las credenciales del nuevo proyecto Supabase
7. **Crear nuevo bot** de Telegram via @BotFather
8. **Desplegar en Netlify** como nuevo sitio
9. **Configurar GitHub Actions** secrets
10. **Insertar usuarios** del nuevo equipo en la tabla `users`
11. **Configurar webhook** del bot

No requiere cambios en el codigo. Es una replica exacta.

---

### Comparativa de Opciones

| Criterio | Opcion A (Multi-Tenancy) | Opcion B (Proyecto Separado) |
|----------|--------------------------|------------------------------|
| **Complejidad de setup** | Media (requiere migracion SQL + cambios en codigo) | Baja (copia exacta) |
| **Aislamiento de datos** | Logico (mismo DB, filtrado por `team_id`) | Total (DB completamente separada) |
| **Costo Supabase** | 1 proyecto (gratis hasta 500MB) | 1 proyecto por equipo (gratis cada uno hasta 500MB) |
| **Mantenimiento** | 1 sola instancia de DB que mantener | N instancias de DB (una por equipo) |
| **Riesgo de data leak** | Bajo (si RLS esta bien configurado) | Nulo (datos fisicamente separados) |
| **Cambios en codigo** | Si (agregar `team_id` en queries) | No (codigo identico) |
| **Escalabilidad futura** | Mejor para muchos equipos (+20) | Mejor para pocos equipos (2-5) |
| **Realtime** | Compartido (mas eficiente) | Independiente por proyecto |
| **Admin centralizado** | Posible (ver todos los equipos desde 1 DB) | No (cada equipo tiene su propia DB) |

**Recomendacion**:
- **2-5 equipos** → Opcion B (mas simple, sin cambios de codigo)
- **5+ equipos** → Opcion A (mas eficiente, un solo proyecto Supabase)

---

## Seguridad

### Headers HTTP (netlify.toml)

| Header | Valor | Proposito |
|--------|-------|-----------|
| `X-Frame-Options` | `DENY` | Previene clickjacking |
| `X-Content-Type-Options` | `nosniff` | Previene MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | Proteccion XSS legacy |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Fuerza HTTPS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controla referrer |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Deshabilita APIs innecesarias |
| `Content-Security-Policy` | (ver `netlify.toml`) | Controla origenes de scripts/estilos/conexiones |

### Claves de Supabase

- **Anon Key** (`NEXT_PUBLIC_*`): Segura en el frontend porque RLS controla el acceso
- **Service Role Key**: NUNCA exponerla en el frontend. Solo usarla en Netlify Functions (server-side). Esta key bypasea RLS
- **`lib/supabase.ts`**: Implementa el patron dual correctamente: `getSupabase()` para frontend, `getSupabaseAdmin()` para server

### Validacion del Webhook

El bot valida la firma del webhook de Telegram usando `X-Telegram-Bot-Api-Secret-Token` con comparacion timing-safe (`crypto.timingSafeEqual`).

### Autorizacion del Bot

Solo los usuarios registrados en la tabla `users` (por `telegram_id`) pueden usar comandos del bot. Los mensajes de usuarios no autorizados son ignorados.

---

## Accesibilidad

El sistema cumple con **WCAG AA**:

| Criterio | Implementacion |
|----------|---------------|
| **Contraste** | Minimo 4.5:1 para texto, 3:1 para elementos grandes |
| **Focus visible** | Todos los elementos interactivos tienen focus ring visible |
| **Landmarks ARIA** | `main`, `nav`, `footer` definidos |
| **Labels** | Todos los inputs del formulario tienen labels asociados |
| **Skip-to-content** | Link para saltar al contenido principal |
| **Touch targets** | Minimo 44x44px para elementos tactiles |
| **aria-expanded** | Menus y dropdowns comunican su estado |
| **aria-label** | Botones de icono tienen labels descriptivos |
| **Keyboard navigation** | Todo el sistema es navegable con teclado |

---

## Troubleshooting

### El dashboard no carga datos

1. Verificar que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estan en `.env.local`
2. Verificar que las tablas existen en Supabase (ejecutar el schema SQL)
3. Verificar RLS policies (si RLS esta habilitado sin policies, bloquea todo)
4. Revisar la consola del navegador para errores

### El Realtime no funciona

1. Verificar que la tabla `requests` esta en la publicacion `supabase_realtime`:
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```
2. Si no aparece: `ALTER PUBLICATION supabase_realtime ADD TABLE requests;`
3. Verificar que `isConnected` en el hook retorna `true`

### El bot de Telegram no responde

1. Verificar que el webhook esta configurado:
   ```bash
   curl -s "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```
2. Verificar que el `TELEGRAM_WEBHOOK_SECRET` coincide entre Netlify y el webhook configurado
3. Verificar que `SUPABASE_SERVICE_ROLE_KEY` esta en las variables de entorno de Netlify
4. Revisar los logs de Netlify Functions
5. Verificar que el usuario tiene su `telegram_id` en la tabla `users`

### Error "Missing Supabase environment variables"

El validador de entorno (`lib/validateEnv.ts`) detecta variables faltantes al cargar. Verificar que todas las variables estan configuradas segun la [tabla de variables](#variables-de-entorno).

### El recordatorio diario no se envia

1. Verificar que los secrets estan en GitHub Actions (Settings > Secrets)
2. Verificar que el workflow esta habilitado (Actions > Daily Reminder > Enable workflow)
3. Ejecutar manualmente: Actions > Daily Reminder > Run workflow
4. Revisar los logs del workflow para errores

### El calendario del formulario no se ve completo

El calendario (CalendarPicker) se renderiza inline dentro del formulario (no como overlay absolute). Si el modal es muy pequeno, el calendario se puede ver haciendo scroll dentro del modal.

### Comandos del bot con @botname no funcionan

El parser del bot limpia el sufijo `@botname` automaticamente:
```typescript
const command = text.split(' ')[0].split('@')[0].toLowerCase();
```
Si un comando como `/ver@MiBot` no funciona, verificar que esta linea existe en `netlify/functions/telegram-webhook.ts`.

---

## Equipo

- **Alonso** (Assistant) - @alonsix6
- **Sol** (Assistant)
- **Estef** (Coordinator)
- **Mellanie** (Practicante)

## Licencia

Uso interno de Reset R&A - Fahrenheit DDB

---

> Desarrollado para el equipo de Research & Analytics de Reset.
> Documentacion generada para que cualquier persona o agente AI pueda replicar, mantener y escalar este sistema.
