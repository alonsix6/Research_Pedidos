'use client';

import { useState } from 'react';
import { Request } from '@/lib/types';
import { formatLimaDate, formatDaysLeft } from '@/lib/utils';
import { Check, Pencil, Trash2, GripVertical, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { padVariants, springs } from '@/lib/animations';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import StatusBadge, { StatusLED } from './StatusBadge';

interface PedidoPadProps {
  request: Request;
  onComplete?: (id: string) => void;
  onEdit?: (request: Request) => void;
  onDelete?: (id: string) => void;
  onOpenDetail?: (request: Request) => void;
  compact?: boolean;
  isDraggable?: boolean;
  /** Start collapsed - useful for large lists */
  defaultCollapsed?: boolean;
}

// Threshold for auto-truncating long descriptions
const DESCRIPTION_TRUNCATE_LENGTH = 100;

export default function PedidoPad({
  request,
  onComplete,
  onEdit,
  onDelete,
  onOpenDetail,
  compact = false,
  isDraggable = false,
  defaultCollapsed = false,
}: PedidoPadProps) {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);
  const daysLeft = formatDaysLeft(request.deadline);
  const isLongDescription = request.description.length > DESCRIPTION_TRUNCATE_LENGTH;
  const isUrgent = daysLeft.includes('Atrasado') || daysLeft.includes('HOY');
  const isCompleted = request.status === 'completed';
  const isBlocked = request.status === 'blocked';

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
    <motion.article
      ref={setNodeRef}
      style={style}
      className={`
        relative rounded-md overflow-hidden
        ${isCompleted ? 'pad-card-completed' : 'pad-card'}
        ${isDragging ? 'shadow-2xl' : ''}
        ${onOpenDetail ? 'cursor-pointer' : ''}
      `}
      variants={padVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={!isDragging ? "hover" : undefined}
      whileTap={!isDragging ? "tap" : undefined}
      layout
      aria-label={`Pedido de ${request.client}: ${request.description.slice(0, 50)}${request.description.length > 50 ? '...' : ''}`}
      onClick={(e) => {
        // Don't open detail if clicking on action buttons or drag handle
        if ((e.target as HTMLElement).closest('button, [data-drag-handle]')) return;
        onOpenDetail?.(request);
      }}
    >
      {/* Drag handle */}
      {isDraggable && !isCompleted && (
        <div
          {...attributes}
          {...listeners}
          data-drag-handle
          className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/10 transition-colors"
        >
          <GripVertical size={12} className="text-gray-600" />
        </div>
      )}

      {/* Status Badge - replaces the old LED */}
      <div className="absolute top-2 right-2">
        <StatusBadge status={request.status} size="sm" showLabel={!compact} />
      </div>

      {/* Contenido */}
      <div className={`${isDraggable && !isCompleted ? 'pl-6' : ''} pr-4`}>
        {/* Cliente */}
        <h3
          className={`font-bold uppercase tracking-wide mb-1 ${compact ? 'text-[10px]' : 'text-xs'}`}
          style={{ color: '#E5E5E5' }}
        >
          {request.client}
        </h3>

        {/* Descripcion - collapsible for long content */}
        {!compact && (
          <div className="mb-2">
            <AnimatePresence initial={false}>
              {isExpanded ? (
                <motion.p
                  key="expanded"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[11px]"
                  style={{ color: '#B0B0B0' }}
                >
                  {request.description}
                </motion.p>
              ) : (
                <motion.p
                  key="collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[11px]"
                  style={{ color: '#B0B0B0' }}
                >
                  {request.description.slice(0, DESCRIPTION_TRUNCATE_LENGTH)}
                  {isLongDescription && '...'}
                </motion.p>
              )}
            </AnimatePresence>
            {isLongDescription && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className="flex items-center gap-0.5 text-[9px] mt-1 hover:text-[#00E5FF] transition-colors"
                style={{ color: '#666' }}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Contraer descripción' : 'Expandir descripción'}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp size={10} />
                    <span>Ver menos</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={10} />
                    <span>Ver más</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Blocked reason indicator */}
        {isBlocked && request.blocked_reason && !compact && (
          <div
            className="mb-2 px-2 py-1 rounded text-[9px]"
            style={{ background: 'rgba(229,57,53,0.1)', color: '#EF5350', border: '1px solid rgba(229,57,53,0.15)' }}
          >
            Bloqueado: {request.blocked_reason.length > 60 ? request.blocked_reason.slice(0, 60) + '...' : request.blocked_reason}
          </div>
        )}

        {/* Info */}
        <div className={`flex items-center gap-3 ${compact ? 'text-[8px]' : 'text-[9px]'}`} style={{ color: '#949494' }}>
          <span>{request.requester_name}</span>
          <span style={{ color: '#666' }} aria-hidden="true">|</span>
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
            style={{ color: isUrgent ? '#E53935' : isBlocked ? '#E53935' : '#00C853' }}
          >
            {isBlocked ? 'Bloqueado' : daysLeft}
          </div>
        )}
      </div>

      {/* Acciones */}
      {(onComplete || onEdit || onDelete || onOpenDetail) && !isCompleted && (
        <div
          className={`flex items-center gap-1 ${compact ? 'mt-2 pt-1.5' : 'mt-3 pt-2'}`}
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {onComplete && request.status === 'in_review' && (
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
          {onOpenDetail && (
            <ActionButton
              onClick={() => onOpenDetail(request)}
              color="grey"
              title="Ver detalle"
              compact={compact}
            >
              <ExternalLink size={compact ? 10 : 12} />
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
          role="status"
        >
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            aria-hidden="true"
          >
            <Check size={10} />
          </motion.div>
          <span className="uppercase tracking-wide">Completado</span>
        </motion.div>
      )}
    </motion.article>
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

  // WCAG: Minimum touch target 44px, but allow smaller with adequate spacing
  const size = compact ? 'w-8 h-8' : 'w-9 h-9';

  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={title}
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
