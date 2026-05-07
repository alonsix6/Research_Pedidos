'use client';

import { useMemo } from 'react';
import { Request } from '@/lib/types';
import { statusConfig } from '@/lib/statusMachine';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AnalyticsPanelProps {
  requests: Request[];
  teamMembers: Array<{ id: string; name: string }>;
}

export default function AnalyticsPanel({ requests, teamMembers }: AnalyticsPanelProps) {
  // KPI 1: Distribution by status
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });

    return Object.entries(counts).map(([status, count]) => ({
      name: statusConfig[status as keyof typeof statusConfig]?.label || status,
      value: count,
      color: statusConfig[status as keyof typeof statusConfig]?.color || '#666',
    }));
  }, [requests]);

  // KPI 2: Workload per member
  const memberWorkload = useMemo(() => {
    const activeRequests = requests.filter(
      (r) => r.status !== 'completed' && r.status !== 'cancelled'
    );

    const counts: Record<string, number> = {};
    activeRequests.forEach((r) => {
      if (r.assigned_to) {
        counts[r.assigned_to] = (counts[r.assigned_to] || 0) + 1;
      } else {
        counts['unassigned'] = (counts['unassigned'] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([id, count]) => {
        const member = teamMembers.find((m) => m.id === id);
        return {
          name: member?.name || (id === 'unassigned' ? 'Sin asignar' : 'Usuario'),
          count,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [requests, teamMembers]);

  // KPI 3: Time in each status (average days) - using activity_log would be ideal,
  // but for now we use a simpler approach based on updated_at
  const statusDuration = useMemo(() => {
    const activeRequests = requests.filter(
      (r) => r.status !== 'completed' && r.status !== 'cancelled'
    );

    const durations: Record<string, { total: number; count: number }> = {};

    activeRequests.forEach((r) => {
      const changedAt = r.status_changed_at || r.updated_at || r.created_at;
      const daysInStatus = Math.max(
        0,
        Math.floor((Date.now() - new Date(changedAt).getTime()) / (1000 * 60 * 60 * 24))
      );

      if (!durations[r.status]) {
        durations[r.status] = { total: 0, count: 0 };
      }
      durations[r.status].total += daysInStatus;
      durations[r.status].count += 1;
    });

    return Object.entries(durations).map(([status, { total, count }]) => ({
      name: statusConfig[status as keyof typeof statusConfig]?.label || status,
      avg: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
      color: statusConfig[status as keyof typeof statusConfig]?.color || '#666',
    }));
  }, [requests]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="px-2 py-1 rounded text-[10px]"
        style={{
          background: '#1E1E1E',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#E5E5E5',
        }}
      >
        <p>{`${payload[0].name || label}: ${payload[0].value}`}</p>
      </div>
    );
  };

  return (
    <motion.div className="lcd-screen p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h3 className="text-[10px] uppercase tracking-wider text-[#666] mb-4 font-bold">Analytics</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Distribution */}
        <div>
          <h4 className="text-[9px] uppercase tracking-wider text-[#999] mb-2">
            Distribución por Estado
          </h4>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-1 justify-center">
            {statusDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                <span className="text-[8px] text-[#999]">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Member Workload */}
        <div>
          <h4 className="text-[9px] uppercase tracking-wider text-[#999] mb-2">
            Carga por Miembro
          </h4>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberWorkload} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={70}
                  tick={{ fontSize: 9, fill: '#999' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#FF4500" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time in Status */}
        <div>
          <h4 className="text-[9px] uppercase tracking-wider text-[#999] mb-2">
            Días Promedio en Estado
          </h4>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDuration} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 9, fill: '#999' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={16}>
                  {statusDuration.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
