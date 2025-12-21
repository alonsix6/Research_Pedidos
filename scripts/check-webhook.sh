#!/bin/bash
# Script para verificar y reconfigurar el webhook si es necesario
# Ejecutar: ./scripts/check-webhook.sh

TELEGRAM_BOT_TOKEN="8417267252:AAHgYJxBjFgPNH2CPXyMu9N5t651600ZQ2Y"
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
