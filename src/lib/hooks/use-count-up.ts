import { useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 800;

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

export function getCountUpFrameValue(
  startValue: number,
  targetValue: number,
  elapsedMs: number,
  durationMs = DEFAULT_DURATION_MS
): number {
  if (durationMs <= 0) return targetValue;

  const progress = Math.max(0, Math.min(1, elapsedMs / durationMs));
  const easedProgress = easeOutCubic(progress);
  const nextValue = startValue + (targetValue - startValue) * easedProgress;

  return progress >= 1 ? targetValue : nextValue;
}

export function useCountUp(targetValue: number, durationMs = DEFAULT_DURATION_MS): number {
  const [animatedValue, setAnimatedValue] = useState(0);
  const valueRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = valueRef.current;
    const safeTarget = Number.isFinite(targetValue) ? targetValue : 0;
    const shouldReduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const safeDuration = shouldReduceMotion ? 0 : Math.max(0, durationMs);
    let animationStartTime: number | null = null;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (safeDuration === 0 || startValue === safeTarget) {
      frameRef.current = requestAnimationFrame(() => {
        valueRef.current = safeTarget;
        setAnimatedValue(safeTarget);
        frameRef.current = null;
      });

      return () => {
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
      };
    }

    const animate = (timestamp: number) => {
      if (animationStartTime === null) {
        animationStartTime = timestamp;
      }

      const nextValue = getCountUpFrameValue(
        startValue,
        safeTarget,
        timestamp - animationStartTime,
        safeDuration
      );

      valueRef.current = nextValue;
      setAnimatedValue(nextValue);

      if (nextValue === safeTarget) {
        frameRef.current = null;
        return;
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [durationMs, targetValue]);

  return animatedValue;
}
