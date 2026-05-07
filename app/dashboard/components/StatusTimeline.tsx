'use client';

import { useEffect, useState } from 'react';
import { ActivityLog } from '@/lib/types';
import { getActivityLog, getActivityDescription, ActivityDetails } from '@/lib/activityLog';
import { getStatusConfig } from '@/lib/statusMachine';
import { formatLimaDateTime } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LucideIcon,
  Clock,
  Play,
  Eye,
  Pause,
  RotateCcw,
  Check,
  X,
  Edit3,
  MessageSquare,
  UserPlus,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

const actionIcons: Record<string, LucideIcon> = {
  created: Clock,
  status_changed: Play,
  assigned: UserPlus,
  deadline_changed: Calendar,
  edited: Edit3,
  commented: MessageSquare,
  completed: Check,
  cancelled: X,
  reopened: RotateCcw,
  blocked: Pause,
  unblocked: Play,
};

const actionColors: Record<string, string> = {
  created: '#9E9E9E',
  status_changed: '#2196F3',
  assigned: '#00BCD4',
  deadline_changed: '#FF9800',
  edited: '#9E9E9E',
  commented: '#00E5FF',
  completed: '#00C853',
  cancelled: '#616161',
  reopened: '#FF9800',
  blocked: '#E53935',
  unblocked: '#00C853',
};

interface StatusTimelineProps {
  requestId: string;
  teamMembers?: Array<{ id: string; name: string }>;
}

export default function StatusTimeline({ requestId, teamMembers = [] }: StatusTimelineProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getActivityLog(requestId);
      setActivities(data);
      setLoading(false);
    }
    load();
  }, [requestId]);

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Sistema';
    const member = teamMembers.find((m) => m.id === userId);
    return member?.name || 'Usuario';
  };

  if (loading) {
    return (
      <div className="space-y-3 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-6 h-6 rounded-full bg-[#333]" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-[#333] rounded w-3/4" />
              <div className="h-2 bg-[#2A2A2A] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-4">
        <Clock size={16} className="mx-auto mb-2 text-[#666]" />
        <p className="text-[10px] text-[#666]">Sin historial de actividad</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div
        className="absolute left-3 top-3 bottom-3 w-px"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      />

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {activities.map((activity, index) => {
            const Icon = actionIcons[activity.action] || Clock;
            const color = actionColors[activity.action] || '#666';
            const details = (activity.details || {}) as ActivityDetails;

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-3 relative"
              >
                {/* Icon node */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                  style={{
                    background: `${color}20`,
                    border: `1px solid ${color}40`,
                  }}
                >
                  <Icon size={10} style={{ color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <p className="text-[11px] text-[#D0D0D0] leading-tight">
                    {getActivityDescription(activity.action as any, details)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-[#666]">{getUserName(activity.user_id)}</span>
                    <span className="text-[9px] text-[#555]">
                      {formatLimaDateTime(activity.created_at)}
                    </span>
                  </div>
                  {/* Show blocked reason if available */}
                  {details.blocked_reason && (
                    <div
                      className="mt-1 px-2 py-1 rounded text-[9px]"
                      style={{ background: 'rgba(229,57,53,0.1)', color: '#E53935' }}
                    >
                      {details.blocked_reason}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
