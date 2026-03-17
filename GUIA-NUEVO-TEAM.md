# Guía: Crear un Nuevo Team (Dashboard + Bot)

> Paso a paso para duplicar el sistema para otro equipo, usando el **mismo Supabase** con un nuevo dashboard en Netlify y un nuevo bot de Telegram.

---

## Requisitos Previos

- Acceso al proyecto de Supabase existente (SQL Editor)
- Cuenta de Netlify
- Cuenta de Telegram para crear el bot
- Acceso a GitHub (para fork del repo y configurar Actions)

---

## Paso 1: Crear el equipo en Supabase

Abrir el **SQL Editor** de Supabase y ejecutar:

```sql
-- Crear el equipo
INSERT INTO teams (name, slug)
VALUES ('Nombre del Equipo', 'slug-del-equipo');

-- Copiar el UUID generado
SELECT id, name, slug FROM teams WHERE slug = 'slug-del-equipo';
```

Guardar el UUID — lo vas a necesitar en todos los pasos siguientes.

**Ejemplo:**
```
id: f8a1b2c3-d4e5-6789-abcd-ef0123456789
name: Equipo Creativo
slug: equipo-creativo
```

---

## Paso 2: Insertar usuarios del nuevo equipo

Cada miembro necesita su `telegram_id`. Para obtenerlo:
1. El usuario debe enviar un mensaje a [@userinfobot](https://t.me/userinfobot) en Telegram
2. El bot le responde con su ID numérico

Luego ejecutar en SQL Editor:

```sql
INSERT INTO users (telegram_id, telegram_username, name, role, team_id)
VALUES
  ('123456789', 'usuario1', 'Nombre Apellido', 'analyst', 'UUID-DEL-EQUIPO'),
  ('987654321', 'usuario2', 'Nombre Apellido', 'coordinator', 'UUID-DEL-EQUIPO'),
  ('555666777', 'usuario3', 'Nombre Apellido', 'assistant', 'UUID-DEL-EQUIPO')
ON CONFLICT (telegram_id) DO UPDATE SET
  telegram_username = EXCLUDED.telegram_username,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  team_id = EXCLUDED.team_id;
```

**Roles disponibles:** `analyst`, `assistant`, `coordinator`, `practicante`

### Usuarios SIN username de Telegram

El campo `telegram_username` es **opcional** (puede ser `NULL`). Lo único obligatorio es el `telegram_id` (numérico). Un usuario sin username se inserta así:

```sql
INSERT INTO users (telegram_id, telegram_username, name, role, team_id)
VALUES
  ('123456789', NULL, 'Juan Sin Username', 'analyst', 'UUID-DEL-EQUIPO')
ON CONFLICT (telegram_id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  team_id = EXCLUDED.team_id;
```

El bot identifica usuarios por `telegram_id` (su ID numérico interno), **no** por su username. Así que funciona igual con o sin username.

### Cómo obtener el telegram_id de cada usuario

El `telegram_id` es un número que Telegram asigna internamente. Para obtenerlo:

1. **Opción A:** Que el usuario le envíe un mensaje a [@userinfobot](https://t.me/userinfobot) → le responde con su ID
2. **Opción B:** Que el usuario le envíe un mensaje a [@getmyid_bot](https://t.me/getmyid_bot) → le responde con su ID
3. **Opción C (manual):** Que el usuario envíe un mensaje en el grupo donde está el bot y luego revisar:
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
   Buscar `"from":{"id": XXXXXXXXX}` para cada mensaje

### Verificar que se insertaron correctamente

```sql
SELECT name, role, telegram_username
FROM users
WHERE team_id = 'UUID-DEL-EQUIPO'
ORDER BY name;
```

---

## Paso 3: Crear el bot de Telegram

1. Abrir Telegram → buscar **@BotFather**
2. Enviar `/newbot`
3. Elegir nombre (ej: "Pedidos Equipo Creativo") y username (ej: `pedidos_creativo_bot`)
4. **Guardar el token** que te da BotFather → `TELEGRAM_BOT_TOKEN`

### Crear el grupo de Telegram

1. Crear un nuevo grupo en Telegram
2. Agregar al bot recién creado como miembro
3. Enviar cualquier mensaje en el grupo
4. Abrir en el navegador:
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
5. Buscar `"chat":{"id": -XXXXXXXXX}` → ese número negativo es el `TELEGRAM_CHAT_ID`

### Generar webhook secret

```bash
openssl rand -hex 32
```

Guardar el resultado → `TELEGRAM_WEBHOOK_SECRET`

---

## Qué personalizar para el nuevo equipo

### En el Bot (no requiere cambios de código)

El bot funciona automáticamente con las variables de entorno. No necesitas tocar código. Lo que debes saber:

| Aspecto | Comportamiento | Dónde se configura |
|---------|---------------|-------------------|
| **Quién puede usar el bot** | Solo usuarios de la tabla `users` con el `team_id` del equipo. Si alguien no registrado escribe, recibe: "No estás autorizado" | Tabla `users` en Supabase |
| **Quién aparece para asignar pedidos** | Solo miembros del equipo (filtrado por `team_id`) | Tabla `users` en Supabase |
| **Qué pedidos muestra /ver** | Solo pedidos del equipo (filtrado por `team_id`) | Variable `TEAM_ID` en Netlify |
| **A qué grupo envía recordatorios** | Al grupo configurado en `TELEGRAM_CHAT_ID` | Variable en Netlify + GitHub Secrets |
| **Nombre/username del bot** | Se configura en @BotFather, no en el código | @BotFather en Telegram |

**Para agregar un usuario nuevo al bot después del setup:**
```sql
INSERT INTO users (telegram_id, telegram_username, name, role, team_id)
VALUES ('TELEGRAM_ID', 'username_o_null', 'Nombre', 'rol', 'UUID-EQUIPO')
ON CONFLICT (telegram_id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  team_id = EXCLUDED.team_id;
```
No hay que reiniciar nada. El cambio es inmediato.

**Para quitar un usuario del bot:**
```sql
DELETE FROM users WHERE telegram_id = 'TELEGRAM_ID' AND team_id = 'UUID-EQUIPO';
```

### En el Dashboard (no requiere cambios de código)

| Aspecto | Comportamiento | Dónde se configura |
|---------|---------------|-------------------|
| **Nombre del equipo en el título** | Se lee dinámicamente de la tabla `teams` | Columna `name` en tabla `teams` |
| **Miembros en el dropdown de asignar** | Solo los del equipo | Tabla `users` filtrada por `team_id` |
| **Pedidos que muestra** | Solo los del equipo | Variable `NEXT_PUBLIC_TEAM_ID` |
| **Realtime (actualizaciones en vivo)** | Solo recibe cambios del equipo | Filtro automático por `team_id` |
| **Historial de completados** | Solo del equipo | Filtrado por `team_id` |

### Si quieres personalizar la apariencia

Estos cambios sí requieren modificar código (por eso conviene un fork):

| Qué cambiar | Archivo |
|-------------|---------|
| Colores / tema | `app/globals.css` (variables `--te-cyan`, `--te-orange`, etc.) |
| Logo o título fijo | `app/layout.tsx` (metadata) |
| Landing page | `app/page.tsx` |
| Diseño de las tarjetas | `app/dashboard/components/PedidoPad.tsx` |
| Roles disponibles | Tabla `users` CHECK constraint + `lib/types.ts` (`UserRole`) |

---

## Paso 4: Fork del repositorio

1. Ir a [github.com/alonsix6/Research_Pedidos](https://github.com/alonsix6/Research_Pedidos)
2. Click en **Fork** (esquina superior derecha)
3. Elegir tu cuenta/organización
4. Clonar el fork:
   ```bash
   git clone https://github.com/TU-USUARIO/Research_Pedidos.git
   cd Research_Pedidos
   npm install
   ```

> **Alternativa sin fork:** Puedes conectar el mismo repo original a un segundo site de Netlify. Pero el fork te da independencia para customizar el dashboard si quieres.

---

## Paso 5: Deploy en Netlify

### 5.1 Crear nuevo site

1. Ir a [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project**
2. Conectar con GitHub → seleccionar el fork (o el repo original)
3. Netlify detecta automáticamente la configuración de `netlify.toml`

### 5.2 Configurar variables de entorno

En **Site settings > Environment variables**, agregar:

| Variable | Valor | Notas |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | **Mismo** que el equipo original |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | **Mismo** que el equipo original |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **Mismo** que el equipo original |
| `NEXT_PUBLIC_TEAM_ID` | `f8a1b2c3-d4e5-...` | UUID del **nuevo** equipo (Paso 1) |
| `TEAM_ID` | `f8a1b2c3-d4e5-...` | **Mismo UUID** que `NEXT_PUBLIC_TEAM_ID` |
| `TELEGRAM_BOT_TOKEN` | `123456:ABC-DEF...` | Token del **nuevo** bot (Paso 3) |
| `TELEGRAM_CHAT_ID` | `-100123456789` | Chat ID del **nuevo** grupo (Paso 3) |
| `TELEGRAM_WEBHOOK_SECRET` | `a1b2c3d4...` | Secret **nuevo** (Paso 3) |

> **Importante:** Las 3 variables de Supabase son las mismas para todos los equipos. Lo que cambia es `TEAM_ID`, el bot y el grupo.

### 5.3 Deploy

Click en **Deploy site**. Esperar a que termine el build.

Guardar la URL del sitio (ej: `https://pedidos-creativo.netlify.app`) → la necesitas para el webhook.

---

## Paso 6: Configurar webhook del bot

Una vez que Netlify terminó el deploy, ejecutar en terminal:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://TU-SITIO.netlify.app/.netlify/functions/telegram-webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"
  }'
```

### Verificar que el webhook está activo

```bash
curl -s "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo" | python3 -m json.tool
```

Deberías ver:
```json
{
  "ok": true,
  "result": {
    "url": "https://TU-SITIO.netlify.app/.netlify/functions/telegram-webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## Paso 7: Configurar GitHub Actions

En el fork en GitHub, ir a **Settings > Secrets and variables > Actions** y agregar:

| Secret | Valor |
|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Mismo que siempre |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Mismo que siempre |
| `TELEGRAM_BOT_TOKEN` | Token del **nuevo** bot |
| `TELEGRAM_CHAT_ID` | Chat ID del **nuevo** grupo |
| `TELEGRAM_WEBHOOK_SECRET` | Secret del **nuevo** webhook |
| `TEAM_ID` | UUID del **nuevo** equipo |
| `SITE_URL` | URL del **nuevo** sitio Netlify |

### Verificar que los workflows están habilitados

1. Ir a **Actions** en el fork
2. Si dice "Workflows aren't being run", click en **I understand my workflows, go ahead and enable them**
3. Verificar que aparecen:
   - **Daily Reminder** (L-V 9AM Lima)
   - **Weekly Summary** (Viernes 3PM Lima)
   - **Check Webhook** (cada 6h)

### Probar manualmente

En cada workflow, click en **Run workflow** para verificar que funciona.

---

## Paso 8: Probar todo

### Dashboard
1. Abrir `https://TU-SITIO.netlify.app/dashboard`
2. Verificar que muestra el nombre del equipo en el título
3. Crear un pedido de prueba
4. Verificar que aparece en tiempo real

### Bot
1. En el grupo de Telegram, enviar `/ayuda`
2. El bot debe responder con la lista de comandos
3. Probar `/nuevopedido` para crear un pedido desde Telegram
4. Verificar que aparece en el dashboard

### Aislamiento
1. El dashboard del nuevo equipo **NO** debe mostrar pedidos de otros equipos
2. El bot del nuevo equipo **NO** debe listar usuarios de otros equipos
3. Verificar con `/ver` que solo muestra pedidos del equipo

---

## Resumen: Qué se comparte y qué no

| Recurso | ¿Compartido entre equipos? |
|---------|:---:|
| Proyecto Supabase (URL + keys) | ✅ Compartido |
| Base de datos (tablas) | ✅ Compartido (aislado por `team_id`) |
| Código fuente | ✅ Compartido (mismo repo o fork) |
| `TEAM_ID` | ❌ Único por equipo |
| Bot de Telegram | ❌ Uno por equipo |
| Grupo de Telegram | ❌ Uno por equipo |
| Site de Netlify | ❌ Uno por equipo |
| GitHub Actions secrets | ❌ Uno por repo/fork |

---

## Checklist Rápido

```
[ ] Equipo creado en tabla `teams` (tengo el UUID)
[ ] Usuarios insertados en tabla `users` con el team_id correcto
[ ] Bot creado en @BotFather (tengo el token)
[ ] Grupo de Telegram creado (tengo el chat_id)
[ ] Webhook secret generado
[ ] Fork/clone del repo
[ ] Nuevo site en Netlify con variables de entorno configuradas
[ ] Deploy exitoso
[ ] Webhook configurado (curl setWebhook)
[ ] Webhook verificado (curl getWebhookInfo)
[ ] GitHub Actions secrets configurados
[ ] Workflows habilitados en el fork
[ ] Dashboard carga y muestra nombre del equipo
[ ] Bot responde a /ayuda en el grupo
[ ] Pedido creado desde dashboard aparece correctamente
[ ] Pedido creado desde bot aparece en dashboard
[ ] NO se ven pedidos de otros equipos
```

---

## Troubleshooting

### El dashboard no muestra datos
- Verificar `NEXT_PUBLIC_TEAM_ID` en Netlify → debe ser el UUID exacto del equipo
- Verificar que hay usuarios y pedidos con ese `team_id` en Supabase

### El bot no responde
- Verificar webhook: `curl -s "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`
- Verificar que `TEAM_ID`, `SUPABASE_SERVICE_ROLE_KEY` están en las env vars de Netlify
- Verificar que los usuarios del grupo están en la tabla `users` con el `team_id` correcto

### Veo pedidos de otro equipo
- `NEXT_PUBLIC_TEAM_ID` o `TEAM_ID` están mal configurados o vacíos
- Cada deploy debe tener su propio UUID de equipo

### El daily reminder no llega
- Verificar que `TEAM_ID` está en los secrets de GitHub Actions
- Ejecutar el workflow manualmente para ver errores en los logs

### Error al hacer deploy en Netlify
- Verificar que las 3 variables de Supabase están configuradas
- Verificar que `NEXT_PUBLIC_TEAM_ID` no tiene espacios extra
