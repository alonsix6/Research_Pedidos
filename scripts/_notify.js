/**
 * Envía una alerta a Telegram cuando un script cron falla.
 *
 * Antes los `.catch(...) -> process.exit(1)` solo dejaban el error en los logs de
 * GitHub Actions, donde nadie los lee. Esta helper notifica al chat para que el
 * equipo se entere del problema en el día.
 *
 * No usa parse_mode para evitar que un stack trace con caracteres especiales
 * (`_ * \` [` y otros) rompa el envío y la alerta se pierda silenciosamente.
 */

async function notifyCronFailure(scriptName, error) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const errMsg = (error && (error.stack || error.message)) || String(error);
  const truncated = errMsg.slice(0, 500);

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🚨 Cron "${scriptName}" falló:\n\n${truncated}`,
        // sin parse_mode: plain text es robusto frente a cualquier contenido
      }),
    });
  } catch (notifyErr) {
    console.error('Failed to notify cron failure:', notifyErr);
  }
}

module.exports = { notifyCronFailure };
