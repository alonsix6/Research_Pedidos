import { SupabaseClient } from '@supabase/supabase-js';
import { ConversationStep, NewRequestData, CompleteRequestData } from './types';

/**
 * Helper para gestionar el estado de conversaciones
 */
export interface ConversationState {
  chatId: string;
  userId: string;
  step: ConversationStep;
  data: NewRequestData | CompleteRequestData;
}

/**
 * Obtiene el estado de conversación de un usuario
 */
export async function getConversationState(
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
  };
}

/**
 * Guarda el estado de conversación
 */
export async function saveConversationState(
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

/**
 * Limpia el estado de conversación
 */
export async function clearConversationState(
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
 * Mensajes del flujo conversacional
 */
export const conversationMessages = {
  start: '📝 *Nuevo pedido para el equipo*\n\n¿Para qué *cliente/cuenta*?',

  client: (client: string) =>
    `✅ Cliente: *${client}*\n\n¿Qué necesitan exactamente? (Describe el pedido)`,

  description: (desc: string) =>
    `✅ Pedido: ${desc}\n\n¿Quién lo solicitó? (Nombre y cargo, ej: "Andrea, ejecutiva")`,

  requester: (requester: string) =>
    `✅ Solicitante: ${requester}\n\n¿Fecha de entrega?\nPuedes usar:\n• Fecha: "25/12" o "25/12/2024"\n• Relativo: "hoy", "mañana", "en 3 días"`,

  deadline: (deadline: string, formatted: string) =>
    `✅ Deadline: ${formatted}\n\n¿Quién se encarga?\n1️⃣ Sol\n2️⃣ Estef\n3️⃣ Alonso\n4️⃣ Mellanie\n5️⃣ Sin asignar\n\nResponde con el número.`,

  summary: (data: NewRequestData, assigned: string, priority: string, emoji: string) => {
    const parts = data.requester_name?.split(',') || ['', ''];
    const name = parts[0]?.trim() || data.requester_name;
    const role = parts[1]?.trim() || '';

    return `✅ *Pedido creado!*\n\n📋 *Resumen:*\nCliente: ${data.client}\nPedido: ${data.description}\nSolicitante: ${name}${role ? ` (${role})` : ''}\nDeadline: ${data.deadline}\nAsignado: ${assigned}\nPrioridad: ${emoji} ${priority}\n\n✨ El pedido ha sido guardado y todos pueden verlo con /ver`;
  },

  cancel: '❌ Pedido cancelado. Usa /nuevopedido cuando quieras crear uno nuevo.',

  error: '⚠️ No entendí esa respuesta. Por favor intenta de nuevo.',

  invalidDate: '⚠️ No pude entender esa fecha. Usa formatos como:\n• "25/12" o "25/12/2024"\n• "hoy", "mañana"\n• "en 3 días"',

  invalidAssignment: '⚠️ Por favor responde con 1, 2, 3, 4 o 5.',
};
