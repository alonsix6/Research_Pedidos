import { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from '../../lib/supabase';
import {
  sendMessage,
  getHelpMessage,
  formatRequestsList,
  getUserByTelegramId,
} from '../../lib/telegram';
import { Request } from '../../lib/types';
import { differenceInDays, parseISO } from 'date-fns';
import {
  getConversationState,
  saveConversationState,
  clearConversationState,
  conversationMessages,
} from '../../lib/conversation';
import { parseNaturalDate, calculatePriority, getPriorityEmoji, formatLimaDate } from '../../lib/utils';

// Cliente de Supabase con service role (lazy-initialized)
const getSupabase = () => getSupabaseAdmin();

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
    const user = await getUserByTelegramId(userId.toString(), getSupabase());
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

    // Verificar si hay una conversación activa
    const conversationState = await getConversationState(
      chatId.toString(),
      userId.toString(),
      getSupabase()
    );

    // Si hay conversación activa y el mensaje NO es /cancelar
    if (conversationState && conversationState.step !== 'idle' && !text.startsWith('/cancelar')) {
      await handleConversationFlow(chatId, userId.toString(), text, conversationState, user);
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

        case '/nuevopedido':
          await handleNuevoPedidoCommand(chatId, userId.toString(), user.id);
          break;

        case '/completar':
          await handleCompletarCommand(chatId);
          break;

        case '/cancelar':
          if (conversationState) {
            await clearConversationState(chatId.toString(), userId.toString(), getSupabase());
            await sendMessage(chatId, conversationMessages.cancel);
          } else {
            await sendMessage(chatId, '🤷 No hay ningún pedido en proceso para cancelar.');
          }
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
 * Comando /nuevopedido - Inicia el flujo conversacional
 */
async function handleNuevoPedidoCommand(chatId: number, userId: string, userDbId: string) {
  // Iniciar nueva conversación
  await saveConversationState(
    {
      chatId: chatId.toString(),
      userId: userId,
      step: 'awaiting_client',
      data: {},
    },
    getSupabase()
  );

  await sendMessage(chatId, conversationMessages.start);
}

/**
 * Maneja el flujo conversacional para crear un pedido
 */
async function handleConversationFlow(
  chatId: number,
  userId: string,
  text: string,
  state: any,
  user: any
) {
  const { step, data } = state;

  switch (step) {
    case 'awaiting_client':
      data.client = text;
      await saveConversationState(
        {
          chatId: chatId.toString(),
          userId,
          step: 'awaiting_description',
          data,
        },
        getSupabase()
      );
      await sendMessage(chatId, conversationMessages.client(text));
      break;

    case 'awaiting_description':
      data.description = text;
      await saveConversationState(
        {
          chatId: chatId.toString(),
          userId,
          step: 'awaiting_requester',
          data,
        },
        getSupabase()
      );
      await sendMessage(chatId, conversationMessages.description(text));
      break;

    case 'awaiting_requester':
      data.requester_name = text;
      // Separar nombre y rol si viene en formato "Nombre, Rol"
      const parts = text.split(',');
      if (parts.length > 1) {
        data.requester_name = parts[0].trim();
        data.requester_role = parts[1].trim();
      }
      await saveConversationState(
        {
          chatId: chatId.toString(),
          userId,
          step: 'awaiting_deadline',
          data,
        },
        getSupabase()
      );
      await sendMessage(chatId, conversationMessages.requester(text));
      break;

    case 'awaiting_deadline':
      const parsedDate = parseNaturalDate(text);
      if (!parsedDate) {
        await sendMessage(chatId, conversationMessages.invalidDate);
        return;
      }
      data.deadline = parsedDate.toISOString();
      const formatted = formatLimaDate(parsedDate);
      await saveConversationState(
        {
          chatId: chatId.toString(),
          userId,
          step: 'awaiting_assigned',
          data,
        },
        getSupabase()
      );
      await sendMessage(chatId, conversationMessages.deadline(text, formatted));
      break;

    case 'awaiting_assigned':
      let assignedTo = null;
      let assignedName = 'Sin asignar';

      if (text === '1') {
        assignedName = 'Sol';
        // Buscar ID de Sol en la DB
        const { data: solUser } = await getSupabase()
          .from('users')
          .select('id')
          .eq('name', 'Sol')
          .single();
        assignedTo = solUser?.id || null;
      } else if (text === '2') {
        assignedName = 'Estef';
        const { data: estefUser } = await getSupabase()
          .from('users')
          .select('id')
          .eq('name', 'Estef')
          .single();
        assignedTo = estefUser?.id || null;
      } else if (text === '3') {
        assignedName = 'Alonso';
        const { data: alonsoUser } = await getSupabase()
          .from('users')
          .select('id')
          .eq('name', 'Alonso')
          .single();
        assignedTo = alonsoUser?.id || null;
      } else if (text === '4') {
        assignedName = 'Sin asignar';
        assignedTo = null;
      } else {
        await sendMessage(chatId, conversationMessages.invalidAssignment);
        return;
      }

      // Guardar el pedido en la DB
      const priority = calculatePriority(data.deadline!);
      const emoji = getPriorityEmoji(priority);

      const { error } = await getSupabase()
        .from('requests')
        .insert({
          client: data.client,
          description: data.description,
          requester_name: data.requester_name,
          requester_role: data.requester_role || '',
          assigned_to: assignedTo,
          deadline: data.deadline,
          status: 'pending',
          priority: priority,
          created_by: user.id,
        });

      if (error) {
        console.error('Error creating request:', error);
        await sendMessage(chatId, '❌ Error al crear el pedido. Por favor intenta de nuevo.');
        await clearConversationState(chatId.toString(), userId, getSupabase());
        return;
      }

      // Limpiar estado conversacional
      await clearConversationState(chatId.toString(), userId, getSupabase());

      // Enviar confirmación
      await sendMessage(
        chatId,
        conversationMessages.summary(data, assignedName, priority, emoji)
      );
      break;
  }
}

/**
 * Comando /completar - Marcar pedido como completado
 */
async function handleCompletarCommand(chatId: number) {
  const { data: requests, error } = await getSupabase()
    .from('requests')
    .select('*')
    .in('status', ['pending', 'in_progress'])
    .order('deadline', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error fetching requests:', error);
    await sendMessage(chatId, '❌ Error al obtener los pedidos. Intenta de nuevo.');
    return;
  }

  if (!requests || requests.length === 0) {
    await sendMessage(chatId, '📭 No hay pedidos activos para completar.');
    return;
  }

  // Mostrar lista de pedidos con números
  let message = '📝 *Pedidos activos*\n\nResponde con el número del pedido a completar:\n\n';
  requests.forEach((req: Request, index: number) => {
    const emoji = getPriorityEmoji(req.priority);
    message += `*${index + 1}.* ${emoji} ${req.client} - ${req.description.substring(0, 40)}${req.description.length > 40 ? '...' : ''}\n`;
  });
  message += '\nO usa /cancelar para cancelar.';

  await sendMessage(chatId, message);

  // TODO: Guardar estado para esperar respuesta con el número
  // Por ahora, esto es un placeholder - se puede mejorar guardando el estado en conversation_state
}

/**
 * Comando /ver - Muestra todos los pedidos activos
 */
async function handleVerCommand(chatId: number) {
  const { data: requests, error } = await getSupabase()
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
  const { data: requests, error } = await getSupabase()
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
  const { data: requests, error } = await getSupabase()
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
  const { data: requests, error } = await getSupabase()
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
  const { data: requests, error } = await getSupabase()
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
