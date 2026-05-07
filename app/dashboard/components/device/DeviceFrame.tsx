'use client';

import { ReactNode } from 'react';

interface DeviceFrameProps {
  children: ReactNode;
}

export default function DeviceFrame({ children }: DeviceFrameProps) {
  return (
    <div className="min-h-screen flex items-start justify-center p-4 md:p-8">
      <div
        className="w-full max-w-4xl metallic-surface rounded-lg overflow-hidden"
        style={{
          boxShadow: `
            0 25px 80px rgba(0,0,0,0.5),
            0 10px 30px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.4),
            inset 0 -1px 0 rgba(0,0,0,0.2)
          `,
        }}
      >
        {/* Borde superior decorativo */}
        <div
          className="h-1"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
          }}
        />

        {children}

        {/* Borde inferior decorativo */}
        <div
          className="h-1"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
          }}
        />
      </div>
    </div>
  );
}
