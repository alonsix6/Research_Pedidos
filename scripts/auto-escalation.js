/**
 * Script de auto-escalación
 * Se ejecuta diariamente via GitHub Actions
 * - Pedidos sin cambio de estado >2 días → notificar
 * - Pedidos bloqueados >3 días → escalación
 * - Pedidos overdue → cambiar prioridad a urgent
 */

const { createClient } = require('@supabase/supabase-js');
const { daysUntilLimaDate, daysSinceLimaTimestamp } = require('./_dateUtils');
const { escapeMd } = require('./_telegramMarkdown');
const { notifyCronFailure } = require('./_notify');

// Variables de entorno
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TEAM_ID = process.env.TEAM_ID;

// TEAM_ID obligatorio: sin él, el filtro se omitía y el script veía datos de todos los teams.
if (!SUPABASE_URL || !SUPABASE_KEY || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !TEAM_ID) {
  console.error('❌ Error: Faltan variables de entorno necesarias (incluyendo TEAM_ID)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId, text) {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      console.error('Telegram error:', await response.text());
    }
  } catch (err) {
    console.error('Error sending message:', err);
  }
}

async function main() {
  console.log('🔍 Running auto-escalation checks...');

  const { data: requests, error } = await supabase
    .from('requests')
    .select('*')
    .eq('team_id', TEAM_ID)
    .not('status', 'in', '("completed","cancelled")')
    .order('deadline', { ascending: true });

  if (error) {
    throw new Error(`Error fetching requests: ${error.message}`);
  }

  if (!requests || requests.length === 0) {
    console.log('✅ No active requests.');
    return;
  }

  const staleRequests = [];
  const longBlockedRequests = [];
  const overdueRequests = [];

  for (const request of requests) {
    const lastChanged = request.status_changed_at || request.updated_at || request.created_at;
    const daysSinceChange = daysSinceLimaTimestamp(lastChanged);
    const daysUntilDeadline = daysUntilLimaDate(request.deadline);

    // Check for stale requests (>2 days without status change)
    if (daysSinceChange > 2 && request.status !== 'blocked') {
      staleRequests.push(request);
    }

    // Check for long-blocked requests (>3 days)
    if (request.status === 'blocked' && request.blocked_at) {
      const daysBlocked = daysSinceLimaTimestamp(request.blocked_at);
      if (daysBlocked > 3) {
        longBlockedRequests.push({ ...request, daysBlocked });
      }
    }

    // Check for overdue requests - auto-escalate priority
    if (daysUntilDeadline < 0 && request.priority !== 'urgent') {
      overdueRequests.push(request);

      // Auto-update priority to urgent
      await supabase
        .from('requests')
        .update({ priority: 'urgent', updated_at: new Date().toISOString() })
        .eq('id', request.id)
        .eq('team_id', TEAM_ID);
    }
  }

  // Build notification message
  let hasNotifications = false;
  let msg = '⚠️ *Alertas de Auto-Escalación*\n\n';

  if (staleRequests.length > 0) {
    hasNotifications = true;
    msg += `🐌 *Pedidos sin movimiento (+2 días):*\n\n`;
    staleRequests.forEach((r) => {
      const days = daysSinceLimaTimestamp(r.status_changed_at || r.updated_at || r.created_at);
      msg += `• *${escapeMd(r.client)}* - ${escapeMd(r.description.slice(0, 40))}\n  Sin cambio hace ${days} días\n\n`;
    });
  }

  if (longBlockedRequests.length > 0) {
    hasNotifications = true;
    msg += `🔴 *Pedidos bloqueados +3 días:*\n\n`;
    longBlockedRequests.forEach((r) => {
      msg += `• *${escapeMd(r.client)}* - ${escapeMd(r.description.slice(0, 40))}\n  Bloqueado hace ${r.daysBlocked} días`;
      if (r.blocked_reason) msg += `: ${escapeMd(r.blocked_reason.slice(0, 50))}`;
      msg += '\n\n';
    });
  }

  if (overdueRequests.length > 0) {
    hasNotifications = true;
    msg += `🚨 *Pedidos vencidos (escalados a urgente):*\n\n`;
    overdueRequests.forEach((r) => {
      const overdueDays = Math.abs(daysUntilLimaDate(r.deadline));
      msg += `• *${escapeMd(r.client)}* - ${escapeMd(r.description.slice(0, 40))}\n  Vencido hace ${overdueDays} día(s)\n\n`;
    });
  }

  if (hasNotifications) {
    msg += '---\n💡 Usa /estado para cambiar estados desde Telegram';
    await sendMessage(TELEGRAM_CHAT_ID, msg);
    console.log(
      `📣 Sent escalation alert: ${staleRequests.length} stale, ${longBlockedRequests.length} long-blocked, ${overdueRequests.length} overdue`
    );
  } else {
    console.log('✅ No escalation needed.');
  }
}

main().catch(async (err) => {
  console.error('❌ Fatal error:', err);
  await notifyCronFailure('auto-escalation', err);
  process.exit(1);
});
