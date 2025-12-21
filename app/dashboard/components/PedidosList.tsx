'use client';

import { Request } from '@/lib/types';
import PedidoCard from './PedidoCard';

interface PedidosListProps {
  title: string;
  emoji: string;
  requests: Request[];
  emptyMessage?: string;
  onComplete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function PedidosList({
  title,
  emoji,
  requests,
  emptyMessage = 'No hay pedidos en esta categoría',
  onComplete,
  onEdit,
  onDelete,
}: PedidosListProps) {
  if (requests.length === 0) {
    return (
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
          <span>{emoji}</span>
          <span>{title}</span>
          <span className="text-op1-text-secondary">({requests.length})</span>
        </h2>
        <p className="text-op1-text-secondary text-sm italic">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
        <span>{emoji}</span>
        <span>{title}</span>
        <span className="text-op1-text-secondary">({requests.length})</span>
      </h2>
      <div>
        {requests.map((request) => (
          <PedidoCard
            key={request.id}
            request={request}
            onComplete={onComplete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
