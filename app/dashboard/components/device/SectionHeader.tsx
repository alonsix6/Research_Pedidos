'use client';

import { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  count: number;
  color?: 'red' | 'orange' | 'green' | 'cyan';
  icon?: ReactNode;
}

export default function SectionHeader({ title, count, color = 'cyan', icon }: SectionHeaderProps) {
  const colors = {
    red: { led: '#CE2021', text: '#CE2021' },
    orange: { led: '#FF4500', text: '#FF4500' },
    green: { led: '#1AA167', text: '#1AA167' },
    cyan: { led: '#00D4FF', text: '#00D4FF' },
  };

  return (
    <div className="flex items-center gap-3 mb-3">
      {/* LED */}
      <div
        className="w-2 h-2 rounded-full"
        style={{
          background: colors[color].led,
          boxShadow: `0 0 6px ${colors[color].led}, 0 0 10px ${colors[color].led}50`,
        }}
      />

      {/* Titulo */}
      <span
        className="text-xs font-bold uppercase tracking-wider"
        style={{ color: colors[color].text }}
      >
        {title}
      </span>

      {/* Contador */}
      <span
        className="text-[10px] px-2 py-0.5 rounded-sm"
        style={{
          background: '#2A2A2A',
          color: '#888',
        }}
      >
        {count.toString().padStart(2, '0')}
      </span>

      {/* Linea decorativa */}
      <div
        className="flex-1 h-px"
        style={{
          background: `linear-gradient(90deg, ${colors[color].led}40 0%, transparent 100%)`,
        }}
      />
    </div>
  );
}
