/**
 * CommonJS sibling de lib/telegramMarkdown.ts para uso desde los scripts cron.
 * Escapa _ * ` [ del texto provisto por el usuario antes de inyectarlo en
 * mensajes con parse_mode: 'Markdown'.
 */
function escapeMd(text) {
  if (!text) return '';
  return String(text).replace(/([_*`\[])/g, '\\$1');
}

module.exports = { escapeMd };
