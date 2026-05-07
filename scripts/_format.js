/**
 * Helpers de formateo compartidos entre scripts cron.
 * Sibling CJS de lib/utils.ts (frontend) — mantienen el mismo mapeo de emojis.
 */

function getPriorityEmoji(priority) {
  switch (priority) {
    case 'urgent':
      return '🔴';
    case 'high':
      return '🟡';
    case 'normal':
      return '🟢';
    case 'low':
      return '⚪';
    default:
      return '⚪';
  }
}

module.exports = { getPriorityEmoji };
