'use client';

interface KnobProps {
  label?: string;
  subLabel?: string;
  variant?: 'default' | 'orange';
  size?: 'sm' | 'md';
  value?: number; // 0-100
}

export default function Knob({
  label,
  subLabel,
  variant = 'default',
  size = 'md',
  value = 50,
}: KnobProps) {
  // Calcular rotacion basada en valor (0-100 -> -135deg a 135deg)
  const rotation = -135 + (value / 100) * 270;

  const sizeClass = size === 'sm' ? 'knob-small' : '';
  const variantClass = variant === 'orange' ? 'knob-orange' : '';

  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="label-industrial text-[8px]">{label}</span>
      )}
      <div
        className={`knob ${sizeClass} ${variantClass}`}
        style={{ transform: `rotate(${rotation}deg)` }}
      />
      {subLabel && (
        <span className="label-industrial label-orange text-[8px]">{subLabel}</span>
      )}
    </div>
  );
}

// Slider vertical estilo fader
export function Fader({ value = 50, label }: { value?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {label && <span className="label-industrial text-[8px]">{label}</span>}
      <div
        className="relative w-4 h-24 rounded-full"
        style={{
          background: 'linear-gradient(180deg, #1A1A1A 0%, #0A0A0A 100%)',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {/* Track activo */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-[#333] to-[#444]"
          style={{ height: `${value}%` }}
        />
        {/* Knob del fader */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-6 h-4 rounded-sm"
          style={{
            bottom: `calc(${value}% - 8px)`,
            background: 'linear-gradient(180deg, #E0E0E0 0%, #A0A0A0 100%)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
          }}
        >
          {/* Linea central del fader */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-0.5 bg-[#666] rounded" />
        </div>
      </div>
    </div>
  );
}
