import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box } from '@mui/material';
import type { BoxProps } from '@mui/material';
import {
  fadeInVariants,
  staggerContainerVariants,
  staggerItemVariants,
  shakeVariants,
  type AnimationVariants,
  type AnimationConfig,
  defaultTransition,
} from './animationVariants';

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