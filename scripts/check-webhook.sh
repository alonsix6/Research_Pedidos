#!/bin/bash
# Script para verificar y reconfigurar el webhook si es necesario
# Ejecutar: TELEGRAM_BOT_TOKEN=your_token ./scripts/check-webhook.sh

# Usar variable de entorno (no hardcodear tokens)
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "❌ Error: TELEGRAM_BOT_TOKEN no está configurado"
  echo "   Ejecuta: TELEGRAM_BOT_TOKEN=tu_token ./scripts/check-webhook.sh"
  exit 1
fi

WEBHOOK_URL="https://research-pedidos.netlify.app/.netlify/functions/telegram-webhook"

echo "🔍 Verificando webhook de Telegram..."

# Obtener info del webhook
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo")

# Extraer URL actual
CURRENT_URL=$(echo "$WEBHOOK_INFO" | python3 -c "import sys, json; print(json.load(sys.stdin)['result'].get('url', ''))")

echo "📍 URL actual: ${CURRENT_URL:-'(vacío)'}"

if [ "$CURRENT_URL" != "$WEBHOOK_URL" ]; then
  echo "⚠️  Webhook desconfigurado. Reconfigurando..."

  curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${WEBHOOK_URL}\"}"

  echo ""
  echo "✅ Webhook reconfigurado!"
else
  echo "✅ Webhook configurado correctamente"
fi

# Mostrar info completa
echo ""
echo "📊 Info completa del webhook:"
echo "$WEBHOOK_INFO" | python3 -m json.tool
