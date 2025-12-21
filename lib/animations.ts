import { Variants, Transition } from 'framer-motion';

// Spring configurations for different use cases
export const springs = {
  // Bouncy spring for buttons and interactive elements
  bouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  } as Transition,

  // Gentle spring for modals and overlays
  gentle: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  } as Transition,

  // Snappy spring for quick interactions
  snappy: {
    type: 'spring',
    stiffness: 500,
    damping: 30,
  } as Transition,

  // Smooth for subtle transitions
  smooth: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
  } as Transition,
};

// Button press animation
export const buttonVariants: Variants = {
  idle: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.02,
    transition: springs.snappy,
  },
  tap: {
    scale: 0.95,
    y: 3,
    transition: { duration: 0.05 },
  },
};

// Pad/Card animations
export const padVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springs.gentle,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
  hover: {
    y: -2,
    transition: springs.snappy,
  },
  tap: {
    scale: 0.98,
    y: 2,
    transition: { duration: 0.05 },
  },
};

// Modal animations
export const modalOverlayVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

export const modalContentVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springs.gentle,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15 },
  },
};

// Stagger container for lists
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

// Stagger item
export const staggerItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 15,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: springs.smooth,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.15 },
  },
};

// Stats counter animation
export const statsVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: springs.bouncy,
  },
};

// LED pulse animation
export const ledPulseVariants: Variants = {
  initial: {
    opacity: 0.6,
  },
  animate: {
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Knob rotation for loading
export const knobLoadingVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Slide in from side (for toasts/notifications)
export const slideInVariants: Variants = {
  initial: {
    x: 100,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: springs.gentle,
  },
  exit: {
    x: 100,
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// Fade variants
export const fadeVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// Skeleton shimmer
export const shimmerVariants: Variants = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Success checkmark animation
export const checkmarkVariants: Variants = {
  initial: {
    pathLength: 0,
    opacity: 0,
  },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.3, ease: 'easeOut' },
      opacity: { duration: 0.1 },
    },
  },
};

// Drag and drop
export const draggableVariants: Variants = {
  idle: {
    scale: 1,
    boxShadow: '0 4px 0 #141414, 0 6px 20px rgba(0,0,0,0.4)',
  },
  dragging: {
    scale: 1.03,
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    zIndex: 50,
    transition: springs.snappy,
  },
};

// Section header line animation
export const lineExpandVariants: Variants = {
  initial: {
    scaleX: 0,
    originX: 0,
  },
  animate: {
    scaleX: 1,
    transition: { duration: 0.5, ease: 'easeOut', delay: 0.2 },
  },
};
