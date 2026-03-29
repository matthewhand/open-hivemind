/**
 * useSwipeGesture - Hook for handling swipe gestures on mobile
 * Supports left, right, up, and down swipes with configurable thresholds
 */

import { useRef, useCallback, TouchEvent } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance in pixels to trigger swipe
  preventScroll?: boolean;
}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

export const useSwipeGesture = (options: SwipeGestureOptions) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventScroll = false,
  } = options;

  const touchStart = useRef<TouchPosition | null>(null);
  const touchEnd = useRef<TouchPosition | null>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      touchEnd.current = null;
      touchStart.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
        time: Date.now(),
      };
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (preventScroll && touchStart.current) {
        // Prevent scroll if horizontal swipe is detected
        const currentX = e.targetTouches[0].clientX;
        const currentY = e.targetTouches[0].clientY;
        const deltaX = Math.abs(currentX - touchStart.current.x);
        const deltaY = Math.abs(currentY - touchStart.current.y);

        if (deltaX > deltaY && deltaX > 10) {
          e.preventDefault();
        }
      }

      touchEnd.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
        time: Date.now(),
      };
    },
    [preventScroll]
  );

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const deltaTime = touchEnd.current.time - touchStart.current.time;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Velocity check (pixels per millisecond) - require reasonable swipe speed
    const velocityX = absDeltaX / deltaTime;
    const velocityY = absDeltaY / deltaTime;
    const minVelocity = 0.3;

    // Horizontal swipe (left or right)
    if (absDeltaX > absDeltaY && absDeltaX > threshold && velocityX > minVelocity) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    // Vertical swipe (up or down)
    else if (absDeltaY > absDeltaX && absDeltaY > threshold && velocityY > minVelocity) {
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown();
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp();
      }
    }

    touchStart.current = null;
    touchEnd.current = null;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};

export default useSwipeGesture;
