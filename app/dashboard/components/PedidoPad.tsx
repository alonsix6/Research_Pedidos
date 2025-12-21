'use client';

import { Request } from '@/lib/types';
import { formatLimaDate, formatDaysLeft } from '@/lib/utils';
import { Check, Pencil, Trash2 } from 'lucide-react';

interface PedidoPadProps {
  request: Request;
  onComplete?: (id: string) => void;
  onEdit?: (request: Request) => void;
  onDelete?: (id: string) => void;
}

export default function PedidoPad({
  request,
  onComplete,
  onEdit,
  onDelete,
}: PedidoPadProps) {
  const daysLeft = formatDaysLeft(request.deadline);
  const isUrgent = daysLeft.includes('Atrasado') || daysLeft.includes('HOY');
  const isCompleted = request.status === 'completed';

  const priorityColor = {
    urgent: '#CE2021',
    high: '#FFC003',
    normal: '#1AA167',
    low: '#666666',
  }[request.priority] || '#666666';

  return (
    <div
      className={`
        relative rounded-md overflow-hidden
        ${isCompleted ? 'pad-card-completed' : 'pad-card'}
      `}
    >
      {/* LED indicador de prioridad */}
      <div
        className="absolute top-2 right-2 w-2 h-2 rounded-full"
        style={{
          background: priorityColor,
          boxShadow: `0 0 6px ${priorityColor}, 0 0 10px ${priorityColor}50`,
        }}
      />

      {/* Contenido */}
      <div className="pr-4">
        {/* Cliente */}
        <h3
          className="text-xs font-bold uppercase tracking-wide mb-1"
          style={{ color: '#E5E5E5' }}
        >
          {request.client}
        </h3>

        {/* Descripcion */}
        <p
          className="text-[11px] mb-2 line-clamp-2"
          style={{ color: '#999' }}
        >
          {request.description}
        </p>

        {/* Info */}
        <div className="flex items-center gap-3 text-[9px]" style={{ color: '#666' }}>
          <span>{request.requester_name}</span>
          <span style={{ color: '#444' }}>|</span>
          <span>{formatLimaDate(request.deadline)}</span>
        </div>

        {/* Tiempo restante */}
        <div
          className="mt-2 text-[10px] font-medium"
          style={{ color: isUrgent ? '#CE2021' : '#1AA167' }}
        >
          {daysLeft}
        </div>
      </div>

      {/* Acciones */}
      {(onComplete || onEdit || onDelete) && !isCompleted && (
        <div
          className="flex items-center gap-1 mt-3 pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {onComplete && (
            <ActionButton
              onClick={() => onComplete(request.id)}
              color="green"
              title="Completar"
            >
              <Check size={12} />
            </ActionButton>
          )}
          {onEdit && (
            <ActionButton
              onClick={() => onEdit(request)}
              color="grey"
              title="Editar"
            >
              <Pencil size={12} />
            </ActionButton>
          )}
          {onDelete && (
            <ActionButton
              onClick={() => onDelete(request.id)}
              color="grey"
              title="Eliminar"
            >
              <Trash2 size={12} />
            </ActionButton>
          )}
        </div>
      )}

      {isCompleted && (
        <div
          className="mt-3 pt-2 flex items-center gap-1 text-[9px]"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            color: '#1AA167',
          }}
        >
          <Check size={10} />
          COMPLETADO
        </div>
      )}
    </div>
  );
}

function ActionButton({
  onClick,
  color,
  title,
  children,
}: {
  onClick: () => void;
  color: 'green' | 'grey' | 'red';
  title: string;
  children: React.ReactNode;
}) {
  const colors = {
    green: {
      bg: 'linear-gradient(180deg, #1FBF7A 0%, #1AA167 100%)',
      shadow: '#147A4D',
    },
    grey: {
      bg: 'linear-gradient(180deg, #5A5A5A 0%, #4A4A4A 100%)',
      shadow: '#2A2A2A',
    },
    red: {
      bg: 'linear-gradient(180deg, #E53935 0%, #CE2021 100%)',
      shadow: '#8B1515',
    },
  };

  return (
    <button
      onClick={onClick}
      title={title}
      className="
        flex items-center justify-center
        w-7 h-7 rounded-sm
        transition-all duration-50
        active:translate-y-[2px]
      "
      style={{
        background: colors[color].bg,
        color: 'white',
        boxShadow: `0 2px 0 ${colors[color].shadow}, 0 3px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`,
      }}
    >
      {children}
    </button>
  );
}
