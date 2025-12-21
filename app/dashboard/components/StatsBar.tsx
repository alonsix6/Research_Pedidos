'use client';

interface StatsBarProps {
  total: number;
  active: number;
  completed: number;
}

export default function StatsBar({ total, active, completed }: StatsBarProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="card-op1 text-center">
        <div className="text-xs text-op1-text-secondary uppercase tracking-wide mb-1">
          Total
        </div>
        <div className="text-2xl font-bold">{total}</div>
      </div>

      <div className="card-op1 text-center">
        <div className="text-xs text-op1-text-secondary uppercase tracking-wide mb-1">
          Activos
        </div>
        <div className="text-2xl font-bold text-op1-accent">{active}</div>
      </div>

      <div className="card-op1 text-center">
        <div className="text-xs text-op1-text-secondary uppercase tracking-wide mb-1">
          Completados
        </div>
        <div className="text-2xl font-bold text-op1-success">{completed}</div>
      </div>
    </div>
  );
}
