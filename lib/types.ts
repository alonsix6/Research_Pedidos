// Tipos para las tablas de Supabase

export type UserRole = 'analyst' | 'assistant' | 'coordinator' | 'practicante';

export type RequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface User {
  id: string;
  telegram_id: string;
  telegram_username: string | null;
  name: string;
  role: UserRole;
  created_at?: string;
}

export interface Request {
  id: string;
  client: string;
  description: string;
  requester_name: string;
  requester_role: string;
  assigned_to: string | null;
  deadline: string;
  status: RequestStatus;
  priority: RequestPriority;
  completion_notes: string | null;
  created_at: string;
  completed_at: string | null;
  created_by: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  request_id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ConversationState {
  chat_id: string;
  user_id: string | null;
  step: string;
  data: NewRequestData | CompleteRequestData;
  updated_at: string;
}

// Tipos extendidos para el dashboard
export interface RequestWithUser extends Request {
  assigned_user?: User;
  creator_user?: User;
}

// Tipos para el bot de Telegram
export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
    language_code?: string;
  };
  chat: {
    id: number;
    first_name?: string;
    username?: string;
    type: string;
  };
  date: number;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

// Estados del flujo conversacional
export type ConversationStep =
  | 'idle'
  | 'awaiting_client'
  | 'awaiting_description'
  | 'awaiting_requester'
  | 'awaiting_deadline'
  | 'awaiting_assigned'
  | 'awaiting_complete_selection';

export interface NewRequestData {
  client?: string;
  description?: string;
  requester_name?: string;
  requester_role?: string;
  deadline?: string;
  assigned_to?: string;
}

export interface CompleteRequestData {
  requestIds?: string[];
}
