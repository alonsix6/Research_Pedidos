# 🚀 Guía de Deployment

## Pre-requisitos

- [ ] Cuenta de Netlify
- [ ] Cuenta de GitHub
- [ ] Base de datos configurada en Supabase
- [ ] Bot de Telegram creado

## Paso 1: Configurar Netlify

1. Ir a [Netlify](https://netlify.com) y hacer login
2. Click en "Add new site" → "Import an existing project"
3. Conectar con GitHub y seleccionar el repositorio `Research_Pedidos`
4. Configuración de build:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Functions directory**: `netlify/functions`

## Paso 2: Variables de Entorno

En Netlify Dashboard → Site settings → Environment variables, agregar **todas** las siguientes. Si falta alguna, la app **falla en runtime** (no en build) con un error explícito de `validateEnv.ts`.

```
NEXT_PUBLIC_SUPABASE_URL=<tu-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-supabase-anon-key>
NEXT_PUBLIC_TEAM_ID=<uuid-del-team-en-tabla-teams>
SUPABASE_SERVICE_ROLE_KEY=<tu-supabase-service-role-key>
TEAM_ID=<mismo-uuid-que-NEXT_PUBLIC_TEAM_ID>
TELEGRAM_BOT_TOKEN=<tu-telegram-bot-token>
TELEGRAM_CHAT_ID=<tu-telegram-chat-id>
TELEGRAM_WEBHOOK_SECRET=<openssl rand -hex 32>
```

**Nota:** Obtén estos valores de:

- Supabase: Project Settings → API → Project URL y API Keys
- Telegram: @BotFather (bot token) y chat ID del grupo
- `NEXT_PUBLIC_TEAM_ID` y `TEAM_ID` deben ser **el mismo UUID** (uno viaja al browser, el otro queda en server)
- `TELEGRAM_WEBHOOK_SECRET`: generar con `openssl rand -hex 32`. Sin él, el webhook rechaza los requests de Telegram con 401.

### GitHub Actions (cron jobs)

En GitHub repo → Settings → Secrets and variables → Actions, replicar todas las anteriores **excepto** `SITE_URL` que también hace falta para `check-webhook`:

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, TELEGRAM_BOT_TOKEN,
TELEGRAM_CHAT_ID, TELEGRAM_WEBHOOK_SECRET, TEAM_ID, SITE_URL
```

`SITE_URL` = la URL pública de Netlify (ej. `https://research-pedidos.netlify.app`).

## Paso 3: Deploy

1. Click en "Deploy site"
2. Esperar a que termine el build
3. Netlify te dará una URL (ej: `https://reset-pedidos.netlify.app`)

## Paso 4: Configurar Webhook de Telegram

Una vez que el sitio esté desplegado, configurar el webhook:

```bash
curl -X POST https://api.telegram.org/bot<TU_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://TU-SITIO.netlify.app/.netlify/functions/telegram-webhook"}'
```

Reemplazar:

- `<TU_BOT_TOKEN>` con tu token de Telegram Bot
- `TU-SITIO` con tu URL de Netlify

### Verificar Webhook

```bash
curl https://api.telegram.org/bot<TU_BOT_TOKEN>/getWebhookInfo
```

Deberías ver tu URL configurada.

## Paso 5: Probar el Bot

1. Ir a Telegram y buscar `@Research_Pedidos_bot`
2. Enviar `/ayuda` - Deberías recibir el mensaje de ayuda
3. Enviar `/ver` - Deberías ver los pedidos activos

## Paso 6: Acceder al Dashboard

Ir a `https://TU-SITIO.netlify.app/dashboard` para ver el dashboard web.

## Troubleshooting

### El bot no responde

1. Verificar que el webhook esté configurado correctamente
2. Ver los logs en Netlify Functions
3. Verificar las variables de entorno

### Error en el dashboard

1. Verificar que las variables de Supabase estén correctamente configuradas
2. Ver la consola del navegador para errores
3. Verificar conexión a Supabase

### Build falla

1. Verificar que todas las dependencias estén en `package.json`
2. Ver los logs de build en Netlify
3. Probar `npm run build` localmente

## Comandos útiles

```bash
# Ver logs del webhook
netlify functions:log telegram-webhook

# Redeploy manual
git commit --allow-empty -m "Trigger redeploy"
git push

# Ver status del sitio
netlify status
```

## Próximos pasos

- [ ] Implementar comando `/nuevopedido`
- [ ] Implementar comando `/completar`
- [ ] Configurar GitHub Actions para recordatorio diario
- [ ] Agregar funcionalidad de edición en el dashboard
- [ ] Implementar analytics

---

¿Problemas? Contacta a @alonsix6
