import { Request } from './types';
import { formatLimaDate, formatDaysLeft, getPriorityEmoji, getStatusEmoji } from './utils';

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

/**
 * Envía un mensaje de texto a un chat
 */
export async function sendMessage(chatId: string | number, text: string, parseMode: 'Markdown' | 'HTML' = 'Markdown') {
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
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
    console.error('Error sending message:', error);
    throw new Error(`Failed to send message: ${error}`);
  }

  return response.json();
}

/**
 * Envía un mensaje con botones inline
 */
export async function sendMessageWithButtons(
  chatId: string | number,
  text: string,
  buttons: InlineKeyboardMarkup,
  parseMode: 'Markdown' | 'HTML' = 'Markdown'
) {
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
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
    console.error('Error sending message with buttons:', error);
    throw new Error(`Failed to send message: ${error}`);
  }

  return response.json();
}

/**
 * Responde a un callback query (cuando se presiona un botón inline)
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
) {
  const response = await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Error answering callback:', error);
  }

  return response.json();
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
) {
  const body: any = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: parseMode,
  };

  if (buttons) {
    body.reply_markup = buttons;
  }

  const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Error editing message:', error);
  }

  return response.json();
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
      [
        { text: '📋 Ver todos', callback_data: 'view_all' },
      ],
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

  let message = `${priorityEmoji} *${request.client.toUpperCase()}*\n`;
  message += `${request.description}\n`;

  if (includeDetails) {
    message += `\n📋 Detalles:\n`;
    message += `• Solicitante: ${request.requester_name} (${request.requester_role})\n`;
    message += `• Deadline: ${formatLimaDate(request.deadline)} (${daysLeft})\n`;
    message += `• Estado: ${statusEmoji} ${request.status}\n`;
    if (request.assigned_to) {
      message += `• Asignado: @${request.assigned_to}\n`;
    }
  } else {
    message += `Solicitante: ${request.requester_name}\n`;
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
  return `🤖 *Reset R&A - Bot de Pedidos*

📝 *Comandos principales:*

/nuevopedido - Crear un nuevo pedido
/completar - Marcar pedido como completado
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

---
💡 *Tip:* Usa los botones de abajo para acceder rápidamente a las opciones.

⏰ *Resumen diario:* Recibirás un resumen automático a las 9am de Lunes a Viernes.`;
}

/**
 * Mensaje de bienvenida
 */
export function getWelcomeMessage(): string {
  return `👋 ¡Hola! Soy el bot de gestión de pedidos del equipo Reset R&A.

Usa /ayuda para ver todos los comandos disponibles.

¿Necesitas agregar un pedido? Usa /nuevopedido y te guiaré paso a paso.`;
}

/**
 * Valida que el mensaje venga de un usuario autorizado
 */
export async function isAuthorizedUser(telegramId: string, supabase: any): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', telegramId)
    .single();

  return !error && !!data;
}

/**
 * Obtiene el usuario desde Telegram ID
 */
export async function getUserByTelegramId(telegramId: string, supabase: any) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}
