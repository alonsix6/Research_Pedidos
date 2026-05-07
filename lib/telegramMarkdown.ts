/**
 * Escapa caracteres con significado especial en el parse_mode "Markdown" (legacy) de Telegram.
 * Sin esto, un cliente o descripción que contenga _ * ` o [ rompe el envío con HTTP 400.
 *
 * Per Telegram Bot API: outside of an entity, prepend '\' before _, *, `, [.
 * https://core.telegram.org/bots/api#markdown-style
 */
export function escapeMd(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/([_*`\[])/g, '\\$1');
}
