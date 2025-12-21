'use client';

import { ListIcon, AlertIcon, StatusCompleted } from './Icons';

interface StatsBarProps {
  total: number;
  active: number;
  completed: number;
}

export default function StatsBar({ total, active, completed }: StatsBarProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="card-op1 text-center">
        <div className="flex items-center justify-center gap-1 text-xs text-op1-text-secondary uppercase tracking-wide mb-1">
          <ListIcon size={12} />
          Total
        </div>
        <div className="text-2xl font-bold">{total}</div>
      </div>

      <div className="card-op1 text-center">
        <div className="flex items-center justify-center gap-1 text-xs text-op1-text-secondary uppercase tracking-wide mb-1">
          <AlertIcon size={12} />
          Activos
        </div>
        <div className="text-2xl font-bold text-op1-accent">{active}</div>
      </div>

      <div className="card-op1 text-center">
        <div className="flex items-center justify-center gap-1 text-xs text-op1-text-secondary uppercase tracking-wide mb-1">
          <StatusCompleted size={12} />
          Completados
        </div>
        <div className="text-2xl font-bold text-op1-success">{completed}</div>
      </div>
    </div>
  );
}
