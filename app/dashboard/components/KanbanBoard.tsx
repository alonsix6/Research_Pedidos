'use client';

import { useMemo } from 'react';
import { Request, RequestStatus } from '@/lib/types';
import { kanbanStatuses, getStatusConfig } from '@/lib/statusMachine';
import { formatDaysLeft } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface KanbanBoardProps {
  requests: Request[];
  onOpenDetail?: (request: Request) => void;
  onEdit?: (request: Request) => void;
  teamMembers?: Array<{ id: string; name: string }>;
  compact?: boolean;
}

// Nota: el cambio de estado desde el Kanban (drag entre columnas) es feature
// pendiente. La prop `onStatusChange` y los imports asociados se quitaron por
// ahora; el card abre el detail panel y el cambio de estado se hace allí.

export default function KanbanBoard({
  requests,
  onOpenDetail,
  onEdit,
  teamMembers = [],
  compact = false,
}: KanbanBoardProps) {
  // Group requests by status
  const columns = useMemo(() => {
    const groups: Record<string, Request[]> = {};
    kanbanStatuses.forEach((status) => {
      groups[status] = [];
    });
    // Also include completed for visibility
    groups['completed'] = [];

    requests.forEach((req) => {
      if (groups[req.status]) {
        groups[req.status].push(req);
      }
    });

    return groups;
  }, [requests]);

  const displayStatuses: RequestStatus[] = [...kanbanStatuses, 'completed'];

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4">
      <div className="flex gap-3" style={{ minWidth: `${displayStatuses.length * 220}px` }}>
        {displayStatuses.map((status) => {
          const config = getStatusConfig(status);
          const items = columns[status] || [];

          return (
            <div
              key={status}
              className="flex-1 min-w-[200px] rounded-md overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {/* Column header */}
              <div
                className="px-3 py-2 flex items-center justify-between"
                style={{
                  background: `${config.color}10`,
                  borderBottom: `2px solid ${config.color}40`,
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: config.color }} />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: config.textColor }}
                  >
                    {config.label}
                  </span>
                </div>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    background: `${config.color}15`,
                    color: config.textColor,
                  }}
                >
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[100px]">
                <AnimatePresence>
                  {items.map((request) => (
                    <KanbanCard
                      key={request.id}
                      request={request}
                      onOpenDetail={onOpenDetail}
                      onEdit={onEdit}
                      teamMembers={teamMembers}
                      compact={compact}
                    />
                  ))}
                </AnimatePresence>

                {items.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-[9px] text-[#555] uppercase tracking-wider">Sin pedidos</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({
  request,
  onOpenDetail,
  onEdit,
  teamMembers = [],
  compact = false,
}: {
  request: Request;
  onOpenDetail?: (request: Request) => void;
  onEdit?: (request: Request) => void;
  teamMembers?: Array<{ id: string; name: string }>;
  compact?: boolean;
}) {
  const daysLeft = formatDaysLeft(request.deadline);
  const isUrgent = daysLeft.includes('Atrasado') || daysLeft.includes('HOY');
  const assignedName = teamMembers.find((m) => m.id === request.assigned_to)?.name;

  const priorityColor =
    {
      urgent: '#E53935',
      high: '#FFD600',
      normal: '#00C853',
      low: '#666666',
    }[request.priority] || '#666666';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="rounded-sm p-2.5 cursor-pointer hover:brightness-110 transition-all"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onClick={() => onOpenDetail?.(request)}
      whileHover={{ y: -1 }}
    >
      {/* Priority indicator + Client */}
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: priorityColor }}
        />
        <h4 className="text-[10px] font-bold uppercase tracking-wide text-[#E5E5E5] truncate">
          {request.client}
        </h4>
      </div>

      {/* Description */}
      {!compact && (
        <p className="text-[9px] text-[#999] mb-2 line-clamp-2 leading-relaxed">
          {request.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-medium" style={{ color: isUrgent ? '#E53935' : '#666' }}>
          {daysLeft}
        </span>
        {assignedName && (
          <span className="text-[8px] text-[#666] truncate max-w-[60px]">{assignedName}</span>
        )}
      </div>

      {/* Blocked reason */}
      {request.status === 'blocked' && request.blocked_reason && (
        <div
          className="mt-1.5 px-1.5 py-0.5 rounded text-[8px] truncate"
          style={{ background: 'rgba(229,57,53,0.1)', color: '#EF5350' }}
        >
          {request.blocked_reason}
        </div>
      )}
    </motion.div>
  );
}
