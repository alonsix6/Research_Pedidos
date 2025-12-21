'use client';

import {
  Circle,
  CircleDot,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  HelpCircle,
  Check,
  Pencil,
  Trash2,
  Plus,
  X,
  Calendar,
  User,
  Briefcase,
  FileText,
  Send,
  Lightbulb,
  LayoutDashboard,
  ListTodo,
  ClipboardCheck,
} from 'lucide-react';

interface IconProps {
  className?: string;
  size?: number;
}

// Iconos de prioridad
export function PriorityUrgent({ className, size = 16 }: IconProps) {
  return <CircleDot className={className} size={size} style={{ color: '#FF4500' }} />;
}

export function PriorityHigh({ className, size = 16 }: IconProps) {
  return <CircleDot className={className} size={size} style={{ color: '#FFA500' }} />;
}

export function PriorityNormal({ className, size = 16 }: IconProps) {
  return <CircleDot className={className} size={size} style={{ color: '#00CC66' }} />;
}

export function PriorityLow({ className, size = 16 }: IconProps) {
  return <Circle className={className} size={size} style={{ color: '#999999' }} />;
}

export function getPriorityIcon(priority: string, size = 16) {
  switch (priority) {
    case 'urgent':
      return <PriorityUrgent size={size} />;
    case 'high':
      return <PriorityHigh size={size} />;
    case 'normal':
      return <PriorityNormal size={size} />;
    case 'low':
      return <PriorityLow size={size} />;
    default:
      return <PriorityLow size={size} />;
  }
}

// Iconos de estado
export function StatusPending({ className, size = 16 }: IconProps) {
  return <Clock className={className} size={size} style={{ color: '#FFA500' }} />;
}

export function StatusInProgress({ className, size = 16 }: IconProps) {
  return <RefreshCw className={className} size={size} style={{ color: '#3B82F6' }} />;
}

export function StatusCompleted({ className, size = 16 }: IconProps) {
  return <CheckCircle2 className={className} size={size} style={{ color: '#00CC66' }} />;
}

export function StatusCancelled({ className, size = 16 }: IconProps) {
  return <XCircle className={className} size={size} style={{ color: '#FF4500' }} />;
}

export function getStatusIcon(status: string, size = 16) {
  switch (status) {
    case 'pending':
      return <StatusPending size={size} />;
    case 'in_progress':
      return <StatusInProgress size={size} />;
    case 'completed':
      return <StatusCompleted size={size} />;
    case 'cancelled':
      return <StatusCancelled size={size} />;
    default:
      return <HelpCircle size={size} style={{ color: '#999' }} />;
  }
}

// Iconos de secciones
export function SectionUrgent({ className, size = 16 }: IconProps) {
  return <AlertCircle className={className} size={size} style={{ color: '#FF4500' }} />;
}

export function SectionThisWeek({ className, size = 16 }: IconProps) {
  return <Calendar className={className} size={size} style={{ color: '#FFA500' }} />;
}

export function SectionLater({ className, size = 16 }: IconProps) {
  return <Clock className={className} size={size} style={{ color: '#00CC66' }} />;
}

export function SectionCompleted({ className, size = 16 }: IconProps) {
  return <CheckCircle2 className={className} size={size} style={{ color: '#00CC66' }} />;
}

// Iconos de acciones
export { Check as CheckIcon };
export { Pencil as EditIcon };
export { Trash2 as DeleteIcon };
export { Plus as PlusIcon };
export { X as CloseIcon };
export { Calendar as CalendarIcon };
export { User as UserIcon };
export { Briefcase as ClientIcon };
export { FileText as DescriptionIcon };
export { Send as SendIcon };
export { Lightbulb as TipIcon };
export { LayoutDashboard as DashboardIcon };
export { ListTodo as ListIcon };
export { ClipboardCheck as TaskIcon };
export { AlertCircle as AlertIcon };
