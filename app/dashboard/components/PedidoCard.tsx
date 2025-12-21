'use client';

import { Request } from '@/lib/types';
import { formatLimaDate, formatDaysLeft } from '@/lib/utils';
import { getPriorityIcon, CheckIcon, EditIcon, DeleteIcon } from './Icons';

interface PedidoCardProps {
  request: Request;
  onComplete?: (id: string) => void;
  onEdit?: (request: Request) => void;
  onDelete?: (id: string) => void;
}

export default function PedidoCard({
  request,
  onComplete,
  onEdit,
  onDelete
}: PedidoCardProps) {
  const priorityIcon = getPriorityIcon(request.priority);
  const daysLeft = formatDaysLeft(request.deadline);

  return (
    <div className="card-op1 mb-3 hover:shadow-md transition-op1">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {priorityIcon}
            <h3 className="font-bold text-base uppercase">
              {request.client}
            </h3>
          </div>
          <p className="text-sm text-op1-text mb-2">
            {request.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-op1-text-secondary mb-3">
        <div>
          <span className="uppercase tracking-wide">Solicitante:</span>
          <br />
          <span className="text-op1-text">{request.requester_name}</span>
          {request.requester_role && ` (${request.requester_role})`}
        </div>
        <div>
          <span className="uppercase tracking-wide">Asignado:</span>
          <br />
          <span className="text-op1-text">
            {request.assigned_to || 'Sin asignar'}
          </span>
        </div>
        <div>
          <span className="uppercase tracking-wide">Deadline:</span>
          <br />
          <span className="text-op1-text">
            {formatLimaDate(request.deadline)}
          </span>
        </div>
        <div>
          <span className="uppercase tracking-wide">Tiempo:</span>
          <br />
          <span className={`text-op1-text ${
            daysLeft.includes('Atrasado') || daysLeft.includes('HOY')
              ? 'text-op1-accent font-bold'
              : ''
          }`}>
            {daysLeft}
          </span>
        </div>
      </div>

      {(onComplete || onEdit || onDelete) && (
        <div className="flex gap-2 pt-3 border-t border-gray-200">
          {onComplete && request.status !== 'completed' && (
            <button
              onClick={() => onComplete(request.id)}
              className="btn-op1-success text-xs flex-1 flex items-center justify-center gap-1"
              title="Marcar como completado"
            >
              <CheckIcon size={14} />
              Completar
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(request)}
              className="btn-op1 text-xs px-3 flex items-center justify-center"
              title="Editar"
            >
              <EditIcon size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(request.id)}
              className="btn-op1 text-xs px-3 flex items-center justify-center"
              title="Eliminar"
            >
              <DeleteIcon size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
