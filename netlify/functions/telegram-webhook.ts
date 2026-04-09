import { Handler } from '@netlify/functions';
import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../../lib/supabase';
import {
  sendMessage,
  sendMessageWithButtons,
  answerCallbackQuery,
  editMessageText,
  getHelpMessage,
  formatRequestsList,
  formatRequestForTelegram,
  getUserByTelegramId,
  createMainMenuButtons,
  createRequestButtons,
  createCompleteConfirmButtons,
  InlineKeyboardMarkup,
} from '../../lib/telegram';
import { Request, ConversationStep, NewRequestData, CompleteRequestData, User } from '../../lib/types';
import { differenceInDays, parseISO, differenceInMinutes } from 'date-fns';
import { parseNaturalDate, calculatePriority, getPriorityEmoji, formatLimaDate } from '../../lib/utils';

// Cliente de Supabase con service role (lazy-initialized)
const getSupabase = (): SupabaseClient => getSupabaseAdmin();

// Team ID para filtrar datos (cada bot atiende un solo equipo)
const TEAM_ID = process.env.TEAM_ID;

// Rate limiting: máximo 3 pedidos cada 10 minutos por usuario
const RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_WINDOW_MINUTES = 10;

// Rate limiting global: máximo 100 requests por minuto al webhook
const GLOBAL_RATE_LIMIT_MAX = 100;
const GLOBAL_RATE_LIMIT_WINDOW_MS = 60000; // 1 minuto

// Timeout de conversación: 30 minutos
const CONVERSATION_TIMEOUT_MINUTES = 30;

// Almacenamiento en memoria para rate limiting global (se reinicia con cada cold start)
let globalRequestCount = 0;
let globalRateLimitWindowStart = Date.now();

/**
 * Valida que un string sea un UUID v4 válido
 */
function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Rate limiting global del webhook
 */
function checkGlobalRateLimit(): boolean {
  const now = Date.now();

  // Reiniciar ventana si ha pasado
  if (now - globalRateLimitWindowStart > GLOBAL_RATE_LIMIT_WINDOW_MS) {
    globalRequestCount = 0;
    globalRateLimitWindowStart = now;
  }

  globalRequestCount++;
  return globalRequestCount <= GLOBAL_RATE_LIMIT_MAX;
}

// ===== Tipos para callback query =====
interface TelegramCallbackQuery {
  id: string;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  message?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
    };
  };
  data?: string;
}

// ===== Funciones de conversación (inline para Netlify) =====

interface ConversationState {
  chatId: string;
  userId: string;
  step: ConversationStep;
  data: NewRequestData | CompleteRequestData;
  updated_at?: string;
}

async function getConversationState(
  chatId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<ConversationState | null> {
  const { data, error } = await supabase
    .from('conversation_state')
    .select('*')
    .eq('chat_id', chatId.toString())
    .eq('user_id', userId.toString())
    .single();

  if (error || !data) {
    return null;
  }

  return {
    chatId: data.chat_id,
    userId: data.user_id,
    step: data.step as ConversationStep,
    data: data.data as NewRequestData,
    updated_at: data.updated_at,
  };
}

async function saveConversationState(
  state: ConversationState,
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase
    .from('conversation_state')
    .upsert({
      chat_id: state.chatId,
      user_id: state.userId,
      step: state.step,
      data: state.data,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw error;
  }
}

async function clearConversationState(
  chatId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  await supabase
    .from('conversation_state')
    .delete()
    .eq('chat_id', chatId.toString())
    .eq('user_id', userId.toString());
}

/**
 * Limpia conversaciones expiradas (más de 30 minutos sin actividad)
 */
async function cleanupExpiredConversations(supabase: SupabaseClient): Promise<void> {
  const expirationTime = new Date(Date.now() - CONVERSATION_TIMEOUT_MINUTES * 60 * 1000).toISOString();

  await supabase
    .from('conversation_state')
    .delete()
    .lt('updated_at', expirationTime);
}

/**
 * Verifica si una conversación ha expirado
 */
function isConversationExpired(state: ConversationState): boolean {
  if (!state.updated_at) return false;

  const minutesSinceUpdate = differenceInMinutes(new Date(), parseISO(state.updated_at));
  return minutesSinceUpdate > CONVERSATION_TIMEOUT_MINUTES;
}

/**
 * Verifica rate limiting para /nuevopedido
 */
async function checkRateLimit(userId: string, supabase: SupabaseClient): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', userId)
    .gte('created_at', windowStart);

  const requestCount = count || 0;
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - requestCount);

  return {
    allowed: requestCount < RATE_LIMIT_MAX_REQUESTS,
    remaining,
  };
}

