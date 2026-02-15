'use client'

import { useEffect, useState, useRef } from 'react'

/**
 * Custom hook for animating a number from 0 to target with easing
 * @param target - The target number to animate to
 * @param duration - Animation duration in milliseconds (default: 2000)
 * @param easing - Easing function (default: easeOutCubic for fast start, slow end)
 */
export function useAnimatedCounter(
  target: number,
  duration = 2000,
  easing: (t: number) => number = easeOutCubic
) {
  const [count, setCount] = useState(0)
  const frameRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    // Reset when target changes
    setCount(0)
    startTimeRef.current = undefined

    if (target === 0) return

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime
      }

      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Apply easing function
      const easedProgress = easing(progress)
      const currentCount = easedProgress * target

      setCount(currentCount)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setCount(target) // Ensure we end exactly at target
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [target, duration, easing])

  return count
}

// Easing functions

/**
 * Cubic ease-out: fast start, slow end
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Quadratic ease-out: moderate fast start, slow end
 */
export function easeOutQuad(t: number): number {
  return t * (2 - t)
}

/**
 * Exponential ease-out: very fast start, very slow end
 */
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}
