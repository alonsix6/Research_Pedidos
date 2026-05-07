'use client';

import { ReactNode } from 'react';

interface ScreenDisplayProps {
  children: ReactNode;
}

export default function ScreenDisplay({ children }: ScreenDisplayProps) {
  return (
    <div className="lcd-screen lcd-scanlines p-4">
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Sub-componentes para el display
export function LCDNumber({
  value,
  color = 'cyan',
  size = 'md',
  showBackground = true,
}: {
  value: string | number;
  color?: 'cyan' | 'orange' | 'green';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBackground?: boolean;
}) {
  const colorClass = {
    cyan: 'lcd-number',
    orange: 'lcd-number lcd-number-orange',
    green: 'lcd-number lcd-number-green',
  }[color];

  const sizeClass = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl',
  }[size];

  // Crear el fondo de 8s para efecto LCD
  const bgValue = String(value)
    .replace(/[0-9]/g, '8')
    .replace(/[^0-9.:]/g, '');

  return (
    <div className="relative inline-block">
      {showBackground && (
        <span className={`${colorClass} ${sizeClass} lcd-number-dim absolute`}>{bgValue}</span>
      )}
      <span className={`${colorClass} ${sizeClass} relative`}>{value}</span>
    </div>
  );
}

export function LCDLabel({
  children,
  color = 'white',
}: {
  children: ReactNode;
  color?: 'white' | 'orange' | 'cyan';
}) {
  const colorStyle = {
    white: '#E5E5E5',
    orange: '#FF4500',
    cyan: '#00D4FF',
  }[color];

  return (
    <span className="text-xs uppercase tracking-wider font-medium" style={{ color: colorStyle }}>
      {children}
    </span>
  );
}

export function LCDIcon({
  type,
  active = true,
}: {
  type: 'record' | 'play' | 'pause' | 'stop';
  active?: boolean;
}) {
  const icons = {
    record: (
      <div
        className={`w-3 h-3 rounded-full ${active ? 'bg-[#CE2021]' : 'bg-[#333]'}`}
        style={active ? { boxShadow: '0 0 8px #CE2021' } : {}}
      />
    ),
    play: (
      <div
        className="w-0 h-0 border-l-[8px] border-y-[5px] border-y-transparent"
        style={{ borderLeftColor: active ? '#1AA167' : '#333' }}
      />
    ),
    pause: (
      <div className="flex gap-0.5">
        <div className={`w-1 h-3 ${active ? 'bg-[#FFC003]' : 'bg-[#333]'}`} />
        <div className={`w-1 h-3 ${active ? 'bg-[#FFC003]' : 'bg-[#333]'}`} />
      </div>
    ),
    stop: <div className={`w-3 h-3 ${active ? 'bg-[#CE2021]' : 'bg-[#333]'}`} />,
  };

  return icons[type];
}

export function LCDDivider() {
  return (
    <div
      className="w-full h-px my-2"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, #333 20%, #333 80%, transparent 100%)',
      }}
    />
  );
}
