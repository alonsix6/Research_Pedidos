'use client';

import { Request } from '@/lib/types';
import { formatLimaDate, formatDaysLeft } from '@/lib/utils';
import { Check, Pencil, Trash2, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { padVariants, springs } from '@/lib/animations';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PedidoPadProps {
  request: Request;
  onComplete?: (id: string) => void;
  onEdit?: (request: Request) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
  isDraggable?: boolean;
}

export default function PedidoPad({
  request,
  onComplete,
  onEdit,
  onDelete,
  compact = false,
  isDraggable = false,
}: PedidoPadProps) {
  const daysLeft = formatDaysLeft(request.deadline);
  const isUrgent = daysLeft.includes('Atrasado') || daysLeft.includes('HOY');
  const isCompleted = request.status === 'completed';

  const priorityColor = {
    urgent: '#E53935',
    high: '#FFD600',
    normal: '#00C853',
    low: '#666666',
  }[request.priority] || '#666666';

  // DnD Kit sortable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: request.id,
    disabled: !isDraggable || isCompleted,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`
        relative rounded-md overflow-hidden
        ${isCompleted ? 'pad-card-completed' : 'pad-card'}
        ${isDragging ? 'shadow-2xl' : ''}
      `}
      variants={padVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={!isDragging ? "hover" : undefined}
      whileTap={!isDragging ? "tap" : undefined}
      layout
    >
      {/* Drag handle */}
      {isDraggable && !isCompleted && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/10 transition-colors"
        >
          <GripVertical size={12} className="text-gray-600" />
        </div>
      )}

      {/* LED indicador de prioridad - con pulso para urgentes */}
      <motion.div
        className="absolute top-2 right-2 w-2 h-2 rounded-full"
        style={{
          background: isCompleted ? '#555' : priorityColor,
          boxShadow: isCompleted
            ? 'inset 0 1px 2px rgba(0,0,0,0.3)'
            : `0 0 6px ${priorityColor}, 0 0 10px ${priorityColor}50`,
        }}
        animate={
          isUrgent && !isCompleted
            ? { opacity: [0.7, 1, 0.7], scale: [1, 1.1, 1] }
            : {}
        }
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Contenido */}
      <div className={`${isDraggable && !isCompleted ? 'pl-6' : ''} pr-4`}>
        {/* Cliente */}
        <h3
          className={`font-bold uppercase tracking-wide mb-1 ${compact ? 'text-[10px]' : 'text-xs'}`}
          style={{ color: '#E5E5E5' }}
        >
          {request.client}
        </h3>

        {/* Descripcion */}
        {!compact && (
          <p
            className="text-[11px] mb-2 line-clamp-2"
            style={{ color: '#999' }}
          >
            {request.description}
          </p>
        )}

        {/* Info */}
        <div className={`flex items-center gap-3 ${compact ? 'text-[8px]' : 'text-[9px]'}`} style={{ color: '#666' }}>
          <span>{request.requester_name}</span>
          <span style={{ color: '#444' }}>|</span>
          <span>
            {isCompleted && request.completed_at
              ? formatLimaDate(request.completed_at)
              : formatLimaDate(request.deadline)}
          </span>
        </div>

        {/* Tiempo restante - solo para items NO completados */}
        {!isCompleted && (
          <div
            className={`mt-2 font-medium ${compact ? 'text-[9px]' : 'text-[10px]'}`}
            style={{ color: isUrgent ? '#E53935' : '#00C853' }}
          >
            {daysLeft}
          </div>
        )}
      </div>

      {/* Acciones */}
      {(onComplete || onEdit || onDelete) && !isCompleted && (
        <div
          className={`flex items-center gap-1 ${compact ? 'mt-2 pt-1.5' : 'mt-3 pt-2'}`}
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {onComplete && (
            <ActionButton
              onClick={() => onComplete(request.id)}
              color="green"
              title="Completar"
              compact={compact}
            >
              <Check size={compact ? 10 : 12} />
            </ActionButton>
          )}
          {onEdit && (
            <ActionButton
              onClick={() => onEdit(request)}
              color="grey"
              title="Editar"
              compact={compact}
            >
              <Pencil size={compact ? 10 : 12} />
            </ActionButton>
          )}
          {onDelete && (
            <ActionButton
              onClick={() => onDelete(request.id)}
              color="grey"
              title="Eliminar"
              compact={compact}
            >
              <Trash2 size={compact ? 10 : 12} />
            </ActionButton>
          )}
        </div>
      )}

      {isCompleted && (
        <motion.div
          className="mt-2 flex items-center gap-1.5 text-[9px]"
          style={{ color: '#00C853' }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springs.bouncy}
        >
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Check size={10} />
          </motion.div>
          <span className="uppercase tracking-wide">Completado</span>
        </motion.div>
      )}
    </motion.div>
  );
}

function ActionButton({
  onClick,
  color,
  title,
  children,
  compact = false,
}: {
  onClick: () => void;
  color: 'green' | 'grey' | 'red';
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const colors = {
    green: {
      bg: 'linear-gradient(180deg, #2EE67A 0%, #00C853 100%)',
      shadow: '#00962C',
    },
    grey: {
      bg: 'linear-gradient(180deg, #5A5A5A 0%, #4A4A4A 100%)',
      shadow: '#2A2A2A',
    },
    red: {
      bg: 'linear-gradient(180deg, #FF6B6B 0%, #E53935 100%)',
      shadow: '#B71C1C',
    },
  };

  const size = compact ? 'w-6 h-6' : 'w-7 h-7';

  return (
    <motion.button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center ${size} rounded-sm`}
      style={{
        background: colors[color].bg,
        color: 'white',
        boxShadow: `0 2px 0 ${colors[color].shadow}, 0 3px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95, y: 2 }}
      transition={springs.snappy}
    >
      {children}
    </motion.button>
  );
}