/**
 * Obtiene los miembros del equipo en una sola query (dinámico por team_id)
 */
async function getTeamMembers(supabase: SupabaseClient): Promise<{ id: string; name: string }[]> {
  let query = supabase
    .from('users')
    .select('id, name')
    .order('name', { ascending: true });

  if (TEAM_ID) {
    query = query.eq('team_id', TEAM_ID);
  }

  const { data: users } = await query;
  return users || [];
}

/**
 * Obtiene mapa nombre->id de los miembros del equipo
 */
async function getTeamMemberIds(supabase: SupabaseClient): Promise<Record<string, string | null>> {
  const members = await getTeamMembers(supabase);
  const memberIds: Record<string, string | null> = {};

  members.forEach((user) => {
    memberIds[user.name] = user.id;
  });

  return memberIds;
}

const conversationMessages = {
  start: '📝 *Nuevo pedido para el equipo*\n\n¿Para qué *cliente/cuenta*?',

  client: (client: string) =>
    `✅ Cliente: *${client}*\n\n¿Qué necesitan exactamente? (Describe el pedido)`,

  description: (desc: string) =>
    `✅ Pedido: ${desc}\n\n¿Quién lo solicitó? (Nombre y cargo, ej: "Andrea, ejecutiva")`,

  requester: (requester: string) =>
    `✅ Solicitante: ${requester}\n\n¿Fecha de entrega?\nPuedes usar:\n• Fecha: "25/12" o "25/12/2024"\n• Relativo: "hoy", "mañana", "en 3 días"`,

  deadline: (deadline: string, formatted: string, memberNames?: string[]) => {
    let assignOptions = '';
    if (memberNames && memberNames.length > 0) {
      const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      memberNames.forEach((name, i) => {
        assignOptions += `${emojis[i] || `${i + 1}.`} ${name}\n`;
      });
      assignOptions += `${emojis[memberNames.length] || `${memberNames.length + 1}.`} Sin asignar`;
    } else {
      assignOptions = '1️⃣ Sin asignar';
    }
    return `✅ Deadline: ${formatted}\n\n¿Quién se encarga?\n${assignOptions}\n\nResponde con el número.`;
  },

  summary: (data: NewRequestData, assigned: string, priority: string, emoji: string) => {
    const parts = data.requester_name?.split(',') || ['', ''];
    const name = parts[0]?.trim() || data.requester_name;
    const role = parts[1]?.trim() || '';

    return `✅ *Pedido creado!*\n\n📋 *Resumen:*\nCliente: ${data.client}\nPedido: ${data.description}\nSolicitante: ${name}${role ? ` (${role})` : ''}\nDeadline: ${data.deadline}\nAsignado: ${assigned}\nPrioridad: ${emoji} ${priority}\n\n✨ El pedido ha sido guardado y todos pueden verlo con /ver`;
  },

  cancel: '❌ Pedido cancelado. Usa /nuevopedido cuando quieras crear uno nuevo.',

  error: '⚠️ No entendí esa respuesta. Por favor intenta de nuevo.',

  invalidDate: '⚠️ No pude entender esa fecha. Usa formatos como:\n• "25/12" o "25/12/2024"\n• "hoy", "mañana"\n• "en 3 días"',

  invalidAssignment: (max: number) =>
    `⚠️ Por favor responde con un número del 1 al ${max}.`,

  conversationExpired: '⏰ Tu sesión ha expirado por inactividad. Usa /nuevopedido para comenzar de nuevo.',

  rateLimited: (remaining: number) =>
    `⚠️ Has alcanzado el límite de ${RATE_LIMIT_MAX_REQUESTS} pedidos en ${RATE_LIMIT_WINDOW_MINUTES} minutos. Espera un momento antes de crear más pedidos.`,
};

// ===== Fin funciones de conversación =====

/**
 * Valida la firma del webhook de Telegram
 * https://core.telegram.org/bots/api#setwebhook
 */
function validateWebhookSignature(body: string, secretToken: string | undefined, headerToken: string | undefined): boolean {
  // PRODUCCIÓN: Secret token es obligatorio
  if (!secretToken) {
    console.error('SECURITY: TELEGRAM_WEBHOOK_SECRET no está configurado. Rechazando webhook.');
    return false;
  }

  // Si hay secret token pero no viene el header, rechazar
  if (!headerToken) {
    console.error('SECURITY: Webhook recibido sin header X-Telegram-Bot-Api-Secret-Token');
    return false;
  }

  // Comparar tokens de forma segura (timing-safe)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(secretToken),
      Buffer.from(headerToken)
    );
  } catch {
    return false;
  }
}

