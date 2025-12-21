'use client';

interface TopBarProps {
  isConnected?: boolean;
}

export default function TopBar({ isConnected = true }: TopBarProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2 border-b"
      style={{
        background: 'linear-gradient(180deg, #D8D8D8 0%, #C0C0C0 100%)',
        borderColor: 'rgba(0,0,0,0.15)',
      }}
    >
      {/* Puertos izquierda */}
      <div className="flex items-center gap-4">
        <PortIndicator label="OUTPUT" />
        <PortIndicator label="INPUT" isActive />
        <PortIndicator label="SYNC" />
        <PortIndicator label="MIDI" />
      </div>

      {/* Puertos derecha */}
      <div className="flex items-center gap-4">
        <PortIndicator label="USB" isActive={isConnected} />
        <div className="flex items-center gap-2">
          <span className="label-industrial">POWER</span>
          <div className={`led ${isConnected ? 'led-green' : 'led-off'}`} />
        </div>
      </div>
    </div>
  );
}

function PortIndicator({ label, isActive = false }: { label: string; isActive?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="px-2 py-0.5 rounded-sm text-center"
        style={{
          background: isActive
            ? 'linear-gradient(180deg, #FF5722 0%, #FF4500 100%)'
            : 'linear-gradient(180deg, #4A4A4A 0%, #3A3A3A 100%)',
          boxShadow: isActive
            ? '0 2px 0 #CC3700, inset 0 1px 0 rgba(255,255,255,0.2)'
            : '0 2px 0 #2A2A2A, inset 0 1px 0 rgba(255,255,255,0.1)',
          color: 'white',
          fontSize: '8px',
          fontWeight: 600,
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </div>
    </div>
  );
}
