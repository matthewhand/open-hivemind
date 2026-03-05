export interface AnimationVariants {
  initial?: Record<string, unknown>;
  animate?: Record<string, unknown>;
  exit?: Record<string, unknown>;
  hover?: Record<string, unknown>;
  tap?: Record<string, unknown>;
  drag?: Record<string, unknown>;
}

export interface AnimationConfig {
  duration?: number;
  delay?: number;
  ease?: string | number[];
  type?: 'spring' | 'tween' | 'keyframes' | 'inertia';
  stiffness?: number;
  damping?: number;
  mass?: number;
}

export const defaultTransition: AnimationConfig = {
  duration: 0.3,
  ease: 'easeInOut',
  type: 'spring',
  stiffness: 100,
  damping: 10,
};

export const fadeInVariants: AnimationVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const slideInVariants: AnimationVariants = {
  initial: { x: -100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 100, opacity: 0 },
};

export const scaleVariants: AnimationVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

export const bounceVariants: AnimationVariants = {
  initial: { y: -50, opacity: 0 },
  animate: { 
    y: 0, 
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  exit: { y: 50, opacity: 0 },
};

export const staggerContainerVariants: AnimationVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const staggerItemVariants: AnimationVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const pulseVariants: AnimationVariants = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: 'reverse' as const,
    },
  },
};

export const shakeVariants: AnimationVariants = {
  animate: {
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
};

export const glowVariants: AnimationVariants = {
  initial: { boxShadow: '0 0 0 rgba(59, 130, 246, 0)' },
  animate: { 
    boxShadow: [
      '0 0 0 rgba(59, 130, 246, 0)',
      '0 0 20px rgba(59, 130, 246, 0.5)',
      '0 0 0 rgba(59, 130, 246, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: 'loop' as const,
    },
  },
};

export const flipVariants: AnimationVariants = {
  initial: { rotateY: 0 },
  animate: { rotateY: 180 },
  exit: { rotateY: 0 },
};

export const morphingButtonVariants: AnimationVariants = {
  initial: { borderRadius: '50px' },
  animate: { 
    borderRadius: ['50px', '20px', '50px'],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: 'reverse' as const,
    },
  },
};