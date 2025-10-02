import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, BoxProps } from '@mui/material';

export interface AnimationVariants {
  initial?: any;
  animate?: any;
  exit?: any;
  hover?: any;
  tap?: any;
  drag?: any;
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
    }
  },
  exit: { y: 50, opacity: 0 },
};

export const staggerContainerVariants: AnimationVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    }
  }
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
    }
  }
};

export const shakeVariants: AnimationVariants = {
  animate: {
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    }
  }
};

export const glowVariants: AnimationVariants = {
  initial: { boxShadow: '0 0 0 rgba(59, 130, 246, 0)' },
  animate: { 
    boxShadow: [
      '0 0 0 rgba(59, 130, 246, 0)',
      '0 0 20px rgba(59, 130, 246, 0.5)',
      '0 0 0 rgba(59, 130, 246, 0)'
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: 'loop' as const,
    }
  }
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
    }
  }
};

interface AnimatedBoxProps extends BoxProps {
  animation?: AnimationVariants;
  config?: AnimationConfig;
  isVisible?: boolean;
  onAnimationComplete?: () => void;
  onAnimationStart?: () => void;
}

export const AnimatedBox: React.FC<AnimatedBoxProps> = ({
  animation = fadeInVariants,
  config = defaultTransition,
  isVisible = true,
  onAnimationComplete,
  onAnimationStart,
  children,
  ...props
}) => {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <Box
          component={motion.div}
          initial={animation.initial}
          animate={animation.animate}
          exit={animation.exit}
          whileHover={animation.hover}
          whileTap={animation.tap}
          whileDrag={animation.drag}
          transition={config}
          onAnimationComplete={onAnimationComplete}
          onAnimationStart={onAnimationStart}
          {...props}
        >
          {children}
        </Box>
      )}
    </AnimatePresence>
  );
};

interface AnimatedContainerProps extends BoxProps {
  children: React.ReactNode;
  containerVariants?: AnimationVariants;
  itemVariants?: AnimationVariants;
  config?: AnimationConfig;
}

export const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  children,
  containerVariants = staggerContainerVariants,
  itemVariants = staggerItemVariants,
  config = defaultTransition,
  ...props
}) => {
  return (
    <Box
      component={motion.div}
      variants={containerVariants}
      initial="initial"
      animate="animate"
      {...props}
    >
      {React.Children.map(children, (child, index) => (
        <Box
          key={index}
          component={motion.div}
          variants={itemVariants}
        >
          {child}
        </Box>
      ))}
    </Box>
  );
};

interface LoadingAnimationProps extends BoxProps {
  size?: number;
  color?: string;
  duration?: number;
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  size = 40,
  color = '#3b82f6',
  duration = 1.5,
  ...props
}) => {
  return (
    <Box
      component={motion.div}
      animate={{ rotate: 360 }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'linear',
      }}
      sx={{
        width: size,
        height: size,
        border: `${size * 0.1}px solid ${color}20`,
        borderTop: `${size * 0.1}px solid ${color}`,
        borderRadius: '50%',
        ...props.sx,
      }}
      {...props}
    />
  );
};

interface ErrorShakeAnimationProps extends BoxProps {
  isError?: boolean;
  children: React.ReactNode;
}

export const ErrorShakeAnimation: React.FC<ErrorShakeAnimationProps> = ({
  isError = false,
  children,
  ...props
}) => {
  return (
    <Box
      component={motion.div}
      animate={isError ? shakeVariants.animate : {}}
      {...props}
    >
      {children}
    </Box>
  );
};

interface SuccessBounceAnimationProps extends BoxProps {
  isSuccess?: boolean;
  children: React.ReactNode;
}

export const SuccessBounceAnimation: React.FC<SuccessBounceAnimationProps> = ({
  isSuccess = false,
  children,
  ...props
}) => {
  return (
    <Box
      component={motion.div}
      initial={{ scale: 0 }}
      animate={isSuccess ? { scale: 1 } : { scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 15,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

interface PageTransitionProps extends BoxProps {
  children: React.ReactNode;
  key: string;
  direction?: 'x' | 'y';
  duration?: number;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  key,
  direction = 'x',
  duration = 0.3,
  ...props
}) => {
  return (
    <AnimatePresence mode="wait">
      <Box
        key={key}
        component={motion.div}
        initial={{ opacity: 0, [direction]: direction === 'x' ? 100 : 50 }}
        animate={{ opacity: 1, [direction]: 0 }}
        exit={{ opacity: 0, [direction]: direction === 'x' ? -100 : -50 }}
        transition={{
          duration,
          ease: 'easeInOut',
        }}
        {...props}
      >
        {children}
      </Box>
    </AnimatePresence>
  );
};

interface HoverScaleAnimationProps extends BoxProps {
  children: React.ReactNode;
  scale?: number;
  whileHoverScale?: number;
  duration?: number;
}

export const HoverScaleAnimation: React.FC<HoverScaleAnimationProps> = ({
  children,
  scale = 1,
  whileHoverScale = 1.05,
  duration = 0.2,
  ...props
}) => {
  return (
    <Box
      component={motion.div}
      initial={{ scale }}
      whileHover={{ scale: whileHoverScale }}
      transition={{ duration, ease: 'easeInOut' }}
      {...props}
    >
      {children}
    </Box>
  );
};

interface ParallaxScrollProps extends BoxProps {
  children: React.ReactNode;
  offset?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const ParallaxScroll: React.FC<ParallaxScrollProps> = ({
  children,
  offset = 50,
  direction = 'up',
  ...props
}) => {
  const getTransform = () => {
    switch (direction) {
      case 'up': return { y: [offset, -offset] };
      case 'down': return { y: [-offset, offset] };
      case 'left': return { x: [offset, -offset] };
      case 'right': return { x: [-offset, offset] };
      default: return { y: [offset, -offset] };
    }
  };

  return (
    <Box
      component={motion.div}
      animate={getTransform()}
      transition={{
        scrollY: {
          type: 'spring',
          stiffness: 100,
          damping: 20,
        }
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default {
  AnimatedBox,
  AnimatedContainer,
  LoadingAnimation,
  ErrorShakeAnimation,
  SuccessBounceAnimation,
  PageTransition,
  HoverScaleAnimation,
  ParallaxScroll,
};