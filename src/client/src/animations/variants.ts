/**
 * Reusable Framer Motion animation variants
 * Centralized presets for consistent animations across the app
 */

import type { Variants } from 'framer-motion';

// Fade animations
export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Slide animations
export const slideInVariants: {
  left: Variants;
  right: Variants;
  up: Variants;
  down: Variants;
} = {
  left: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  right: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  up: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  down: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
};

// Scale animations
export const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// Bounce animation
export const bounceVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', bounce: 0.5 },
  },
  exit: { opacity: 0, y: 20 },
};

// Stagger container for list animations
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// Stagger item (use inside stagger container)
export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

// Pulse animation (for loading/hint states)
export const pulseVariants: Variants = {
  initial: { opacity: 1 },
  animate: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  exit: { opacity: 1 },
};

// Shake animation (for errors)
export const shakeVariants: Variants = {
  initial: { x: 0 },
  animate: {
    x: [0, -5, 5, -5, 5, 0],
    transition: { duration: 0.4 },
  },
  exit: { x: 0 },
};

// Glow animation (for highlights)
export const glowVariants: Variants = {
  initial: { boxShadow: '0 0 0px rgba(var(--p), 0)' },
  animate: {
    boxShadow: '0 0 20px rgba(var(--p), 0.5)',
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatType: 'reverse',
    },
  },
  exit: { boxShadow: '0 0 0px rgba(var(--p), 0)' },
};

// Spring config presets
export const springConfigs = {
  gentle: { type: 'spring', stiffness: 120, damping: 14 } as const,
  snappy: { type: 'spring', stiffness: 400, damping: 30 } as const,
  bouncy: { type: 'spring', stiffness: 300, damping: 10, bounce: 0.5 } as const,
  stiff: { type: 'spring', stiffness: 500, damping: 30 } as const,
};

// Duration presets (in seconds)
export const durations = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
} as const;

// Combined animation preset for common use cases
export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
};
