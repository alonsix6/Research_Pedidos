'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';

interface Button3DProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'black' | 'orange' | 'white' | 'grey' | 'green';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export default function Button3D({
  variant = 'black',
  size = 'md',
  children,
  className = '',
  ...props
}: Button3DProps) {
  const sizeClasses = {
    sm: 'px-2 py-1.5 text-[9px]',
    md: 'px-4 py-2 text-[11px]',
    lg: 'px-6 py-3 text-xs',
  };

  return (
    <button
      className={`btn-3d btn-3d-${variant} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Boton cuadrado pequeno para grid
export function SquareButton({
  children,
  variant = 'black',
  active = false,
  ...props
}: {
  children: ReactNode;
  variant?: 'black' | 'white';
  active?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`
        w-10 h-10 flex items-center justify-center
        text-[10px] font-bold uppercase
        rounded-sm transition-all duration-50
        ${variant === 'black'
          ? `bg-gradient-to-b from-[#3A3A3A] to-[#2A2A2A] text-white
             shadow-[0_3px_0_#1A1A1A,0_4px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]
             hover:from-[#444] hover:to-[#333]
             active:translate-y-[2px] active:shadow-[0_1px_0_#1A1A1A,inset_0_2px_4px_rgba(0,0,0,0.3)]`
          : `bg-gradient-to-b from-white to-[#F0F0F0] text-[#1A1A1A]
             shadow-[0_3px_0_#CCC,0_4px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.8)]
             hover:from-white hover:to-[#F8F8F8]
             active:translate-y-[2px] active:shadow-[0_1px_0_#CCC,inset_0_2px_4px_rgba(0,0,0,0.1)]`
        }
        ${active ? 'ring-2 ring-[#FF4500] ring-offset-1 ring-offset-[#C8C8C8]' : ''}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

// Boton con LED indicador
export function ButtonWithLED({
  children,
  ledColor = 'off',
  ...props
}: {
  children: ReactNode;
  ledColor?: 'off' | 'red' | 'green' | 'orange';
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`led led-${ledColor}`} />
      <button
        className="btn-3d btn-3d-black px-3 py-1.5 text-[9px]"
        {...props}
      >
        {children}
      </button>
    </div>
  );
}
