/**
 * Script de recordatorio diario para el bot de Telegram
 * Se ejecuta diariamente a las 9AM Lima (14:00 UTC) via GitHub Actions
 * Envía un resumen de pedidos urgentes al grupo de Telegram
 */

const { createClient } = require('@supabase/supabase-js');
const { daysUntilLimaDate } = require('./_dateUtils');
const { escapeMd } = require('./_telegramMarkdown');
const { notifyCronFailure } = require('./_notify');
const { getPriorityEmoji } = require('./_format');

// Variables de entorno (configuradas en GitHub Secrets)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TEAM_ID = process.env.TEAM_ID;

// Validar variables de entorno (TEAM_ID es obligatorio: sin él, el filtro de team
// se omitía silenciosamente y el cron veía datos de todos los teams).
if (!SUPABASE_URL || !SUPABASE_KEY || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !TEAM_ID) {
  console.error('❌ Error: Faltan variables de entorno necesarias (incluyendo TEAM_ID)');
  process.exit(1);
}

// Cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// API de Telegram
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Envía un mensaje a Telegram
 */
async function sendTelegramMessage(text) {
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error sending Telegram message: ${error}`);
  }

  return response.json();
}

/**
 * Formatea días restantes (en hora Lima)
 */
function formatDaysLeft(deadline) {
  const daysLeft = daysUntilLimaDate(deadline);

  if (daysLeft < 0) return `Atrasado ${Math.abs(daysLeft)} día(s)`;
  if (daysLeft === 0) return 'Vence HOY';
  if (daysLeft === 1) return 'Vence mañana';
  return `${daysLeft} días restantes`;
}

/**
 * Script principal
 */
async function main() {
  console.log('🔔 Iniciando recordatorio diario...');

  // Obtener pedidos activos del team
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
    console.log('✅ No hay pedidos activos. No se envía recordatorio.');
    return;
  }

  // Clasificar pedidos por urgencia (en hora Lima)
  const urgent = requests.filter((r) => daysUntilLimaDate(r.deadline) <= 0);
  const soon = requests.filter((r) => {
    const d = daysUntilLimaDate(r.deadline);
    return d > 0 && d <= 2;
  });
  const thisWeek = requests.filter((r) => {
    const d = daysUntilLimaDate(r.deadline);
    return d > 2 && d <= 7;
  });

  // Obtener nombre del equipo
  let teamName = 'equipo';
  const { data: teamData } = await supabase.from('teams').select('name').eq('id', TEAM_ID).single();
  if (teamData) {
    teamName = teamData.name;
  }

  // Construir mensaje
  let message = `🔔 *Buenos días ${escapeMd(teamName)}!*\n\n`;
  message += `📊 *PEDIDOS ACTIVOS (${requests.length})*\n\n`;

  // Pedidos urgentes (vencen hoy o atrasados)
  if (urgent.length > 0) {
    message += `🔴 *URGENTE - Vence HOY o atrasado* (${urgent.length})\n\n`;
    urgent.forEach((req) => {
      const emoji = getPriorityEmoji(req.priority);
      const daysLeft = formatDaysLeft(req.deadline);
      const desc = req.description.substring(0, 60) + (req.description.length > 60 ? '...' : '');
      message += `${emoji} *${escapeMd(req.client.toUpperCase())}* - ${escapeMd(desc)}\n`;
      message += `   Solicitante: ${escapeMd(req.requester_name)}\n`;
      message += `   ${daysLeft}\n\n`;
    });
  }

  // Pedidos próximos (1-2 días)
  if (soon.length > 0) {
    message += `🟡 *PRÓXIMOS 2 DÍAS* (${soon.length})\n\n`;
    soon.forEach((req) => {
      const emoji = getPriorityEmoji(req.priority);
      const daysLeft = formatDaysLeft(req.deadline);
      const desc = req.description.substring(0, 60) + (req.description.length > 60 ? '...' : '');
      message += `${emoji} *${escapeMd(req.client.toUpperCase())}* - ${escapeMd(desc)}\n`;
      message += `   ${daysLeft}\n\n`;
    });
  }

  // Pedidos de esta semana
  if (thisWeek.length > 0) {
    message += `🟢 *ESTA SEMANA* (${thisWeek.length})\n\n`;
    thisWeek.slice(0, 5).forEach((req) => {
      const emoji = getPriorityEmoji(req.priority);
      const daysLeft = formatDaysLeft(req.deadline);
      message += `${emoji} ${escapeMd(req.client)} - ${daysLeft}\n`;
    });
    if (thisWeek.length > 5) {
      message += `... y ${thisWeek.length - 5} más\n`;
    }
    message += '\n';
  }

  message += '---\n';
  message += '💡 Usa /completar para marcar listos\n';
  message += '📝 /nuevopedido para agregar más';

  // Enviar mensaje
  console.log('📤 Enviando recordatorio a Telegram...');
  await sendTelegramMessage(message);
  console.log('✅ Recordatorio enviado exitosamente!');

  // Log resumen
  console.log(`\n📊 Resumen:`);
  console.log(`   - Pedidos urgentes: ${urgent.length}`);
  console.log(`   - Próximos 2 días: ${soon.length}`);
  console.log(`   - Esta semana: ${thisWeek.length}`);
  console.log(`   - Total activos: ${requests.length}`);
}

main().catch(async (error) => {
  console.error('❌ Error en recordatorio diario:', error);
  await notifyCronFailure('daily-reminder', error);
  process.exit(1);
});
