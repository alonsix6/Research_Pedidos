import { Request, User } from './types';
import { formatLimaDate, formatDaysLeft, getPriorityEmoji, getStatusEmoji } from './utils';
import { SupabaseClient } from '@supabase/supabase-js';
import { getRequiredTeamId } from './teamId';
import { escapeMd } from './telegramMarkdown';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// Tipos para inline keyboard
export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

// Tipos para respuestas de Telegram API
interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

interface EditMessageBody {
  chat_id: string | number;
  message_id: number;
  text: string;
  parse_mode: string;
  reply_markup?: InlineKeyboardMarkup;
}

/**
 * Wrapper para fetch con retry exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Si no es el último intento, esperar con backoff exponencial
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

/**
 * Envía un mensaje de texto a un chat
 */
export async function sendMessage(
  chatId: string | number,
  text: string,
  parseMode: 'Markdown' | 'HTML' = 'Markdown'
): Promise<TelegramResponse> {
  const response = await fetchWithRetry(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send message: ${error}`);
  }

  return response.json() as Promise<TelegramResponse>;
}

/**
 * Envía un mensaje con botones inline
 */
export async function sendMessageWithButtons(
  chatId: string | number,
  text: string,
  buttons: InlineKeyboardMarkup,
  parseMode: 'Markdown' | 'HTML' = 'Markdown'
): Promise<TelegramResponse> {
  const response = await fetchWithRetry(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      reply_markup: buttons,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send message: ${error}`);
  }

  return response.json() as Promise<TelegramResponse>;
}

/**
 * Responde a un callback query (cuando se presiona un botón inline)
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<TelegramResponse> {
  const response = await fetchWithRetry(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
  });

  // Don't throw on error for callback queries, just return the response
  return response.json() as Promise<TelegramResponse>;
}

/**
 * Edita un mensaje existente (útil después de presionar un botón)
 */
export async function editMessageText(
  chatId: string | number,
  messageId: number,
  text: string,
  parseMode: 'Markdown' | 'HTML' = 'Markdown',
  buttons?: InlineKeyboardMarkup
): Promise<TelegramResponse> {
  const body: EditMessageBody = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: parseMode,
  };

  if (buttons) {
    body.reply_markup = buttons;
  }

  const response = await fetchWithRetry(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Don't throw on error for edit messages, just return the response
  return response.json() as Promise<TelegramResponse>;
}

/**
 * Crea botones inline para acciones rápidas en un pedido
 */
export function createRequestButtons(requestId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '✅ Completar', callback_data: `complete_${requestId}` },
        { text: '👁️ Ver detalles', callback_data: `details_${requestId}` },
      ],
      [{ text: '📋 Ver todos', callback_data: 'view_all' }],
    ],
  };
}

/**
 * Crea botones para el menú principal
 */
export function createMainMenuButtons(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '➕ Nuevo pedido', callback_data: 'new_request' },
        { text: '📋 Ver todos', callback_data: 'view_all' },
      ],
      [
        { text: '👤 Mis pedidos', callback_data: 'my_requests' },
        { text: '🔥 Urgentes', callback_data: 'urgent' },
      ],
      [
        { text: '📅 Hoy', callback_data: 'today' },
        { text: '📆 Esta semana', callback_data: 'week' },
      ],
    ],
  };
}

/**
 * Crea botones para confirmar completar un pedido
 */
export function createCompleteConfirmButtons(requestId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '✅ Sí, completar', callback_data: `confirm_complete_${requestId}` },
        { text: '❌ Cancelar', callback_data: 'cancel_action' },
      ],
    ],
  };
}

/**
 * Formatea un pedido para mostrar en Telegram
 */
export function formatRequestForTelegram(request: Request, includeDetails: boolean = true): string {
  const priorityEmoji = getPriorityEmoji(request.priority);
  const statusEmoji = getStatusEmoji(request.status);
  const daysLeft = formatDaysLeft(request.deadline);

  let message = `${priorityEmoji} *${escapeMd(request.client.toUpperCase())}*\n`;
  message += `${escapeMd(request.description)}\n`;

  if (includeDetails) {
    message += `\n📋 Detalles:\n`;
    message += `• Solicitante: ${escapeMd(request.requester_name)} (${escapeMd(request.requester_role)})\n`;
    message += `• Deadline: ${formatLimaDate(request.deadline)} (${daysLeft})\n`;
    message += `• Estado: ${statusEmoji} ${request.status}\n`;
    if (request.assigned_to) {
      message += `• Asignado: @${escapeMd(request.assigned_to)}\n`;
    }
  } else {
    message += `Solicitante: ${escapeMd(request.requester_name)}\n`;
    message += `${daysLeft}\n`;
  }

  return message;
}

/**
 * Formatea una lista de pedidos para Telegram
 */
export function formatRequestsList(requests: Request[], title: string = 'Pedidos'): string {
  if (requests.length === 0) {
    return `📭 No hay ${title.toLowerCase()} en este momento.`;
  }

  let message = `📊 *${title.toUpperCase()}* (${requests.length})\n\n`;

  requests.forEach((request, index) => {
    message += `*${index + 1}.* ${formatRequestForTelegram(request, false)}\n`;
  });

  return message;
}

/**
 * Mensaje de ayuda con todos los comandos
 */
export function getHelpMessage(): string {
  return `🤖 *Bot de Pedidos v3.0*

📝 *Comandos principales:*

/nuevopedido - Crear un nuevo pedido
/completar - Marcar pedido como completado
/estado - Cambiar estado de un pedido
/comentar - Agregar comentario a un pedido
/ver - Ver todos los pedidos activos
/mios - Ver mis pedidos asignados
/menu - Abrir menú con botones

📅 *Filtros por fecha:*

/hoy - Pedidos que vencen hoy
/semana - Pedidos de esta semana
/urgente - Pedidos urgentes (< 2 días)

🔧 *Utilidades:*

/cancelar - Cancelar operación actual
/ayuda - Ver este mensaje de ayuda

📊 *Estados disponibles:*
⏳ Pendiente → 🔵 En Progreso → 🟣 En Revisión → ✅ Completado
🔴 Bloqueado | 🟠 Necesita Revisión

---
💡 *Tip:* Usa los botones de abajo para acceder rápidamente a las opciones.

⏰ *Resumen diario:* Recibirás un resumen automático a las 9am de Lunes a Viernes.`;
}

/**
 * Mensaje de bienvenida
 */
export function getWelcomeMessage(): string {
  return `👋 ¡Hola! Soy el bot de gestión de pedidos del equipo.

Usa /ayuda para ver todos los comandos disponibles.

¿Necesitas agregar un pedido? Usa /nuevopedido y te guiaré paso a paso.`;
}

/**
 * Valida que el mensaje venga de un usuario autorizado (en el team actual)
 */
export async function isAuthorizedUser(
  telegramId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', telegramId)
    .eq('team_id', getRequiredTeamId())
    .single();
  return !error && !!data;
}

/**
 * Obtiene el usuario desde Telegram ID (filtrado por team)
 */
export async function getUserByTelegramId(
  telegramId: string,
  supabase: SupabaseClient
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .eq('team_id', getRequiredTeamId())
    .single();

  if (error || !data) {
    return null;
  }

  return data as User;
}
