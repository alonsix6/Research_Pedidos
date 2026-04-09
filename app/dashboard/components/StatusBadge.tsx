'use client';

import { RequestStatus } from '@/lib/types';
import { getStatusConfig } from '@/lib/statusMachine';
import { motion } from 'framer-motion';
import { LucideIcon, Clock, Play, Eye, Pause, RotateCcw, Check, X } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Clock,
  Play,
  Eye,
  Pause,
  RotateCcw,
  Check,
  X,
};

interface StatusBadgeProps {
  status: RequestStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function StatusBadge({ status, size = 'md', showLabel = true }: StatusBadgeProps) {
  const config = getStatusConfig(status);
  const Icon = iconMap[config.icon] || Clock;

  const sizes = {
    sm: { badge: 'px-1.5 py-0.5 gap-1', text: 'text-[8px]', icon: 8, dot: 'w-1.5 h-1.5' },
    md: { badge: 'px-2 py-1 gap-1.5', text: 'text-[10px]', icon: 10, dot: 'w-2 h-2' },
    lg: { badge: 'px-3 py-1.5 gap-2', text: 'text-xs', icon: 12, dot: 'w-2.5 h-2.5' },
  };

  const s = sizes[size];

  return (
    <div
      className={`inline-flex items-center ${s.badge} rounded-sm`}
      style={{ background: config.bgColor }}
    >
      {/* Status LED dot */}
      <motion.div
        className={`${s.dot} rounded-full flex-shrink-0`}
        style={{
          background: config.color,
          boxShadow: `0 0 4px ${config.color}80`,
        }}
        animate={
          config.animate
            ? { opacity: [0.6, 1, 0.6], scale: [1, 1.1, 1] }
            : {}
        }
        transition={
          config.animate
            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            : {}
        }
      />

      {showLabel && (
        <span
          className={`${s.text} font-medium uppercase tracking-wider`}
          style={{ color: config.textColor }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}

/**
 * Compact LED-only indicator for use in cards.
 */
export function StatusLED({ status }: { status: RequestStatus }) {
  const config = getStatusConfig(status);

  return (
    <motion.div
      className="w-2 h-2 rounded-full"
      style={{
        background: config.color,
        boxShadow: `0 0 6px ${config.color}, 0 0 10px ${config.color}50`,
      }}
      animate={
        config.animate
          ? { opacity: [0.7, 1, 0.7], scale: [1, 1.1, 1] }
          : {}
      }
      transition={
        config.animate
          ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          : {}
      }
      role="status"
      aria-label={`Estado: ${config.label}`}
    />
  );
}
