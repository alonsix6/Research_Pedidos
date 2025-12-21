'use client';

import ScreenDisplay, { LCDNumber, LCDLabel, LCDIcon, LCDDivider } from './ScreenDisplay';

interface StatsDisplayProps {
  total: number;
  active: number;
  completed: number;
  urgent: number;
}

export default function StatsDisplay({ total, active, completed, urgent }: StatsDisplayProps) {
  return (
    <ScreenDisplay>
      <div className="flex flex-col gap-3">
        {/* Fila superior - Iconos de estado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IndicatorBox label="A" active />
            <IndicatorBox label="B" />
            <IndicatorBox label="C" />
            <IndicatorBox label="D" />
          </div>
          <div className="flex items-center gap-3">
            <LCDIcon type="record" active={urgent > 0} />
            <LCDIcon type="play" active={active > 0} />
          </div>
        </div>

        <LCDDivider />

        {/* Stats principales */}
        <div className="grid grid-cols-3 gap-4">
          <StatItem label="TOTAL" value={total} color="cyan" />
          <StatItem label="ACTIVOS" value={active} color="orange" />
          <StatItem label="LISTOS" value={completed} color="green" />
        </div>

        <LCDDivider />

        {/* Fila inferior - Info adicional */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LCDLabel color="orange">URGENTES</LCDLabel>
            <LCDNumber value={urgent.toString().padStart(2, '0')} color="orange" size="sm" />
          </div>
          <div className="flex items-center gap-3">
            <MiniIndicator label="SOUND" />
            <MiniIndicator label="MAIN" active />
            <MiniIndicator label="FX" />
          </div>
          <div className="flex items-center gap-2">
            <LCDLabel>BAR</LCDLabel>
            <LCDNumber value="001" size="sm" />
          </div>
        </div>
      </div>
    </ScreenDisplay>
  );
}

function StatItem({
  label,
  value,
  color
}: {
  label: string;
  value: number;
  color: 'cyan' | 'orange' | 'green';
}) {
  return (
    <div className="flex flex-col items-center">
      <LCDLabel color={color === 'cyan' ? 'white' : color === 'orange' ? 'orange' : 'cyan'}>
        {label}
      </LCDLabel>
      <LCDNumber
        value={value.toString().padStart(2, '0')}
        color={color}
        size="lg"
      />
    </div>
  );
}

function IndicatorBox({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div
      className="w-6 h-6 flex items-center justify-center rounded-sm text-[10px] font-bold"
      style={{
        background: active
          ? 'linear-gradient(180deg, #FF5722 0%, #FF4500 100%)'
          : '#2A2A2A',
        color: active ? 'white' : '#555',
        boxShadow: active
          ? '0 0 8px rgba(255,69,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
          : 'inset 0 1px 2px rgba(0,0,0,0.3)',
      }}
    >
      {label}
    </div>
  );
}

function MiniIndicator({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div
      className="px-2 py-0.5 rounded-sm text-[8px] font-medium uppercase tracking-wide"
      style={{
        background: active ? '#FF4500' : '#2A2A2A',
        color: active ? 'white' : '#555',
        boxShadow: active ? '0 0 6px rgba(255,69,0,0.4)' : 'none',
      }}
    >
      {label}
    </div>
  );
}
