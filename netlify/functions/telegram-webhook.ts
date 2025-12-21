import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import {
  sendMessage,
  getHelpMessage,
  formatRequestsList,
  getUserByTelegramId,
} from '../../lib/telegram';
import { Request } from '../../lib/types';
import { differenceInDays, parseISO } from 'date-fns';

// Cliente de Supabase con service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const handler: Handler = async (event) => {
  // Solo aceptar POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const update = JSON.parse(event.body || '{}');
    console.log('Received update:', JSON.stringify(update, null, 2));

    // Ignorar updates sin mensaje o sin texto
    if (!update.message || !update.message.text) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
      };
    }

    const message = update.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text.trim();
    const username = message.from.username || message.from.first_name;

    console.log(`Message from ${username} (${userId}): ${text}`);

    // Verificar que el usuario esté autorizado
    const user = await getUserByTelegramId(userId.toString(), supabase);
    if (!user) {
      await sendMessage(
        chatId,
        '❌ No estás autorizado para usar este bot. Contacta al administrador.'
      );
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
      };
    }

    // Comandos del bot
    if (text.startsWith('/')) {
      const command = text.split(' ')[0].toLowerCase();

      switch (command) {
        case '/start':
        case '/ayuda':
        case '/help':
          await sendMessage(chatId, getHelpMessage());
          break;

        case '/ver':
          await handleVerCommand(chatId);
          break;

        case '/mios':
          await handleMiosCommand(chatId, user.id);
          break;

        case '/hoy':
          await handleHoyCommand(chatId);
          break;

        case '/semana':
          await handleSemanaCommand(chatId);
          break;

        case '/urgente':
          await handleUrgenteCommand(chatId);
          break;

        default:
          await sendMessage(
            chatId,
            `❓ Comando no reconocido: ${command}\n\nUsa /ayuda para ver los comandos disponibles.`
          );
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (error) {
    console.error('Error processing update:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

/**
 * Comando /ver - Muestra todos los pedidos activos
 */
async function handleVerCommand(chatId: number) {
  const { data: requests, error } = await supabase
    .from('requests')
    .select('*')
    .in('status', ['pending', 'in_progress'])
    .order('deadline', { ascending: true });

  if (error) {
    console.error('Error fetching requests:', error);
    await sendMessage(chatId, '❌ Error al obtener los pedidos. Intenta de nuevo.');
    return;
  }

  if (!requests || requests.length === 0) {
    await sendMessage(chatId, '📭 No hay pedidos activos en este momento.');
    return;
  }

  const message = formatRequestsList(requests as Request[], 'Pedidos Activos');
  await sendMessage(chatId, message);
}

/**
 * Comando /mios - Muestra pedidos asignados al usuario
 */
async function handleMiosCommand(chatId: number, userId: string) {
  const { data: requests, error } = await supabase
    .from('requests')
    .select('*')
    .eq('assigned_to', userId)
    .in('status', ['pending', 'in_progress'])
    .order('deadline', { ascending: true });

  if (error) {
    console.error('Error fetching user requests:', error);
    await sendMessage(chatId, '❌ Error al obtener tus pedidos. Intenta de nuevo.');
    return;
  }

  if (!requests || requests.length === 0) {
    await sendMessage(chatId, '📭 No tienes pedidos asignados en este momento.');
    return;
  }

  const message = formatRequestsList(requests as Request[], 'Mis Pedidos');
  await sendMessage(chatId, message);
}

/**
 * Comando /hoy - Pedidos que vencen hoy
 */
async function handleHoyCommand(chatId: number) {
  const { data: requests, error } = await supabase
    .from('requests')
    .select('*')
    .in('status', ['pending', 'in_progress']);

  if (error) {
    console.error('Error fetching today requests:', error);
    await sendMessage(chatId, '❌ Error al obtener los pedidos. Intenta de nuevo.');
    return;
  }

  if (!requests) {
    await sendMessage(chatId, '📭 No hay pedidos que venzan hoy.');
    return;
  }

  // Filtrar pedidos que vencen hoy
  const today = requests.filter((r: Request) => {
    const daysLeft = differenceInDays(parseISO(r.deadline), new Date());
    return daysLeft === 0;
  });

  if (today.length === 0) {
    await sendMessage(chatId, '📭 No hay pedidos que venzan hoy.');
    return;
  }

  const message = formatRequestsList(today as Request[], 'Pedidos que vencen HOY');
  await sendMessage(chatId, message);
}

/**
 * Comando /semana - Pedidos de esta semana
 */
async function handleSemanaCommand(chatId: number) {
  const { data: requests, error } = await supabase
    .from('requests')
    .select('*')
    .in('status', ['pending', 'in_progress']);

  if (error) {
    console.error('Error fetching week requests:', error);
    await sendMessage(chatId, '❌ Error al obtener los pedidos. Intenta de nuevo.');
    return;
  }

  if (!requests) {
    await sendMessage(chatId, '📭 No hay pedidos para esta semana.');
    return;
  }

  // Filtrar pedidos que vencen en los próximos 7 días
  const thisWeek = requests.filter((r: Request) => {
    const daysLeft = differenceInDays(parseISO(r.deadline), new Date());
    return daysLeft >= 0 && daysLeft <= 7;
  });

  if (thisWeek.length === 0) {
    await sendMessage(chatId, '📭 No hay pedidos para esta semana.');
    return;
  }

  const message = formatRequestsList(thisWeek as Request[], 'Pedidos de esta semana');
  await sendMessage(chatId, message);
}

/**
 * Comando /urgente - Pedidos urgentes (< 2 días)
 */
async function handleUrgenteCommand(chatId: number) {
  const { data: requests, error } = await supabase
    .from('requests')
    .select('*')
    .in('status', ['pending', 'in_progress']);

  if (error) {
    console.error('Error fetching urgent requests:', error);
    await sendMessage(chatId, '❌ Error al obtener los pedidos. Intenta de nuevo.');
    return;
  }

  if (!requests) {
    await sendMessage(chatId, '📭 No hay pedidos urgentes.');
    return;
  }

  // Filtrar pedidos urgentes (vencen en menos de 2 días o ya vencieron)
  const urgent = requests.filter((r: Request) => {
    const daysLeft = differenceInDays(parseISO(r.deadline), new Date());
    return daysLeft < 2;
  });

  if (urgent.length === 0) {
    await sendMessage(chatId, '✅ No hay pedidos urgentes. ¡Todo bajo control!');
    return;
  }

  const message = formatRequestsList(urgent as Request[], 'Pedidos URGENTES');
  await sendMessage(chatId, message);
}
