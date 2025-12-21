'use client';

import { ReactNode, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { buttonVariants, springs } from '@/lib/animations';

interface Button3DProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'black' | 'orange' | 'white' | 'grey' | 'green';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  enableSound?: boolean;
  onSoundPlay?: () => void;
}

const Button3D = forwardRef<HTMLButtonElement, Button3DProps>(function Button3D(
  {
    variant = 'black',
    size = 'md',
    children,
    className = '',
    enableSound = false,
    onSoundPlay,
    onClick,
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: 'px-2 py-1.5 text-[9px]',
    md: 'px-4 py-2 text-[11px]',
    lg: 'px-6 py-3 text-xs',
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (enableSound && onSoundPlay) {
      onSoundPlay();
    }
    onClick?.(e);
  };

  return (
    <motion.button
      ref={ref}
      className={`btn-3d btn-3d-${variant} ${sizeClasses[size]} ${className}`}
      variants={buttonVariants}
      initial="idle"
      whileHover="hover"
      whileTap="tap"
      transition={springs.snappy}
      onClick={handleClick}
      {...props}
    >
      {children}
    </motion.button>
  );
});

export default Button3D;

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
} & Omit<HTMLMotionProps<'button'>, 'children'>) {
  return (
    <motion.button
      className={`
        w-10 h-10 flex items-center justify-center
        text-[10px] font-bold uppercase
        rounded-sm
        ${variant === 'black'
          ? `bg-gradient-to-b from-[#3A3A3A] to-[#2A2A2A] text-white
             shadow-[0_3px_0_#1A1A1A,0_4px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]
             hover:from-[#444] hover:to-[#333]`
          : `bg-gradient-to-b from-white to-[#F0F0F0] text-[#1A1A1A]
             shadow-[0_3px_0_#CCC,0_4px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.8)]
             hover:from-white hover:to-[#F8F8F8]`
        }
        ${active ? 'ring-2 ring-[#FF4500] ring-offset-1 ring-offset-[#C8C8C8]' : ''}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95, y: 2 }}
      transition={springs.snappy}
      {...props}
    >
      {children}
    </motion.button>
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
} & Omit<HTMLMotionProps<'button'>, 'children'>) {
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        className={`led led-${ledColor}`}
        animate={ledColor !== 'off' ? { opacity: [0.7, 1, 0.7] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.button
        className="btn-3d btn-3d-black px-3 py-1.5 text-[9px]"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95, y: 2 }}
        transition={springs.snappy}
        {...props}
      >
        {children}
      </motion.button>
    </div>
  );
}
