// Tipos para las tablas de Supabase

export type UserRole = 'analyst' | 'assistant' | 'coordinator' | 'practicante';

export type RequestStatus = 'pending' | 'in_progress' | 'in_review' | 'blocked' | 'needs_revision' | 'completed' | 'cancelled';

export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Team {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface User {
  id: string;
  telegram_id: string;
  telegram_username: string | null;
  name: string;
  role: UserRole;
  team_id: string | null;
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
  blocked_reason: string | null;
  blocked_at: string | null;
  original_deadline: string | null;
  status_changed_at: string | null;
  status_changed_by: string | null;
  created_at: string;
  completed_at: string | null;
  created_by: string;
  updated_at: string;
  team_id: string | null;
}

export interface ActivityLog {
  id: string;
  request_id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  team_id: string | null;
}

export interface Comment {
  id: string;
  request_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  team_id: string | null;
  user?: User;
}

export interface ConversationState {
  chat_id: string;
  user_id: string | null;
  step: string;
  data: NewRequestData | CompleteRequestData;
  updated_at: string;
  team_id: string | null;
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
  | 'awaiting_complete_selection'
  | 'awaiting_status_selection'
  | 'awaiting_status_change'
  | 'awaiting_blocked_reason'
  | 'awaiting_comment_selection'
  | 'awaiting_comment_text';

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