export const handler: Handler = async (event) => {
  // Solo aceptar POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Rate limiting global del webhook
  if (!checkGlobalRateLimit()) {
    console.warn('RATE_LIMIT: Global webhook rate limit exceeded');
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Too many requests' }),
    };
  }

  // Validar firma del webhook
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const headerSecret = event.headers['x-telegram-bot-api-secret-token'];

  if (!validateWebhookSignature(event.body || '', webhookSecret, headerSecret)) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  try {
    const update = JSON.parse(event.body || '{}');

    // Limpiar conversaciones expiradas periódicamente (1% de las requests)
    if (Math.random() < 0.01) {
      await cleanupExpiredConversations(getSupabase());
    }

    // Manejar callback queries (botones inline)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query as TelegramCallbackQuery);
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
      };
    }

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

    // Si hay conversación pero está expirada, limpiarla
    if (conversationState && isConversationExpired(conversationState)) {
      await clearConversationState(chatId.toString(), userId.toString(), getSupabase());
      await sendMessage(chatId, conversationMessages.conversationExpired);
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
      };
    }

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
      const command = text.split(' ')[0].split('@')[0].toLowerCase();

      switch (command) {
        case '/start':
        case '/ayuda':
        case '/help':
          await sendMessageWithButtons(chatId, getHelpMessage(), createMainMenuButtons());
          break;

        case '/menu':
          await sendMessageWithButtons(
            chatId,
            '📋 *Menú Principal*\n\n¿Qué deseas hacer?',
            createMainMenuButtons()
          );
          break;

        case '/nuevopedido':
          await handleNuevoPedidoCommand(chatId, userId.toString(), user.id);
          break;

        case '/completar':
          await handleCompletarCommand(chatId, userId.toString());
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

        case '/estado':
          await handleEstadoCommand(chatId, userId.toString());
          break;

        case '/comentar':
          await handleComentarCommand(chatId, userId.toString());
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
    // Log error para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.error('Error processing update:', error);
    }
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
  // Verificar rate limit
  const { allowed, remaining } = await checkRateLimit(userDbId, getSupabase());

  if (!allowed) {
    await sendMessage(chatId, conversationMessages.rateLimited(remaining));
    return;
  }

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
  state: ConversationState,
  user: User
) {
  const { step, data } = state;
  const requestData = data as NewRequestData;

  switch (step) {
    case 'awaiting_client':
      requestData.client = text;
      await saveConversationState(
        {
          chatId: chatId.toString(),
          userId,
          step: 'awaiting_description',
          data: requestData,
        },
        getSupabase()
      );
      await sendMessage(chatId, conversationMessages.client(text));
      break;

    case 'awaiting_description':
      requestData.description = text;
      await saveConversationState(
        {
          chatId: chatId.toString(),
          userId,
          step: 'awaiting_requester',
          data: requestData,
        },
        getSupabase()
      );
      await sendMessage(chatId, conversationMessages.description(text));
      break;

    case 'awaiting_requester':
      requestData.requester_name = text;
      // Separar nombre y rol si viene en formato "Nombre, Rol"
      const parts = text.split(',');
      if (parts.length > 1) {
        requestData.requester_name = parts[0].trim();
        requestData.requester_role = parts[1].trim();
      }
      await saveConversationState(
        {
          chatId: chatId.toString(),
          userId,
          step: 'awaiting_deadline',
          data: requestData,
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
      requestData.deadline = parsedDate.toISOString();
      const formatted = formatLimaDate(parsedDate);

      // Cargar miembros del equipo para mostrar opciones de asignación
      const membersForDeadline = await getTeamMembers(getSupabase());
      const memberNames = membersForDeadline.map(m => m.name);

      await saveConversationState(
        {
          chatId: chatId.toString(),
          userId,
          step: 'awaiting_assigned',
          data: requestData,
        },
        getSupabase()
      );
      await sendMessage(chatId, conversationMessages.deadline(text, formatted, memberNames));
      break;

    case 'awaiting_assigned':
      // Obtener miembros del equipo dinámicamente
      const teamMembers = await getTeamMembers(getSupabase());
      const selNum = parseInt(text, 10);

      let assignedTo: string | null = null;
      let assignedName = 'Sin asignar';

      if (isNaN(selNum) || selNum < 1 || selNum > teamMembers.length + 1) {
        await sendMessage(chatId, conversationMessages.invalidAssignment(teamMembers.length + 1));
        return;
      }

      if (selNum <= teamMembers.length) {
        const selectedMember = teamMembers[selNum - 1];
        assignedName = selectedMember.name;
        assignedTo = selectedMember.id;
      }
      // else: último número = "Sin asignar" (assignedTo queda null)

      // Guardar el pedido en la DB
      const priority = calculatePriority(requestData.deadline!);
      const emoji = getPriorityEmoji(priority);

      const { error } = await getSupabase()
        .from('requests')
        .insert({
          client: requestData.client,
          description: requestData.description,
          requester_name: requestData.requester_name,
          requester_role: requestData.requester_role || '',
          assigned_to: assignedTo,
          deadline: requestData.deadline,
          status: 'pending',
          priority: priority,
          created_by: user.id,
          ...(TEAM_ID && { team_id: TEAM_ID }),
        });

      if (error) {
        await sendMessage(chatId, '❌ Error al crear el pedido. Por favor intenta de nuevo.');
        await clearConversationState(chatId.toString(), userId, getSupabase());
        return;
      }

      // Limpiar estado conversacional
      await clearConversationState(chatId.toString(), userId, getSupabase());

      // Enviar confirmación
      await sendMessage(
        chatId,
        conversationMessages.summary(requestData, assignedName, priority, emoji)
      );
      break;

    case 'awaiting_complete_selection':
      const completeData = state.data as CompleteRequestData;
      const selectionNum = parseInt(text, 10);
      const requestIds = completeData.requestIds || [];

      if (isNaN(selectionNum) || selectionNum < 1 || selectionNum > requestIds.length) {
        await sendMessage(
          chatId,
          `⚠️ Por favor responde con un número del 1 al ${requestIds.length}.`
        );
        return;
      }

      const selectedRequestId = requestIds[selectionNum - 1];

      // Actualizar el pedido a completado
      const { data: updatedRequest, error: updateError } = await getSupabase()
        .from('requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequestId)
        .select()
        .single();

      if (updateError) {
        await sendMessage(chatId, '❌ Error al completar el pedido. Intenta de nuevo.');
        await clearConversationState(chatId.toString(), userId, getSupabase());
        return;
      }

      // Limpiar estado conversacional
      await clearConversationState(chatId.toString(), userId, getSupabase());

      // Enviar confirmación
      await sendMessage(
        chatId,
        `✅ *Pedido completado!*\n\n${updatedRequest.client} - ${updatedRequest.description}\n\n🎉 ¡Buen trabajo!`
      );
      break;

    case 'awaiting_status_selection': {
      const statusSelData = state.data as CompleteRequestData;
      const statusSelNum = parseInt(text, 10);
      const statusReqIds = statusSelData.requestIds || [];

      if (isNaN(statusSelNum) || statusSelNum < 1 || statusSelNum > statusReqIds.length) {
        await sendMessage(chatId, `⚠️ Por favor responde con un número del 1 al ${statusReqIds.length}.`);
        return;
      }

      const statusReqId = statusReqIds[statusSelNum - 1];
      // Fetch the request to show current status
      const { data: statusReq } = await getSupabase()
        .from('requests')
        .select('*')
        .eq('id', statusReqId)
        .single();

      if (!statusReq) {
        await sendMessage(chatId, '❌ Pedido no encontrado.');
        await clearConversationState(chatId.toString(), userId, getSupabase());
        return;
      }

      // Show available transitions
      const transitions: Record<string, string[]> = {
        pending: ['in_progress', 'cancelled'],
        in_progress: ['in_review', 'blocked', 'cancelled'],
        blocked: ['in_progress', 'cancelled'],
        in_review: ['completed', 'needs_revision'],
        needs_revision: ['in_progress', 'cancelled'],
      };

      const statusLabels: Record<string, string> = {
        pending: '⏳ Pendiente',
        in_progress: '🔵 En Progreso',
        in_review: '🟣 En Revisión',
        blocked: '🔴 Bloqueado',
        needs_revision: '🟠 Necesita Revisión',
        completed: '✅ Completado',
        cancelled: '❌ Cancelado',
      };

      const nextStatuses = transitions[statusReq.status] || [];
      if (nextStatuses.length === 0) {
        await sendMessage(chatId, `Este pedido está en estado *${statusLabels[statusReq.status]}* y no puede cambiar de estado.`);
        await clearConversationState(chatId.toString(), userId, getSupabase());
        return;
      }

      let statusMsg = `📋 *${statusReq.client}* - ${statusReq.description}\n`;
      statusMsg += `Estado actual: ${statusLabels[statusReq.status]}\n\n`;
      statusMsg += `¿A qué estado deseas cambiar?\n\n`;
      nextStatuses.forEach((s, i) => {
        statusMsg += `${i + 1}️⃣ ${statusLabels[s]}\n`;
      });
      statusMsg += `\nResponde con el número o /cancelar`;

      await saveConversationState({
        chatId: chatId.toString(),
        userId,
        step: 'awaiting_status_change',
        data: { requestIds: [statusReqId, ...nextStatuses] },
      }, getSupabase());

      await sendMessage(chatId, statusMsg);
      break;
    }

    case 'awaiting_status_change': {
      const statusChangeData = state.data as CompleteRequestData;
      const changeNum = parseInt(text, 10);
      const changeReqIds = statusChangeData.requestIds || [];
      const changeReqId = changeReqIds[0];
      const availableStatuses = changeReqIds.slice(1);

      if (isNaN(changeNum) || changeNum < 1 || changeNum > availableStatuses.length) {
        await sendMessage(chatId, `⚠️ Por favor responde con un número del 1 al ${availableStatuses.length}.`);
        return;
      }

      const newStatus = availableStatuses[changeNum - 1];

      // If blocked, ask for reason
      if (newStatus === 'blocked') {
        await saveConversationState({
          chatId: chatId.toString(),
          userId,
          step: 'awaiting_blocked_reason',
          data: { requestIds: [changeReqId] },
        }, getSupabase());
        await sendMessage(chatId, '🔴 *Motivo del bloqueo:*\n\nEscribe por qué se bloquea este pedido:');
        return;
      }

      // Apply the status change
      const updateFields: Record<string, unknown> = {
        status: newStatus,
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (newStatus === 'completed') updateFields.completed_at = new Date().toISOString();

      const { error: changeErr } = await getSupabase()
        .from('requests')
        .update(updateFields)
        .eq('id', changeReqId);

      if (changeErr) {
        await sendMessage(chatId, '❌ Error al cambiar estado.');
      } else {
        const statusLabelsInline: Record<string, string> = {
          pending: '⏳ Pendiente', in_progress: '🔵 En Progreso', in_review: '🟣 En Revisión',
          blocked: '🔴 Bloqueado', needs_revision: '🟠 Necesita Revisión',
          completed: '✅ Completado', cancelled: '❌ Cancelado',
        };
        await sendMessage(chatId, `✅ Estado cambiado a *${statusLabelsInline[newStatus]}*`);

        // Log activity
        await getSupabase().from('activity_log').insert({
          request_id: changeReqId,
          action: 'status_changed',
          details: { to_status: newStatus },
          ...(TEAM_ID && { team_id: TEAM_ID }),
        });
      }

      await clearConversationState(chatId.toString(), userId, getSupabase());
      break;
    }

    case 'awaiting_blocked_reason': {
      const blockedData = state.data as CompleteRequestData;
      const blockedReqId = (blockedData.requestIds || [])[0];

      if (!text.trim()) {
        await sendMessage(chatId, '⚠️ Debes escribir un motivo para el bloqueo.');
        return;
      }

      // Get current request to save original deadline
      const { data: blockedReq } = await getSupabase()
        .from('requests')
        .select('deadline, original_deadline')
        .eq('id', blockedReqId)
        .single();

      const { error: blockErr } = await getSupabase()
        .from('requests')
        .update({
          status: 'blocked',
          blocked_reason: text.trim(),
          blocked_at: new Date().toISOString(),
          original_deadline: blockedReq?.original_deadline || blockedReq?.deadline,
          status_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', blockedReqId);

      if (blockErr) {
        await sendMessage(chatId, '❌ Error al bloquear el pedido.');
      } else {
        await sendMessage(chatId, `🔴 *Pedido bloqueado*\n\nMotivo: ${text.trim()}\n\n⏰ El deadline se extenderá automáticamente mientras esté bloqueado.`);

        await getSupabase().from('activity_log').insert({
          request_id: blockedReqId,
          action: 'blocked',
          details: { blocked_reason: text.trim() },
          ...(TEAM_ID && { team_id: TEAM_ID }),
        });
      }

      await clearConversationState(chatId.toString(), userId, getSupabase());
      break;
    }

    case 'awaiting_comment_selection': {
      const commentSelData = state.data as CompleteRequestData;
      const commentSelNum = parseInt(text, 10);
      const commentReqIds = commentSelData.requestIds || [];

      if (isNaN(commentSelNum) || commentSelNum < 1 || commentSelNum > commentReqIds.length) {
        await sendMessage(chatId, `⚠️ Por favor responde con un número del 1 al ${commentReqIds.length}.`);
        return;
      }

      const commentReqId = commentReqIds[commentSelNum - 1];

      await saveConversationState({
        chatId: chatId.toString(),
        userId,
        step: 'awaiting_comment_text',
        data: { requestIds: [commentReqId] },
      }, getSupabase());

      await sendMessage(chatId, '💬 Escribe tu comentario:');
      break;
    }

    case 'awaiting_comment_text': {
      const commentTextData = state.data as CompleteRequestData;
      const commentTargetId = (commentTextData.requestIds || [])[0];

      if (!text.trim()) {
        await sendMessage(chatId, '⚠️ El comentario no puede estar vacío.');
        return;
      }

      // Find the user's DB ID
      const { data: commentUser } = await getSupabase()
        .from('users')
        .select('id')
        .eq('telegram_id', userId)
        .single();

      // Insert comment
      const { error: commentErr } = await getSupabase()
        .from('comments')
        .insert({
          request_id: commentTargetId,
          user_id: commentUser?.id || null,
          content: text.trim(),
          ...(TEAM_ID && { team_id: TEAM_ID }),
        });

      if (commentErr) {
        await sendMessage(chatId, '❌ Error al agregar comentario.');
      } else {
        await sendMessage(chatId, '💬 *Comentario agregado!*\n\nSe puede ver en el dashboard.');

        // Log activity
        await getSupabase().from('activity_log').insert({
          request_id: commentTargetId,
          user_id: commentUser?.id || null,
          action: 'commented',
          details: { comment: text.trim() },
          ...(TEAM_ID && { team_id: TEAM_ID }),
        });
      }

      await clearConversationState(chatId.toString(), userId, getSupabase());
      break;
    }
  }
}

/**
 * Comando /completar - Marcar pedido como completado
 */
async function handleCompletarCommand(chatId: number, userId: string) {
  let completarQuery = getSupabase()
    .from('requests')
    .select('*')
    .not('status', 'in', '("completed","cancelled")')
    .order('deadline', { ascending: true })
    .limit(10);

  if (TEAM_ID) {
    completarQuery = completarQuery.eq('team_id', TEAM_ID);
  }

  const { data: requests, error } = await completarQuery;

  if (error) {
    await sendMessage(chatId, '❌ Error al obtener los pedidos. Intenta de nuevo.');
    return;
  }

  if (!requests || requests.length === 0) {
    await sendMessage(chatId, '📭 No hay pedidos activos para completar.');
    return;
  }

  // Guardar los IDs de los pedidos en el estado de conversación
  const requestIds = requests.map((req: Request) => req.id);
  await saveConversationState(
    {
      chatId: chatId.toString(),
      userId: userId,
      step: 'awaiting_complete_selection',
      data: { requestIds },
    },
    getSupabase()
  );

  // Mostrar lista de pedidos con números
  let message = '📝 *Pedidos activos*\n\nResponde con el número del pedido a completar:\n\n';
  requests.forEach((req: Request, index: number) => {
    const emoji = getPriorityEmoji(req.priority);
    message += `*${index + 1}.* ${emoji} ${req.client} - ${req.description.substring(0, 40)}${req.description.length > 40 ? '...' : ''}\n`;
  });
  message += '\nO usa /cancelar para cancelar.';

  await sendMessage(chatId, message);
}

/**
 * Comando /ver - Muestra todos los pedidos activos
 */
async function handleVerCommand(chatId: number) {
  let verQuery = getSupabase()
    .from('requests')
    .select('*')
    .in('status', ['pending', 'in_progress'])
    .order('deadline', { ascending: true });

  if (TEAM_ID) {
    verQuery = verQuery.eq('team_id', TEAM_ID);
  }

  const { data: requests, error } = await verQuery;

  if (error) {
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
  let hoyQuery = getSupabase()
    .from('requests')
    .select('*')
    .in('status', ['pending', 'in_progress']);

  if (TEAM_ID) {
    hoyQuery = hoyQuery.eq('team_id', TEAM_ID);
  }

  const { data: requests, error } = await hoyQuery;

  if (error) {
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
  let semanaQuery = getSupabase()
    .from('requests')
    .select('*')
    .in('status', ['pending', 'in_progress']);

  if (TEAM_ID) {
    semanaQuery = semanaQuery.eq('team_id', TEAM_ID);
  }

  const { data: requests, error } = await semanaQuery;

  if (error) {
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
  let urgenteQuery = getSupabase()
    .from('requests')
    .select('*')
    .in('status', ['pending', 'in_progress']);

  if (TEAM_ID) {
    urgenteQuery = urgenteQuery.eq('team_id', TEAM_ID);
  }

  const { data: requests, error } = await urgenteQuery;

  if (error) {
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

/**
 * Maneja los callback queries (cuando se presionan botones inline)
 */
async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  if (!chatId || !data) {
    await answerCallbackQuery(callbackQuery.id, '❌ Error', true);
    return;
  }

  // Verificar que el usuario esté autorizado
  const user = await getUserByTelegramId(userId.toString(), getSupabase());
  if (!user) {
    await answerCallbackQuery(callbackQuery.id, '❌ No autorizado', true);
    return;
  }

  try {
    // Manejar diferentes acciones
    if (data === 'view_all') {
      await answerCallbackQuery(callbackQuery.id);
      await handleVerCommand(chatId);
    }
    else if (data === 'my_requests') {
      await answerCallbackQuery(callbackQuery.id);
      await handleMiosCommand(chatId, user.id);
    }
    else if (data === 'urgent') {
      await answerCallbackQuery(callbackQuery.id);
      await handleUrgenteCommand(chatId);
    }
    else if (data === 'today') {
      await answerCallbackQuery(callbackQuery.id);
      await handleHoyCommand(chatId);
    }
    else if (data === 'week') {
      await answerCallbackQuery(callbackQuery.id);
      await handleSemanaCommand(chatId);
    }
    else if (data === 'new_request') {
      await answerCallbackQuery(callbackQuery.id);
      await handleNuevoPedidoCommand(chatId, userId.toString(), user.id);
    }
    else if (data.startsWith('complete_')) {
      const requestId = data.replace('complete_', '');

      // Validar que el requestId sea un UUID válido
      if (!isValidUUID(requestId)) {
        await answerCallbackQuery(callbackQuery.id, '❌ ID inválido', true);
        return;
      }

      await answerCallbackQuery(callbackQuery.id);

      // Obtener el pedido
      const { data: request } = await getSupabase()
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (request && messageId) {
        const confirmMessage = `¿Completar este pedido?\n\n*${request.client}*\n${request.description}`;
        const buttons = createCompleteConfirmButtons(requestId);
        await editMessageText(chatId, messageId, confirmMessage, 'Markdown', buttons);
      }
    }
    else if (data.startsWith('confirm_complete_')) {
      const requestId = data.replace('confirm_complete_', '');

      // Validar UUID
      if (!isValidUUID(requestId)) {
        await answerCallbackQuery(callbackQuery.id, '❌ ID inválido', true);
        return;
      }

      await answerCallbackQuery(callbackQuery.id, '✅ Completado!');

      // Marcar como completado
      const { data: updatedRequest, error } = await getSupabase()
        .from('requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

      if (!error && updatedRequest && messageId) {
        await editMessageText(
          chatId,
          messageId,
          `✅ *Pedido completado!*\n\n${updatedRequest.client} - ${updatedRequest.description}\n\n🎉 ¡Buen trabajo!`,
          'Markdown',
          createMainMenuButtons()
        );
      }
    }
    else if (data.startsWith('details_')) {
      const requestId = data.replace('details_', '');

      // Validar UUID
      if (!isValidUUID(requestId)) {
        await answerCallbackQuery(callbackQuery.id, '❌ ID inválido', true);
        return;
      }

      await answerCallbackQuery(callbackQuery.id);

      // Obtener detalles del pedido
      const { data: request } = await getSupabase()
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (request) {
        const details = formatRequestForTelegram(request as Request, true);
        const buttons = createRequestButtons(requestId);
        await sendMessageWithButtons(chatId, details, buttons);
      }
    }
    else if (data === 'cancel_action') {
      await answerCallbackQuery(callbackQuery.id, 'Cancelado');
      if (messageId) {
        await editMessageText(
          chatId,
          messageId,
          '❌ Acción cancelada.',
          'Markdown',
          createMainMenuButtons()
        );
      }
    }
    else if (data === 'main_menu') {
      await answerCallbackQuery(callbackQuery.id);
      await sendMessageWithButtons(
        chatId,
        '📋 *Menú Principal*\n\n¿Qué deseas hacer?',
        createMainMenuButtons()
      );
    }
    else if (data?.startsWith('status_')) {
      // Handle status change callback from inline buttons
      const parts = data.split('_');
      const newStatus = parts.slice(1, -1).join('_'); // e.g., 'in_progress', 'blocked'
      const reqId = parts[parts.length - 1]; // UUID at the end

      if (newStatus === 'blocked') {
        // Need to ask for reason via conversation
        const fromUser = callbackQuery.from;
        await saveConversationState({
          chatId: chatId.toString(),
          userId: fromUser.id.toString(),
          step: 'awaiting_blocked_reason',
          data: { requestIds: [reqId] },
        }, getSupabase());
        await answerCallbackQuery(callbackQuery.id, 'Escribe el motivo del bloqueo');
        await sendMessage(chatId, '🔴 *Motivo del bloqueo:*\n\nEscribe por qué se bloquea este pedido:');
      } else {
        const updateFields: Record<string, unknown> = {
          status: newStatus,
          status_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (newStatus === 'completed') updateFields.completed_at = new Date().toISOString();
        if (newStatus !== 'blocked') {
          updateFields.blocked_reason = null;
          updateFields.blocked_at = null;
        }

        const { error: statusErr } = await getSupabase()
          .from('requests')
          .update(updateFields)
          .eq('id', reqId);

        if (statusErr) {
          await answerCallbackQuery(callbackQuery.id, '❌ Error', true);
        } else {
          const statusLabelsMap: Record<string, string> = {
            pending: '⏳ Pendiente', in_progress: '🔵 En Progreso', in_review: '🟣 En Revisión',
            blocked: '🔴 Bloqueado', needs_revision: '🟠 Necesita Revisión',
            completed: '✅ Completado', cancelled: '❌ Cancelado',
          };
          await answerCallbackQuery(callbackQuery.id, `Cambiado a ${statusLabelsMap[newStatus] || newStatus}`);

          if (messageId) {
            await editMessageText(chatId, messageId, `✅ Estado cambiado a *${statusLabelsMap[newStatus] || newStatus}*`);
          }

          await getSupabase().from('activity_log').insert({
            request_id: reqId,
            action: 'status_changed',
            details: { to_status: newStatus },
            ...(TEAM_ID && { team_id: TEAM_ID }),
          });
        }
      }
    }
    else {
      await answerCallbackQuery(callbackQuery.id, 'Acción no reconocida');
    }
  } catch (error) {
    await answerCallbackQuery(callbackQuery.id, '❌ Error', true);
  }
}

/**
 * Comando /estado - Cambiar estado de un pedido
 */
async function handleEstadoCommand(chatId: number, userId: string) {
  let query = getSupabase()
    .from('requests')
    .select('*')
    .not('status', 'in', '("completed","cancelled")')
    .order('deadline', { ascending: true })
    .limit(10);

  if (TEAM_ID) {
    query = query.eq('team_id', TEAM_ID);
  }

  const { data: requests, error } = await query;

  if (error) {
    await sendMessage(chatId, '❌ Error al obtener los pedidos.');
    return;
  }

  if (!requests || requests.length === 0) {
    await sendMessage(chatId, '📭 No hay pedidos activos.');
    return;
  }

  const statusLabels: Record<string, string> = {
    pending: '⏳', in_progress: '🔵', in_review: '🟣',
    blocked: '🔴', needs_revision: '🟠',
  };

  let msg = '📋 *Cambiar estado de pedido*\n\nSelecciona el pedido:\n\n';
  requests.forEach((req: Request, i: number) => {
    const emoji = statusLabels[req.status] || '❓';
    msg += `${i + 1}. ${emoji} *${req.client}* - ${req.description.slice(0, 40)}${req.description.length > 40 ? '...' : ''}\n`;
  });
  msg += '\nResponde con el número o /cancelar';

  const requestIds = requests.map((req: Request) => req.id);
  await saveConversationState({
    chatId: chatId.toString(),
    userId,
    step: 'awaiting_status_selection',
    data: { requestIds },
  }, getSupabase());

  await sendMessage(chatId, msg);
}

/**
 * Comando /comentar - Agregar comentario a un pedido
 */
async function handleComentarCommand(chatId: number, userId: string) {
  let query = getSupabase()
    .from('requests')
    .select('*')
    .not('status', 'in', '("completed","cancelled")')
    .order('deadline', { ascending: true })
    .limit(10);

  if (TEAM_ID) {
    query = query.eq('team_id', TEAM_ID);
  }

  const { data: requests, error } = await query;

  if (error) {
    await sendMessage(chatId, '❌ Error al obtener los pedidos.');
    return;
  }

  if (!requests || requests.length === 0) {
    await sendMessage(chatId, '📭 No hay pedidos activos.');
    return;
  }

  let msg = '💬 *Agregar comentario*\n\nSelecciona el pedido:\n\n';
  requests.forEach((req: Request, i: number) => {
    msg += `${i + 1}. *${req.client}* - ${req.description.slice(0, 40)}${req.description.length > 40 ? '...' : ''}\n`;
  });
  msg += '\nResponde con el número o /cancelar';

  const requestIds = requests.map((req: Request) => req.id);
  await saveConversationState({
    chatId: chatId.toString(),
    userId,
    step: 'awaiting_comment_selection',
    data: { requestIds },
  }, getSupabase());

  await sendMessage(chatId, msg);
}
