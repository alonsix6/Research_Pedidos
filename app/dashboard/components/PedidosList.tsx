'use client';

import { ReactNode } from 'react';
import { Request } from '@/lib/types';
import PedidoCard from './PedidoCard';

interface PedidosListProps {
  title: string;
  icon: ReactNode;
  requests: Request[];
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  onComplete?: (id: string) => void;
  onEdit?: (request: Request) => void;
  onDelete?: (id: string) => void;
}

export default function PedidosList({
  title,
  icon,
  requests,
  emptyMessage = 'No hay pedidos en esta categoria',
  emptyIcon,
  onComplete,
  onEdit,
  onDelete,
}: PedidosListProps) {
  if (requests.length === 0) {
    return (
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
          {icon}
          <span>{title}</span>
          <span className="text-op1-text-secondary">({requests.length})</span>
        </h2>
        <p className="text-op1-text-secondary text-sm italic flex items-center gap-2">
          {emptyIcon}
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
        {icon}
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
