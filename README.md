# Sistema de Gestión de Pedidos — Multi-Team

> Sistema completo de gestión de pedidos para equipos de trabajo. Dashboard web en tiempo real + Bot de Telegram + Recordatorios automáticos.
> Arquitectura multi-tenant: un solo Supabase, múltiples dashboards y bots, cada uno aislado por `team_id`.

---

## Tabla de Contenidos

- [Arquitectura General](#arquitectura-general)
- [Arquitectura Multi-Team](#arquitectura-multi-team)
  - [Cómo Funciona el Aislamiento](#cómo-funciona-el-aislamiento)
  - [Diagrama de Deploys](#diagrama-de-deploys)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Base de Datos (Supabase)](#base-de-datos-supabase)
  - [Tablas](#tablas)
  - [Schema SQL Completo](#schema-sql-completo)
  - [Relaciones entre Tablas](#relaciones-entre-tablas)
  - [Índices](#índices)
  - [Row Level Security (RLS)](#row-level-security-rls)
  - [Habilitar Realtime](#habilitar-realtime)
- [Variables de Entorno](#variables-de-entorno)
- [Instalación y Setup desde Cero](#instalación-y-setup-desde-cero)
- [Agregar un Nuevo Team](#agregar-un-nuevo-team)
- [Bot de Telegram](#bot-de-telegram)
- [Dashboard Web](#dashboard-web)
- [Deploy a Netlify](#deploy-a-netlify)
- [GitHub Actions (Cron Jobs)](#github-actions-cron-jobs)
- [Seguridad](#seguridad)
- [Troubleshooting](#troubleshooting)

---

## Arquitectura General

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
|  - CRUD pedidos  |    | - teams           |    | - /nuevopedido   |
|  - Realtime      |    | - users           |    | - /ver, /mios    |
|  - Filtros       |    | - requests        |    | - /completar     |
|  - Drag & Drop   |    | - activity_log    |    | - Inline buttons |
|  - Historial     |    | - conversation_   |    | - Flujo guiado   |
+------------------+    |   state           |    +------------------+
        |               +-------------------+            |
        v                       ^                        v
   Netlify CDN            Supabase Realtime        Telegram API
   (Static +              (WebSocket)              (Webhook)
    Functions)
```

### Flujo de Datos

1. **Dashboard Web** → Supabase vía `@supabase/supabase-js` con Anon Key (filtrado por `team_id`)
2. **Realtime** → Suscripción al canal `requests-changes` con filtro `team_id=eq.<UUID>`
3. **Bot de Telegram** → Webhook en Netlify Function, usa Service Role Key, filtra por `TEAM_ID`
4. **Daily Reminder** → GitHub Actions ejecuta `scripts/daily-reminder.js` a las 9AM Lima (L-V)
5. **Webhook Check** → GitHub Actions verifica cada 6h que el webhook está activo

---

## Arquitectura Multi-Team

El sistema usa **multi-tenancy con `team_id`**: una sola base de datos Supabase compartida por todos los equipos, con aislamiento de datos a nivel de aplicación.

### Cómo Funciona el Aislamiento

Cada tabla principal tiene una columna `team_id` (UUID). Cada deploy (dashboard + bot) recibe su propio `team_id` via variables de entorno:

| Capa                            | Variable              | Efecto                                                            |
| ------------------------------- | --------------------- | ----------------------------------------------------------------- |
| **Frontend** (browser)          | `NEXT_PUBLIC_TEAM_ID` | Todas las queries del dashboard agregan `.eq('team_id', TEAM_ID)` |
| **Backend** (Netlify Functions) | `TEAM_ID`             | El bot filtra todos los comandos por `team_id`                    |
| **Cron** (GitHub Actions)       | `TEAM_ID`             | El daily reminder solo envía pedidos del equipo                   |
| **Realtime**                    | Filtro automático     | Suscripción usa `filter: team_id=eq.<UUID>`                       |

**Archivos que implementan el filtro:**

| Archivo                                     | Qué filtra                                                 |
| ------------------------------------------- | ---------------------------------------------------------- |
| `lib/hooks/useRealtimeRequests.ts`          | Fetch inicial + suscripción Realtime de pedidos            |
| `lib/hooks/useTeamMembers.ts`               | Lista de miembros del equipo                               |
| `lib/hooks/useTeamInfo.ts`                  | Nombre del equipo (para el título del dashboard)           |
| `app/dashboard/components/PedidoModal.tsx`  | Crear/editar pedidos + cargar usuarios                     |
| `app/dashboard/components/HistoryModal.tsx` | Historial de pedidos completados                           |
| `app/dashboard/page.tsx`                    | Completar/eliminar pedidos                                 |
| `netlify/functions/telegram-webhook.ts`     | Todos los comandos del bot (/ver, /mios, /completar, etc.) |
| `lib/conversation.ts`                       | Estado conversacional del bot (get/save/clear)             |
| `lib/telegram.ts`                           | Helpers del bot                                            |
| `scripts/daily-reminder.js`                 | Recordatorio diario filtrado por equipo                    |

> **Nota:** `TEAM_ID` (server) y `NEXT_PUBLIC_TEAM_ID` (cliente) son **obligatorios**. Si faltan, la app falla rápido con un error explícito en lugar de filtrar silenciosamente sin team (comportamiento anterior). Definirlos en Netlify env vars y en GitHub Actions secrets.

### Diagrama de Deploys

```
                          ┌─────────────────────────┐
                          │     SUPABASE (único)     │
                          │                          │
                          │  teams ─┐                │
                          │  users ─┤ todo tiene     │
                          │  requests ┤ team_id      │
                          │  activity_log ┤          │
                          │  conversation_state ┘    │
                          └─────────┬───────────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                   │
    ┌────────────▼──────┐  ┌───────▼────────┐  ┌──────▼───────────┐
    │  Netlify Deploy 1 │  │ Netlify Deploy 2│  │ Netlify Deploy N │
    │  (Team: Reset RA) │  │ (Team: Otro)    │  │ (Team: ...)      │
    │                   │  │                  │  │                  │
    │  TEAM_ID=aaa-111  │  │ TEAM_ID=bbb-222 │  │ TEAM_ID=ccc-333  │
    │  BOT_TOKEN=bot1   │  │ BOT_TOKEN=bot2  │  │ BOT_TOKEN=bot3   │
    │  CHAT_ID=grupo1   │  │ CHAT_ID=grupo2  │  │ CHAT_ID=grupo3   │
    └───────────────────┘  └─────────────────┘  └──────────────────┘
```

Cada deploy de Netlify es **el mismo código** (mismo repo o fork), solo cambian las variables de entorno.

---

## Stack Tecnológico

| Capa            | Tecnología              | Propósito                   |
| --------------- | ----------------------- | --------------------------- |
| **Frontend**    | Next.js 14 (App Router) | Framework React con SSR/SSG |
| **Lenguaje**    | TypeScript 5.x          | Tipado estático             |
| **Estilos**     | Tailwind CSS 3.4.x      | Utility-first CSS           |
| **Animaciones** | Framer Motion 12.x      | Animaciones declarativas    |
| **Drag & Drop** | dnd-kit 6.x             | Reordenamiento de pedidos   |
| **Fechas**      | date-fns + date-fns-tz  | Timezone Lima (UTC-5)       |
| **PWA**         | Serwist 9.x             | Service Worker / offline    |
| **Database**    | Supabase (PostgreSQL)   | DB + Realtime + Auth        |
| **Serverless**  | Netlify Functions       | Webhook del bot             |
| **Deploy**      | Netlify                 | Hosting + CDN + Functions   |
| **Cron**        | GitHub Actions          | Tareas programadas          |
| **Bot**         | Telegram Bot API        | Interfaz de chat            |

---

## Estructura del Proyecto

```
Research_Pedidos/
├── app/                              # Next.js App Router
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── controls/             # Controles UI (Button3D, CalendarPicker, etc.)
│   │   │   ├── device/               # Componentes del "dispositivo" OP-1
│   │   │   ├── PedidoModal.tsx       # Modal crear/editar pedido
│   │   │   ├── PedidoPad.tsx         # Tarjeta individual de pedido
│   │   │   ├── HistoryModal.tsx      # Modal historial (pedidos completados)
│   │   │   └── ...
│   │   └── page.tsx                  # Página principal del dashboard
│   ├── globals.css                   # Sistema de diseño (variables CSS, temas)
│   ├── layout.tsx                    # Layout raíz
│   └── page.tsx                      # Landing (redirige a /dashboard)
│
├── lib/
│   ├── hooks/
│   │   ├── useRealtimeRequests.ts    # Fetch + Realtime (filtrado por team_id)
│   │   ├── useTeamMembers.ts         # Miembros del equipo (filtrado por team_id)
│   │   ├── useTeamInfo.ts            # Info del equipo (nombre, slug)
│   │   ├── useSettings.tsx           # Context: tema, sonido, vista
│   │   ├── useTheme.ts              # Dark/light mode
│   │   └── useKeyboardShortcuts.ts   # Atajos de teclado
│   ├── supabase.ts                   # Cliente dual: getSupabase() + getSupabaseAdmin()
│   ├── conversation.ts              # CRUD estado conversacional (filtrado por team_id)
│   ├── telegram.ts                   # Helpers Telegram (filtrado por team_id)
│   ├── types.ts                      # Interfaces TypeScript (Team, User, Request, etc.)
│   ├── utils.ts                      # Utilidades: timezone Lima, prioridad, formateo
│   └── validateEnv.ts               # Validación de env vars
│
├── netlify/functions/
│   └── telegram-webhook.ts           # Webhook del bot (filtrado por team_id)
│
├── scripts/
│   ├── daily-reminder.js             # Recordatorio diario (filtrado por team_id)
│   ├── weekly-summary.js             # Resumen semanal (filtrado por team_id)
│   └── insert-users.sql              # SQL para insertar usuarios
│
├── .github/workflows/
│   ├── daily-reminder.yml            # Cron: 9AM Lima, L-V
│   ├── weekly-summary.yml            # Cron: Viernes 3PM Lima
│   └── check-webhook.yml             # Cron: cada 6h, verifica webhook
│
├── .env.example                      # Template de variables de entorno
├── netlify.toml                      # Config Netlify
├── tailwind.config.ts
├── tsconfig.json
├── next.config.mjs
└── package.json
```

---

## Base de Datos (Supabase)

### Tablas

El sistema tiene **5 tablas**:

| Tabla                | Propósito                                       | Tiene `team_id` |
| -------------------- | ----------------------------------------------- | :-------------: |
| `teams`              | Registro de equipos (nombre, slug)              |        —        |
| `users`              | Miembros del equipo, vinculados por Telegram ID |       ✅        |
| `requests`           | Pedidos/tareas (tabla principal)                |       ✅        |
| `activity_log`       | Historial de cambios (auditoría)                |       ✅        |
| `conversation_state` | Estado del flujo conversacional del bot         |       ✅        |

### Schema SQL Completo

Ejecutar en el **SQL Editor de Supabase** (en orden):

```sql
-- ============================================================
-- SCHEMA COMPLETO: Sistema de Gestión de Pedidos (Multi-Team)
-- ============================================================

-- 1. TABLA: teams
-- Registro de equipos. Cada deploy usa un team_id distinto.
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- identificador corto: 'reset-ra', 'equipo-b'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: users
-- Miembros del equipo, vinculados por su Telegram ID.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id TEXT UNIQUE NOT NULL,
  telegram_username TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('analyst', 'assistant', 'coordinator', 'practicante')),
  team_id UUID NOT NULL REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: requests
-- Pedidos/tareas del equipo (tabla principal).
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES teams(id)
);

-- 4. TABLA: activity_log
-- Historial de cambios en pedidos (auditoría).
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES teams(id)
);

-- 5. TABLA: conversation_state
-- Estado del flujo conversacional del bot de Telegram.
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_state (
  chat_id TEXT NOT NULL,
  user_id TEXT,
  step TEXT NOT NULL DEFAULT 'idle',
  data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  team_id UUID REFERENCES teams(id),
  PRIMARY KEY (chat_id, COALESCE(user_id, ''))
);
```

### Relaciones entre Tablas

```
teams
├── users.team_id            →  teams.id  (FK, NOT NULL)
├── requests.team_id         →  teams.id  (FK, NOT NULL)
├── activity_log.team_id     →  teams.id  (FK, NOT NULL)
└── conversation_state.team_id → teams.id (FK, nullable)

users
├── requests.assigned_to     →  users.id  (FK, ON DELETE SET NULL)
├── requests.created_by      →  users.id  (FK, NOT NULL)
└── activity_log.user_id     →  users.id  (FK, ON DELETE SET NULL)

requests
└── activity_log.request_id  →  requests.id  (FK, ON DELETE CASCADE)

conversation_state
└── (PK compuesto: chat_id + COALESCE(user_id, ''))
```

### Índices

```sql
-- Performance: queries frecuentes
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_deadline ON requests(deadline);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_requests_created_by ON requests(created_by);
CREATE INDEX IF NOT EXISTS idx_activity_log_request_id ON activity_log(request_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Multi-tenancy: filtros por team_id
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_requests_team_id ON requests(team_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_team_id ON activity_log(team_id);
```

### Row Level Security (RLS) — modelo F2.1-soft

El proyecto **NO tiene auth real** (login con Supabase Auth). El aislamiento entre teams es **best-effort**:

- En la app, cada query incluye `.eq('team_id', getRequiredTeamId())` (lib/teamId.ts).
- En la BD, las policies sólo aceptan filas con `team_id IS NOT NULL` para limitar daño accidental.
- Las tablas que el frontend NO escribe (`users`, `teams`, `conversation_state`) están **cerradas a anon**: sólo `service_role` (webhook + admin) puede tocarlas.
- Un trigger BEFORE UPDATE en `requests` impide cambiar `team_id` desde anon (defensa contra "robar" filas entre teams).
- `processed_telegram_updates` y `conversation_state` tienen RLS habilitada y **cero policies** → cualquier acceso anon devuelve 0 filas / 42501.

Las migraciones que aplican esto viven en `supabase/migrations/`:

- `20260507000003_backfill_and_team_id_not_null_and_jsonb.sql` — NOT NULL + jsonb.
- `20260507000004_rls_policies_v2_soft.sql` — drop de policies `USING (true)`, alta de policies acotadas.
- `20260507000005_function_search_path_hardening.sql` — search_path explícito.
- `20260507000007_prevent_team_id_change_from_anon.sql` — trigger anti cross-tenant UPDATE.

> **Nota 1:** El Service Role Key (usado por webhook + cron) bypasea RLS automáticamente.
> **Nota 2:** Sin auth real, una anon key + team_id válido pueden insertar filas en otro team. Para enforcement real hay que migrar a Supabase Auth + policies con `auth.uid()` (planificado como F2-strict).

### Habilitar Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE requests;
```

O desde el dashboard de Supabase: **Database > Replication** > activar `requests`.

---

## Variables de Entorno

| Variable                        | Tipo        | Dónde se usa              | Descripción                             |
| ------------------------------- | ----------- | ------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Pública     | Frontend + Backend + Cron | URL del proyecto Supabase               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública     | Frontend + Cron           | Anon key (segura por RLS)               |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Privada** | Solo Netlify Functions    | Service role key (bypasea RLS)          |
| `NEXT_PUBLIC_TEAM_ID`           | Pública     | Frontend                  | UUID del equipo (filtra dashboard)      |
| `TEAM_ID`                       | **Privada** | Netlify Functions + Cron  | UUID del equipo (filtra bot + reminder) |
| `TELEGRAM_BOT_TOKEN`            | **Privada** | Netlify Functions + Cron  | Token del bot (@BotFather)              |
| `TELEGRAM_CHAT_ID`              | **Privada** | Netlify Functions + Cron  | ID del grupo de Telegram                |
| `TELEGRAM_WEBHOOK_SECRET`       | **Privada** | Netlify Functions + Cron  | Secret para validar webhooks            |
| `SITE_URL`                      | **Privada** | Cron (check-webhook)      | URL del sitio en Netlify                |

> **Importante:** `NEXT_PUBLIC_TEAM_ID` y `TEAM_ID` deben tener **el mismo UUID**. La diferencia es que `NEXT_PUBLIC_` es accesible en el browser y `TEAM_ID` solo en server.

### Dónde configurar cada variable

| Lugar                               | Variables                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env.local` (dev local)            | Todas                                                                                                                                                   |
| **Netlify** (Environment variables) | Todas excepto `SITE_URL`                                                                                                                                |
| **GitHub Actions** (Secrets)        | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `TEAM_ID`, `SITE_URL` |

---

## Instalación y Setup desde Cero

### 1. Clonar e instalar

```bash
git clone https://github.com/alonsix6/Research_Pedidos.git
cd Research_Pedidos
npm install
```

### 2. Configurar Supabase

1. Crear cuenta/proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar el [Schema SQL Completo](#schema-sql-completo)
3. Ejecutar los [Índices](#índices)
4. Ejecutar las [Policies de RLS](#row-level-security-rls)
5. [Habilitar Realtime](#habilitar-realtime) para la tabla `requests`
6. Ir a **Settings > API** y copiar las keys

### 3. Crear el primer equipo

```sql
INSERT INTO teams (name, slug) VALUES ('Mi Equipo', 'mi-equipo');

-- Copiar el UUID generado:
SELECT id FROM teams WHERE slug = 'mi-equipo';
-- Resultado: ej. 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- Este UUID es tu TEAM_ID y NEXT_PUBLIC_TEAM_ID
```

### 4. Insertar usuarios del equipo

```sql
INSERT INTO users (telegram_id, telegram_username, name, role, team_id)
VALUES
  ('123456789', 'juanito', 'Juan Pérez', 'analyst', 'UUID-DEL-EQUIPO'),
  ('987654321', 'maria_g', 'María García', 'coordinator', 'UUID-DEL-EQUIPO')
ON CONFLICT (telegram_id) DO UPDATE SET
  telegram_username = EXCLUDED.telegram_username,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  team_id = EXCLUDED.team_id;
```

**Roles disponibles:** `analyst`, `assistant`, `coordinator`, `practicante`

### 5. Configurar Bot de Telegram

1. Abrir Telegram → buscar **@BotFather** → `/newbot`
2. Guardar el token → `TELEGRAM_BOT_TOKEN`
3. Crear un grupo y agregar el bot
4. Obtener `TELEGRAM_CHAT_ID`:
   - Enviar un mensaje en el grupo
   - Abrir: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Buscar `"chat":{"id": -XXXXXXXXX}` → ese número negativo es el CHAT_ID
5. Generar webhook secret: `openssl rand -hex 32`

### 6. Variables de entorno local

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

NEXT_PUBLIC_TEAM_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
TEAM_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890

TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=-100123456789
TELEGRAM_WEBHOOK_SECRET=tu_secret_generado
```

### 7. Ejecutar en desarrollo

```bash
npm run dev
```

Dashboard en `http://localhost:3000/dashboard`

---

## Agregar un Nuevo Team

Para crear un dashboard y bot para **otro equipo** usando el **mismo Supabase**:

### Paso 1: Crear el equipo en la base de datos

```sql
-- Crear el equipo
INSERT INTO teams (name, slug) VALUES ('Equipo Nuevo', 'equipo-nuevo');

-- Obtener el UUID
SELECT id FROM teams WHERE slug = 'equipo-nuevo';
-- → ej. 'x1y2z3w4-...'
```

### Paso 2: Insertar usuarios del nuevo equipo

```sql
INSERT INTO users (telegram_id, telegram_username, name, role, team_id)
VALUES
  ('111222333', 'user1', 'Nombre 1', 'analyst', 'UUID-EQUIPO-NUEVO'),
  ('444555666', 'user2', 'Nombre 2', 'assistant', 'UUID-EQUIPO-NUEVO')
ON CONFLICT (telegram_id) DO UPDATE SET
  telegram_username = EXCLUDED.telegram_username,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  team_id = EXCLUDED.team_id;
```

### Paso 3: Crear un nuevo bot de Telegram

1. En @BotFather: `/newbot` → obtener nuevo `BOT_TOKEN`
2. Crear grupo de Telegram para el nuevo equipo → obtener `CHAT_ID`
3. Generar nuevo `WEBHOOK_SECRET`: `openssl rand -hex 32`

### Paso 4: Duplicar el deploy en Netlify

**Opción A: Mismo repo, nuevo site en Netlify**

1. En Netlify → **Add new site** → **Import an existing project** → seleccionar el mismo repo
2. Configurar variables de entorno con los valores del nuevo equipo:

| Variable                        | Valor                            |
| ------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | **Mismo** que el equipo original |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Mismo** que el equipo original |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Mismo** que el equipo original |
| `NEXT_PUBLIC_TEAM_ID`           | UUID del **nuevo** equipo        |
| `TEAM_ID`                       | UUID del **nuevo** equipo        |
| `TELEGRAM_BOT_TOKEN`            | Token del **nuevo** bot          |
| `TELEGRAM_CHAT_ID`              | Chat ID del **nuevo** grupo      |
| `TELEGRAM_WEBHOOK_SECRET`       | Secret del **nuevo** webhook     |

3. Deploy

**Opción B: Fork del repo (recomendado para deploys independientes)**

1. Fork del repo en GitHub
2. Conectar el fork a un nuevo site en Netlify
3. Configurar las mismas variables de arriba
4. Ahora tienes deploys totalmente independientes

### Paso 5: Configurar webhook del nuevo bot

```bash
curl -X POST "https://api.telegram.org/bot<NUEVO_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://nuevo-sitio.netlify.app/.netlify/functions/telegram-webhook",
    "secret_token": "<NUEVO_WEBHOOK_SECRET>"
  }'
```

### Paso 6: Configurar GitHub Actions para el nuevo equipo

Si usaste un fork, configura los secrets en el fork:

- `NEXT_PUBLIC_SUPABASE_URL` (mismo)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (mismo)
- `TELEGRAM_BOT_TOKEN` (nuevo)
- `TELEGRAM_CHAT_ID` (nuevo)
- `TELEGRAM_WEBHOOK_SECRET` (nuevo)
- `TEAM_ID` (nuevo)
- `SITE_URL` (URL del nuevo deploy en Netlify)

### Resumen: Qué comparten y qué no

| Recurso           | ¿Compartido? | Notas                             |
| ----------------- | :----------: | --------------------------------- |
| Supabase (DB)     |      ✅      | Mismo proyecto, misma URL y keys  |
| Código fuente     |      ✅      | Mismo repo o fork                 |
| `TEAM_ID`         |      ❌      | UUID distinto por equipo          |
| Bot de Telegram   |      ❌      | Cada equipo tiene su propio bot   |
| Grupo de Telegram |      ❌      | Cada equipo tiene su propio grupo |
| Deploy Netlify    |      ❌      | Un site por equipo                |
| GitHub Actions    |      ❌      | Un set de secrets por repo/fork   |

---

## Bot de Telegram

### Comandos

| Comando        | Descripción                      |
| -------------- | -------------------------------- |
| `/ayuda`       | Ver todos los comandos           |
| `/menu`        | Menú con botones interactivos    |
| `/ver`         | Pedidos activos del equipo       |
| `/mios`        | Pedidos asignados a ti           |
| `/hoy`         | Pedidos que vencen hoy           |
| `/semana`      | Pedidos de esta semana           |
| `/urgente`     | Pedidos urgentes (< 2 días)      |
| `/nuevopedido` | Crear pedido (flujo paso a paso) |
| `/completar`   | Marcar pedido como completado    |

### Flujo Conversacional (/nuevopedido)

```
1. /nuevopedido           → "¿Para qué cliente/cuenta?"
2. "Nike"                 → "¿Qué necesitan exactamente?"
3. "Reporte de ventas..." → "¿Quién lo solicitó?"
4. "Andrea, ejecutiva"    → "¿Fecha de entrega?"
5. "en 3 días"            → "¿Quién se encarga? (1-5)"
6. "1"                    → ✅ Pedido creado! (resumen)
```

El estado se guarda en `conversation_state` (aislado por `team_id`).

### Configurar Webhook (post-deploy)

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://tu-sitio.netlify.app/.netlify/functions/telegram-webhook",
    "secret_token": "<WEBHOOK_SECRET>"
  }'
```

### Verificar Webhook

```bash
curl -s "https://api.telegram.org/bot<TOKEN>/getWebhookInfo" | python3 -m json.tool
```

---

## Dashboard Web

### Features

- **Tiempo Real**: Actualización automática vía Supabase Realtime (filtrado por `team_id`)
- **Nombre del equipo**: Se muestra dinámicamente desde la tabla `teams`
- **CRUD Completo**: Crear, editar, completar, eliminar pedidos
- **Búsqueda y Filtros**: Por cliente, descripción, solicitante, estado, prioridad
- **Filtro por Miembro**: Estadísticas y pedidos por integrante
- **Vista Compacta**: Alternar con Alt+C
- **Modo Oscuro/Claro**: Toggle con persistencia en localStorage
- **Drag & Drop**: Reorganización de pedidos
- **Historial**: Pedidos completados con búsqueda y paginación
- **CalendarPicker**: Selector de fecha estilo LCD
- **Sonidos**: Feedback auditivo opcional (Alt+M)
- **PWA**: Service Worker para offline básico

### Atajos de Teclado

| Atajo     | Acción          |
| --------- | --------------- |
| `Alt + N` | Nuevo pedido    |
| `Alt + R` | Refrescar datos |
| `Alt + K` | Abrir búsqueda  |
| `Alt + C` | Vista compacta  |
| `Alt + M` | Toggle sonido   |
| `Alt + /` | Ver atajos      |
| `Escape`  | Cerrar modales  |

### Diseño OP-1

Inspirado en el **Teenage Engineering OP-1**:

- Paleta: Gris oscuro + cyan (`--te-cyan`) + naranja (`--te-orange`)
- LCD Display con números segmentados
- Tipografía monospace (JetBrains Mono)
- Botones 3D estilo rubber/silicone
- Indicadores LED
- Variables CSS en `app/globals.css`

---

## Deploy a Netlify

1. **Conectar repo** → Netlify > New site from Git > GitHub
2. **Build config** (auto-detectado por `netlify.toml`):
   - Build command: `npm run build`
   - Publish: `.next`
   - Functions: `netlify/functions`
3. **Variables de entorno** → Site settings > Environment variables (ver [tabla](#variables-de-entorno))
4. **Deploy** automático
5. **Post-deploy** → [Configurar webhook](#configurar-webhook-post-deploy) del bot

### netlify.toml incluye

- Build config + functions bundler (esbuild)
- Redirects: `/api/*` → `/.netlify/functions/:splat`
- Headers de seguridad: X-Frame-Options, HSTS, CSP, XSS-Protection, etc.

---

## GitHub Actions (Cron Jobs)

### Recordatorio Diario

| Config      | Valor                                                             |
| ----------- | ----------------------------------------------------------------- |
| **Archivo** | `.github/workflows/daily-reminder.yml`                            |
| **Horario** | 9:00 AM Lima = 14:00 UTC, L-V                                     |
| **Cron**    | `0 14 * * 1-5`                                                    |
| **Script**  | `scripts/daily-reminder.js`                                       |
| **Función** | Envía resumen de pedidos urgentes del equipo al grupo de Telegram |

### Resumen Semanal

| Config      | Valor                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------- |
| **Archivo** | `.github/workflows/weekly-summary.yml`                                                      |
| **Horario** | 3:00 PM Lima = 20:00 UTC, Viernes                                                           |
| **Cron**    | `0 20 * * 5`                                                                                |
| **Script**  | `scripts/weekly-summary.js`                                                                 |
| **Función** | Envía resumen de la semana: pedidos completados, pendientes, atrasados y frase motivacional |

### Verificación de Webhook

| Config      | Valor                                   |
| ----------- | --------------------------------------- |
| **Archivo** | `.github/workflows/check-webhook.yml`   |
| **Horario** | Cada 6 horas                            |
| **Cron**    | `0 */6 * * *`                           |
| **Función** | Verifica/reconfigura el webhook del bot |

### Secrets Requeridos en GitHub

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET`
- `TEAM_ID`
- `SITE_URL`

---

## Seguridad

### Aislamiento de Datos

- **Nivel de aplicación**: Todas las queries usan `.eq('team_id', TEAM_ID)`
- **Realtime**: Filtro `team_id=eq.<UUID>` en suscripciones WebSocket
- **Bot**: Solo responde a usuarios registrados en la tabla `users` con el `team_id` correcto
- **Webhook**: Validación con `X-Telegram-Bot-Api-Secret-Token` (timing-safe comparison)

### Claves de Supabase

| Key                        | Seguridad                           | Uso                    |
| -------------------------- | ----------------------------------- | ---------------------- |
| Anon Key (`NEXT_PUBLIC_*`) | Segura en frontend (RLS la protege) | Dashboard              |
| Service Role Key           | **NUNCA** en frontend               | Solo Netlify Functions |

`lib/supabase.ts` implementa el patrón dual:

- `getSupabase()` → Anon Key → frontend
- `getSupabaseAdmin()` → Service Role → server

### Headers HTTP (netlify.toml)

| Header                            | Propósito                     |
| --------------------------------- | ----------------------------- |
| `X-Frame-Options: DENY`           | Previene clickjacking         |
| `X-Content-Type-Options: nosniff` | Previene MIME sniffing        |
| `Strict-Transport-Security`       | Fuerza HTTPS                  |
| `Content-Security-Policy`         | Controla orígenes             |
| `Permissions-Policy`              | Deshabilita APIs innecesarias |

---

## Troubleshooting

### El dashboard no carga datos

1. Verificar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env.local`
2. Verificar `NEXT_PUBLIC_TEAM_ID` — si es incorrecto, no verás ningún pedido
3. Verificar que las tablas existen (ejecutar schema SQL)
4. Verificar RLS policies
5. Revisar consola del navegador

### El Realtime no funciona

1. Verificar que `requests` está en la publicación:
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```
2. Si no: `ALTER PUBLICATION supabase_realtime ADD TABLE requests;`

### El bot no responde

1. Verificar webhook: `curl -s "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`
2. Verificar que `TELEGRAM_WEBHOOK_SECRET` coincide entre Netlify y el webhook
3. Verificar que `SUPABASE_SERVICE_ROLE_KEY` está en Netlify
4. Verificar que `TEAM_ID` está en Netlify
5. Verificar que los usuarios tienen su `telegram_id` en `users` con el `team_id` correcto
6. Revisar logs de Netlify Functions

### El daily reminder no se envía

1. Verificar secrets en GitHub Actions (incluyendo `TEAM_ID`)
2. Verificar que el workflow está habilitado
3. Ejecutar manualmente: Actions > Daily Reminder > Run workflow

### Pedidos de otro equipo aparecen en mi dashboard

- Verificar que `NEXT_PUBLIC_TEAM_ID` es correcto en las variables de entorno
- Cada deploy debe tener su propio `TEAM_ID`

### Error "Missing Supabase environment variables"

El validador `lib/validateEnv.ts` detecta variables faltantes. Verificar todas según la [tabla de variables](#variables-de-entorno).

---

## Tipos TypeScript (lib/types.ts)

| Tipo                | Tabla/Uso                                                    |
| ------------------- | ------------------------------------------------------------ |
| `Team`              | Tabla `teams`                                                |
| `User`              | Tabla `users` (incluye `team_id`)                            |
| `Request`           | Tabla `requests` (incluye `team_id`)                         |
| `ActivityLog`       | Tabla `activity_log` (incluye `team_id`)                     |
| `ConversationState` | Tabla `conversation_state` (incluye `team_id`)               |
| `RequestWithUser`   | Request + usuario asignado/creador (join)                    |
| `TelegramMessage`   | Mensaje entrante de Telegram                                 |
| `TelegramUpdate`    | Update wrapper de Telegram                                   |
| `ConversationStep`  | Enum de pasos del flujo conversacional                       |
| `NewRequestData`    | Datos parciales al crear pedido                              |
| `UserRole`          | `'analyst' \| 'assistant' \| 'coordinator' \| 'practicante'` |
| `RequestStatus`     | `'pending' \| 'in_progress' \| 'completed' \| 'cancelled'`   |
| `RequestPriority`   | `'low' \| 'normal' \| 'high' \| 'urgent'`                    |

---

## Licencia

Uso interno — Desarrollado originalmente para Reset R&A (Fahrenheit DDB).

> Documentación generada para que cualquier persona o agente AI pueda replicar, mantener y escalar este sistema.
