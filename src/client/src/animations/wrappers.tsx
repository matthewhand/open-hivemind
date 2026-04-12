/**
 * Reusable animation wrapper components using Framer Motion
 * Drop-in wrappers for common animation patterns
 */

import React from 'react';
import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion';
import {
  fadeInVariants,
  slideInVariants,
  scaleVariants,
  bounceVariants,
  staggerContainerVariants,
  staggerItemVariants,
  shakeVariants,
  pulseVariants,
  pageTransitionVariants,
  modalVariants,
  durations,
  springConfigs,
} from './variants';

// Base props for animation wrappers
interface AnimationWrapperProps {
  children: React.ReactNode;
  className?: string;
  duration?: keyof typeof durations | number;
  delay?: number;
}

// AnimatedBox - Simple fade-in wrapper
export function AnimatedBox({
  children,
  className = '',
  duration = 'normal',
  delay = 0,
}: AnimationWrapperProps) {
  const dur = typeof duration === 'number' ? duration : durations[duration];
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeInVariants}
      transition={{ duration: dur, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// AnimatedContainer - Configurable animation direction
interface AnimatedContainerProps extends AnimationWrapperProps {
  direction?: 'left' | 'right' | 'up' | 'down';
}

export function AnimatedContainer({
  children,
  className = '',
  direction = 'up',
  duration = 'normal',
  delay = 0,
}: AnimatedContainerProps) {
  const dur = typeof duration === 'number' ? duration : durations[duration];
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={slideInVariants[direction]}
      transition={{ duration: dur, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// LoadingAnimation - Pulsing placeholder for loading states
export function LoadingAnimation({
  children,
  className = '',
}: AnimationWrapperProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pulseVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ErrorShakeAnimation - Shake effect for error feedback
export function ErrorShakeAnimation({
  children,
  className = '',
}: AnimationWrapperProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={shakeVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// SuccessBounceAnimation - Bounce effect for success feedback
export function SuccessBounceAnimation({
  children,
  className = '',
}: AnimationWrapperProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={bounceVariants}
      transition={springConfigs.bouncy}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// PageTransition - Wrapper for page transitions
export function PageTransition({
  children,
  className = '',
}: AnimationWrapperProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransitionVariants}
      transition={{ duration: durations.normal }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ModalTransition - Wrapper for modal dialogs
export function ModalTransition({
  children,
  className = '',
}: AnimationWrapperProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={modalVariants}
      transition={springConfigs.gentle}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// HoverScaleAnimation - Scale on hover
interface HoverScaleAnimationProps extends AnimationWrapperProps {
  scale?: number;
}

export function HoverScaleAnimation({
  children,
  className = '',
  scale = 1.02,
}: HoverScaleAnimationProps) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={springConfigs.snappy}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// StaggerContainer - Container for staggered list animations
export function StaggerContainer({
  children,
  className = '',
}: AnimationWrapperProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={staggerContainerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// StaggerItem - Item for use inside StaggerContainer
export function StaggerItem({
  children,
  className = '',
}: AnimationWrapperProps) {
  return (
    <motion.div
      variants={staggerItemVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// AnimatedPresence wrapper for conditional rendering
export { AnimatePresence };

// Export motion for custom animations
export { motion };

// Type re-export for consumers
export type { HTMLMotionProps };
