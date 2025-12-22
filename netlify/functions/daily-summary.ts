import { Handler, schedule } from '@netlify/functions';
import { getSupabaseAdmin } from '../../lib/supabase';
import {
  sendMessageWithButtons,
  formatRequestsList,
  createMainMenuButtons,
  InlineKeyboardMarkup,
} from '../../lib/telegram';
import { Request } from '../../lib/types';
import { differenceInDays, parseISO } from 'date-fns';
import { getPriorityEmoji } from '../../lib/utils';

const getSupabase = () => getSupabaseAdmin();

// ID del grupo de Telegram donde se enviarán los resúmenes
const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;

/**
 * Genera el resumen diario de pedidos
 */
async function generateDailySummary(): Promise<string> {
  const { data: requests, error } = await getSupabase()
    .from('requests')
    .select('*')
    .in('status', ['pending', 'in_progress'])
    .order('deadline', { ascending: true });

  if (error) {
    console.error('Error fetching requests:', error);
    return '❌ Error al obtener los pedidos.';
  }

  if (!requests || requests.length === 0) {
    return '✅ *¡Buenos días equipo!*\n\n📭 No hay pedidos pendientes. ¡Excelente trabajo!';
  }

  // Clasificar pedidos
  const today: Request[] = [];
  const urgent: Request[] = [];
  const thisWeek: Request[] = [];
  const later: Request[] = [];

  requests.forEach((r: Request) => {
    const daysLeft = differenceInDays(parseISO(r.deadline), new Date());

    if (daysLeft < 0) {
      urgent.push(r); // Vencido
    } else if (daysLeft === 0) {
      today.push(r);
    } else if (daysLeft <= 2) {
      urgent.push(r);
    } else if (daysLeft <= 7) {
      thisWeek.push(r);
    } else {
      later.push(r);
    }
  });

  let message = '☀️ *BUENOS DÍAS EQUIPO*\n';
  message += `📊 Resumen de pedidos - ${new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}\n\n`;

  // Estadísticas generales
  message += `📈 *Estadísticas:*\n`;
  message += `• Total activos: ${requests.length}\n`;
  message += `• Vencen hoy: ${today.length}\n`;
  message += `• Urgentes: ${urgent.length}\n`;
  message += `• Esta semana: ${thisWeek.length}\n\n`;

  // Pedidos que vencen HOY
  if (today.length > 0) {
    message += `🔴 *VENCEN HOY (${today.length}):*\n`;
    today.forEach((r, i) => {
      const emoji = getPriorityEmoji(r.priority);
      message += `${i + 1}. ${emoji} ${r.client} - ${r.description.substring(0, 35)}${r.description.length > 35 ? '...' : ''}\n`;
    });
    message += '\n';
  }

  // Pedidos URGENTES (vencidos o < 2 días)
  if (urgent.length > 0) {
    message += `🔥 *URGENTES (${urgent.length}):*\n`;
    urgent.forEach((r, i) => {
      const emoji = getPriorityEmoji(r.priority);
      const daysLeft = differenceInDays(parseISO(r.deadline), new Date());
      const status = daysLeft < 0 ? '⚠️ VENCIDO' : `${daysLeft}d`;
      message += `${i + 1}. ${emoji} ${r.client} - ${r.description.substring(0, 30)}... (${status})\n`;
    });
    message += '\n';
  }

  // Pedidos de la semana
  if (thisWeek.length > 0) {
    message += `📅 *ESTA SEMANA (${thisWeek.length}):*\n`;
    thisWeek.slice(0, 5).forEach((r, i) => {
      const emoji = getPriorityEmoji(r.priority);
      message += `${i + 1}. ${emoji} ${r.client} - ${r.description.substring(0, 35)}...\n`;
    });
    if (thisWeek.length > 5) {
      message += `   _...y ${thisWeek.length - 5} más_\n`;
    }
  }

  message += '\n💪 *¡A darle con todo!*';

  return message;
}

/**
 * Handler principal - se ejecuta a las 9am Lima (14:00 UTC)
 */
const dailySummaryHandler: Handler = async (event, context) => {
  console.log('Running daily summary job...');

  if (!GROUP_CHAT_ID) {
    console.error('TELEGRAM_GROUP_CHAT_ID not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Group chat ID not configured' }),
    };
  }

  try {
    const summary = await generateDailySummary();
    const buttons = createMainMenuButtons();

    await sendMessageWithButtons(GROUP_CHAT_ID, summary, buttons);

    console.log('Daily summary sent successfully');
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Daily summary sent' }),
    };
  } catch (error) {
    console.error('Error sending daily summary:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send daily summary' }),
    };
  }
};

// Programar para las 9am hora Lima (UTC-5) = 14:00 UTC
// Cron: minuto hora día mes día-semana
// Lunes a Viernes a las 14:00 UTC (9am Lima)
export const handler = schedule('0 14 * * 1-5', dailySummaryHandler);
