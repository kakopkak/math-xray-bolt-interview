'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { clamp01, computeTrackProgress, computeTranslateX, findActivePanelIndex } from './scroll-math';

export type HorizontalStageState = {
  isDesktop: boolean;
  progress: number;
  translateX: number;
  activePanelIndex: number;
};

export type HorizontalStageHandle = {
  jumpToPanel: (panelIndex: number) => void;
};

type HorizontalStageProps = {
  panelCount: number;
  desktopMinWidth?: number;
  className?: string;
  viewportClassName?: string;
  trackClassName?: string;
  onStateChange?: (state: HorizontalStageState) => void;
  children: ReactNode;
};

function computePanelProgress(panelIndex: number, panelCount: number): number {
  if (panelCount <= 1) return 0;
  return clamp01(panelIndex / (panelCount - 1));
}

export const HorizontalStage = forwardRef<HorizontalStageHandle, HorizontalStageProps>(
  function HorizontalStage(
    {
      panelCount,
      desktopMinWidth = 1024,
      className,
      viewportClassName,
      trackClassName,
      onStateChange,
      children,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const isDesktopRef = useRef(false);
    const reduceMotionRef = useRef(false);
    const visibilityRatiosRef = useRef<Map<number, number>>(new Map());
    const rafRef = useRef<number | null>(null);
    const [stageState, setStageState] = useState<HorizontalStageState>({
      isDesktop: false,
      progress: 0,
      translateX: 0,
      activePanelIndex: 0,
    });
    const stageStateRef = useRef(stageState);

    const pushState = useCallback(
      (nextState: HorizontalStageState) => {
        const previous = stageStateRef.current;
        if (
          previous.isDesktop === nextState.isDesktop &&
          previous.progress === nextState.progress &&
          previous.translateX === nextState.translateX &&
          previous.activePanelIndex === nextState.activePanelIndex
        ) {
          return;
        }
        stageStateRef.current = nextState;
        setStageState(nextState);
        onStateChange?.(nextState);
      },
      [onStateChange]
    );

    const updateState = useCallback(() => {
      const container = containerRef.current;
      if (!container) return;

      const panelMeasurements = Array.from(
        container.querySelectorAll<HTMLElement>('[data-panel-index]')
      )
        .map((panelElement) => {
          const panelIndex = Number.parseInt(panelElement.dataset.panelIndex ?? '', 10);
          const rect = panelElement.getBoundingClientRect();
          return {
            panelIndex,
            top: rect.top,
            bottom: rect.bottom,
            intersectionRatio: visibilityRatiosRef.current.get(panelIndex),
          };
        })
        .filter((panel) => Number.isFinite(panel.panelIndex));

      const isDesktop = isDesktopRef.current;
      if (!isDesktop) {
        const maxPanelIndex = Math.max(panelCount - 1, 0);
        const fallbackPanelIndex = Math.min(
          maxPanelIndex,
          Math.max(0, stageStateRef.current.activePanelIndex)
        );
        const activePanelIndex = findActivePanelIndex({
          panels: panelMeasurements,
          viewportHeight: window.innerHeight,
          fallbackPanelIndex,
        });
        const progress = computePanelProgress(activePanelIndex, panelCount);

        pushState({
          isDesktop: false,
          progress,
          translateX: 0,
          activePanelIndex,
        });
        return;
      }

      const stageTop = container.getBoundingClientRect().top + window.scrollY;
      const stageHeight = container.offsetHeight;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const progress = computeTrackProgress({
        scrollY: window.scrollY,
        stageTop,
        stageHeight,
        viewportHeight,
      });
      const translateX = computeTranslateX({
        progress,
        panelCount,
        viewportWidth,
      });
      const activePanelIndex = findActivePanelIndex({
        panels: panelMeasurements,
        viewportHeight,
        fallbackPanelIndex: Math.min(
          panelCount - 1,
          Math.max(0, stageStateRef.current.activePanelIndex)
        ),
      });

      pushState({
        isDesktop: true,
        progress,
        translateX,
        activePanelIndex,
      });
    }, [panelCount, pushState]);

    const scheduleUpdate = useCallback(() => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        updateState();
      });
    }, [updateState]);

    useEffect(() => {
      const media = window.matchMedia(`(min-width: ${desktopMinWidth}px)`);
      const reduceMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

      const updateDesktop = () => {
        isDesktopRef.current = media.matches;
        updateState();
      };
      const updateReduceMotion = () => {
        reduceMotionRef.current = reduceMotionMedia.matches;
      };

      updateDesktop();
      updateReduceMotion();

      media.addEventListener('change', updateDesktop);
      reduceMotionMedia.addEventListener('change', updateReduceMotion);

      window.addEventListener('scroll', scheduleUpdate, { passive: true });
      window.addEventListener('resize', scheduleUpdate);

      return () => {
        media.removeEventListener('change', updateDesktop);
        reduceMotionMedia.removeEventListener('change', updateReduceMotion);
        window.removeEventListener('scroll', scheduleUpdate);
        window.removeEventListener('resize', scheduleUpdate);
        if (rafRef.current !== null) {
          window.cancelAnimationFrame(rafRef.current);
        }
      };
    }, [desktopMinWidth, scheduleUpdate, updateState]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
        return;
      }

      const visibilityRatios = visibilityRatiosRef.current;
      const panelElements = Array.from(
        container.querySelectorAll<HTMLElement>('[data-panel-index]')
      );
      if (panelElements.length === 0) {
        return;
      }

      const observer = new window.IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const panelIndex = Number.parseInt(
              (entry.target as HTMLElement).dataset.panelIndex ?? '',
              10
            );
            if (!Number.isFinite(panelIndex)) continue;
            visibilityRatios.set(panelIndex, entry.intersectionRatio);
          }
          scheduleUpdate();
        },
        {
          threshold: Array.from({ length: 11 }, (_, index) => index / 10),
        }
      );

      for (const panelElement of panelElements) {
        observer.observe(panelElement);
      }

      return () => {
        observer.disconnect();
        visibilityRatios.clear();
      };
    }, [panelCount, scheduleUpdate]);

    useImperativeHandle(
      ref,
      () => ({
        jumpToPanel: (panelIndex: number) => {
          const container = containerRef.current;
          if (!container) return;

          const boundedPanel = Math.max(0, Math.min(panelCount - 1, panelIndex));
          if (!isDesktopRef.current) {
            const panelElement = container.querySelector<HTMLElement>(
              `[data-panel-index="${boundedPanel}"]`
            );
            panelElement?.scrollIntoView({
              behavior: reduceMotionRef.current ? 'auto' : 'smooth',
              block: 'start',
            });
            return;
          }

          const stageTop = container.getBoundingClientRect().top + window.scrollY;
          const stageHeight = container.offsetHeight;
          const viewportHeight = window.innerHeight;
          const scrollableDistance = Math.max(stageHeight - viewportHeight, 0);
          const panelProgress = computePanelProgress(boundedPanel, panelCount);
          const nextY = stageTop + scrollableDistance * panelProgress;

          window.scrollTo({
            top: nextY,
            behavior: reduceMotionRef.current ? 'auto' : 'smooth',
          });
        },
      }),
      [panelCount]
    );

    const style = {
      '--panel-count': String(panelCount),
    } as CSSProperties;

    return (
      <div ref={containerRef} className={className} style={style}>
        <div className={viewportClassName}>
          <div
            className={trackClassName}
            style={{
              transform: stageState.isDesktop
                ? `translate3d(-${stageState.translateX}px, 0, 0)`
                : undefined,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }
);
