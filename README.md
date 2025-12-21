# 🎯 Reset R&A - Sistema de Gestión de Pedidos

Sistema completo de gestión de pedidos para el equipo de Research & Analytics de Reset (agencia de medios en Lima, Perú).

## 📊 Características

- **Bot de Telegram**: Gestión conversacional de pedidos desde Telegram
- **Dashboard Web**: Vista completa con estética inspirada en Teenage Engineering OP-1
- **Recordatorios automáticos**: Notificaciones diarias a las 9AM (Lima timezone)
- **Base de datos en tiempo real**: Supabase (PostgreSQL)

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Netlify Functions (serverless)
- **Database**: Supabase (PostgreSQL)
- **Bot**: Telegram Bot API + Webhook
- **Deploy**: Netlify

## 📦 Instalación

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

## 🤖 Bot de Telegram

### Configuración del Webhook

Una vez desplegado en Netlify, configurar el webhook del bot:

```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-site.netlify.app/.netlify/functions/telegram-webhook"}'
```

### Comandos disponibles

- `/ayuda` - Ver todos los comandos disponibles
- `/ver` - Ver todos los pedidos activos
- `/mios` - Ver pedidos asignados a ti
- `/hoy` - Pedidos que vencen hoy
- `/semana` - Pedidos de esta semana
- `/urgente` - Pedidos urgentes (< 2 días)
- `/nuevopedido` - Crear nuevo pedido (próximamente)
- `/completar` - Marcar pedido como completado (próximamente)

## 🎨 Diseño - Estética OP-1

El diseño está inspirado en el Teenage Engineering OP-1, con:

- **Paleta de colores**: Grises + naranja como acento
- **Tipografía**: Monospace (JetBrains Mono, SF Mono)
- **Botones**: Estilo físico con sombras y efecto pressed
- **Cards**: Minimalistas con bordes sutiles
- **Animaciones**: Smooth pero snappy (100-200ms)

## 📁 Estructura del Proyecto

```
reset-pedidos/
├── app/                       # Next.js App Router
│   ├── dashboard/            # Dashboard principal
│   │   ├── components/       # Componentes del dashboard
│   │   └── page.tsx
│   ├── globals.css           # Estilos globales (tema OP-1)
│   ├── layout.tsx
│   └── page.tsx
├── lib/                      # Librerías compartidas
│   ├── supabase.ts          # Cliente de Supabase
│   ├── telegram.ts          # Helpers del bot
│   ├── types.ts             # TypeScript types
│   └── utils.ts             # Utilidades
├── netlify/
│   └── functions/
│       └── telegram-webhook.ts  # Webhook del bot
├── .env.local               # Variables de entorno (NO COMMITEAR)
├── .env.example             # Ejemplo de variables
├── netlify.toml             # Configuración de Netlify
└── package.json
```

## 🗄️ Base de Datos (Supabase)

### Tablas

- **users**: Usuarios del equipo
- **requests**: Pedidos
- **activity_log**: Historial de cambios
- **conversation_state**: Estados del bot

Las tablas ya están creadas en Supabase con datos de ejemplo.

## 🚢 Deploy a Netlify

1. **Conectar repositorio a Netlify**:
   - Ir a Netlify Dashboard
   - New site from Git
   - Seleccionar GitHub y el repositorio

2. **Configurar variables de entorno**:
   En Netlify: Site settings → Environment variables, agregar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`

3. **Deploy**:
   Netlify detectará automáticamente Next.js y usará la configuración de `netlify.toml`

4. **Configurar webhook del bot**:
   Ver sección "Bot de Telegram" arriba

## ⏰ Recordatorio Diario (Próximamente)

El recordatorio diario se configurará con GitHub Actions:
- Horario: 9AM Lima (14:00 UTC), Lunes a Viernes
- Envía resumen de pedidos urgentes al grupo de Telegram

## 🔐 Seguridad

- ✅ Service Role Key solo en server-side
- ✅ Anon Key está OK en frontend (RLS en Supabase)
- ✅ .env.local en .gitignore
- ✅ Validación de usuarios autorizados en el bot

## 🌍 Timezone

Todo el sistema usa la zona horaria de Lima, Perú (UTC-5):
- Fechas mostradas en formato dd/MM/yyyy
- Recordatorios a las 9AM hora de Lima
- Cálculos de deadlines en timezone local

## 📝 Próximos Features

- [ ] Comando `/nuevopedido` con flujo conversacional
- [ ] Comando `/completar` para marcar pedidos listos
- [ ] Recordatorio automático diario (GitHub Actions)
- [ ] Modal en dashboard para crear pedidos
- [ ] Editar y eliminar pedidos desde el dashboard
- [ ] Analytics y métricas del equipo
- [ ] Exportar reportes

## 👥 Equipo

- **Alonso** (Analyst) - @alonsix6
- **Sol** (Assistant)
- **Estef** (Coordinator)

## 📄 Licencia

Uso interno de Reset R&A - Fahrenheit DDB

---

Desarrollado con ❤️ para el equipo de Research & Analytics de Reset
