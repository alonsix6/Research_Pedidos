/**
 * Script de recordatorio diario para el bot de Telegram
 * Se ejecuta diariamente a las 9AM Lima (14:00 UTC) via GitHub Actions
 * Envía un resumen de pedidos urgentes al grupo de Telegram
 */

const { createClient } = require('@supabase/supabase-js');
const { differenceInDays, parseISO } = require('date-fns');

// Variables de entorno (configuradas en GitHub Secrets)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Validar variables de entorno
if (!SUPABASE_URL || !SUPABASE_KEY || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('❌ Error: Faltan variables de entorno necesarias');
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
 * Obtiene emoji según prioridad
 */
function getPriorityEmoji(priority) {
  switch (priority) {
    case 'urgent':
      return '🔴';
    case 'high':
      return '🟡';
    case 'normal':
      return '🟢';
    default:
      return '⚪';
  }
}

/**
 * Formatea días restantes
 */
function formatDaysLeft(deadline) {
  const daysLeft = differenceInDays(parseISO(deadline), new Date());

  if (daysLeft < 0) return `Atrasado ${Math.abs(daysLeft)} día(s)`;
  if (daysLeft === 0) return 'Vence HOY';
  if (daysLeft === 1) return 'Vence mañana';
  return `${daysLeft} días restantes`;
}

/**
 * Script principal
 */
async function main() {
  try {
    console.log('🔔 Iniciando recordatorio diario...');

    // Obtener pedidos activos
    const { data: requests, error } = await supabase
      .from('requests')
      .select('*')
      .in('status', ['pending', 'in_progress'])
      .order('deadline', { ascending: true });

    if (error) {
      throw new Error(`Error fetching requests: ${error.message}`);
    }

    if (!requests || requests.length === 0) {
      console.log('✅ No hay pedidos activos. No se envía recordatorio.');
      return;
    }

    // Clasificar pedidos por urgencia
    const now = new Date();
    const urgent = requests.filter((r) => {
      const daysLeft = differenceInDays(parseISO(r.deadline), now);
      return daysLeft <= 0;
    });

    const soon = requests.filter((r) => {
      const daysLeft = differenceInDays(parseISO(r.deadline), now);
      return daysLeft > 0 && daysLeft <= 2;
    });

    const thisWeek = requests.filter((r) => {
      const daysLeft = differenceInDays(parseISO(r.deadline), now);
      return daysLeft > 2 && daysLeft <= 7;
    });

    // Construir mensaje
    let message = '🔔 *Buenos días equipo Reset R&A!*\n\n';
    message += `📊 *PEDIDOS ACTIVOS (${requests.length})*\n\n`;

    // Pedidos urgentes (vencen hoy o atrasados)
    if (urgent.length > 0) {
      message += `🔴 *URGENTE - Vence HOY o atrasado* (${urgent.length})\n\n`;
      urgent.forEach((req) => {
        const emoji = getPriorityEmoji(req.priority);
        const daysLeft = formatDaysLeft(req.deadline);
        message += `${emoji} *${req.client.toUpperCase()}* - ${req.description.substring(0, 60)}${req.description.length > 60 ? '...' : ''}\n`;
        message += `   Solicitante: ${req.requester_name}\n`;
        message += `   ${daysLeft}\n\n`;
      });
    }

    // Pedidos próximos (1-2 días)
    if (soon.length > 0) {
      message += `🟡 *PRÓXIMOS 2 DÍAS* (${soon.length})\n\n`;
      soon.forEach((req) => {
        const emoji = getPriorityEmoji(req.priority);
        const daysLeft = formatDaysLeft(req.deadline);
        message += `${emoji} *${req.client.toUpperCase()}* - ${req.description.substring(0, 60)}${req.description.length > 60 ? '...' : ''}\n`;
        message += `   ${daysLeft}\n\n`;
      });
    }

    // Pedidos de esta semana
    if (thisWeek.length > 0) {
      message += `🟢 *ESTA SEMANA* (${thisWeek.length})\n\n`;
      thisWeek.slice(0, 5).forEach((req) => {
        const emoji = getPriorityEmoji(req.priority);
        const daysLeft = formatDaysLeft(req.deadline);
        message += `${emoji} ${req.client} - ${daysLeft}\n`;
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
  } catch (error) {
    console.error('❌ Error en recordatorio diario:', error);
    process.exit(1);
  }
}

// Ejecutar script
main();
