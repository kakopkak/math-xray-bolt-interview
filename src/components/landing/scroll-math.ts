type TrackProgressInput = {
  scrollY: number;
  stageTop: number;
  stageHeight: number;
  viewportHeight: number;
};

type TranslateXInput = {
  progress: number;
  panelCount: number;
  viewportWidth: number;
};

type ActiveStepInput = {
  activePanelIndex: number;
};

type WorkflowRailInput = {
  activePanelIndex: number;
  stepCount: number;
  firstProcessPanelIndex?: number;
};

export type WorkflowRailPhase = 'intro' | 'workflow' | 'post';

export type WorkflowRailState = {
  phase: WorkflowRailPhase;
  activeStepIndex: number | null;
  workflowProgress: number;
  phaseLabel: string | null;
};

type FindActivePanelIndexInput = {
  panels: Array<{
    panelIndex: number;
    top: number;
    bottom: number;
    intersectionRatio?: number;
  }>;
  viewportHeight: number;
  fallbackPanelIndex: number;
};

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function computeTrackProgress({
  scrollY,
  stageTop,
  stageHeight,
  viewportHeight,
}: TrackProgressInput): number {
  const scrollableDistance = stageHeight - viewportHeight;
  if (scrollableDistance <= 0) {
    return 0;
  }

  const offset = scrollY - stageTop;
  return clamp01(offset / scrollableDistance);
}

export function computeTranslateX({ progress, panelCount, viewportWidth }: TranslateXInput): number {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return 0;
  }

  if (panelCount < 2) {
    return 0;
  }

  const boundedProgress = clamp01(progress);
  const distance = (panelCount - 1) * viewportWidth;
  return boundedProgress * distance;
}

export function getActiveStepIndex({ activePanelIndex }: ActiveStepInput): number | null {
  return getWorkflowRailState({ activePanelIndex, stepCount: 5 }).activeStepIndex;
}

export function getWorkflowRailState({
  activePanelIndex,
  stepCount,
  firstProcessPanelIndex = 2,
}: WorkflowRailInput): WorkflowRailState {
  const safeStepCount = Math.max(stepCount, 0);
  const lastProcessPanelIndex = firstProcessPanelIndex + safeStepCount - 1;

  if (safeStepCount === 0 || activePanelIndex < firstProcessPanelIndex) {
    return {
      phase: 'intro',
      activeStepIndex: null,
      workflowProgress: 0,
      phaseLabel: 'Sissejuhatus',
    };
  }

  if (activePanelIndex > lastProcessPanelIndex) {
    return {
      phase: 'post',
      activeStepIndex: null,
      workflowProgress: 1,
      phaseLabel: 'Töövoog läbitud',
    };
  }

  const activeStepIndex = activePanelIndex - firstProcessPanelIndex;
  const workflowProgress =
    safeStepCount <= 1 ? 1 : clamp01(activeStepIndex / (safeStepCount - 1));

  return {
    phase: 'workflow',
    activeStepIndex,
    workflowProgress,
    phaseLabel: null,
  };
}

function computeIntersectionRatio(top: number, bottom: number, viewportHeight: number): number {
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || !Number.isFinite(viewportHeight)) {
    return 0;
  }

  const panelHeight = bottom - top;
  if (panelHeight <= 0 || viewportHeight <= 0) {
    return 0;
  }

  const visibleTop = Math.max(top, 0);
  const visibleBottom = Math.min(bottom, viewportHeight);
  const visibleHeight = Math.max(visibleBottom - visibleTop, 0);
  return clamp01(visibleHeight / panelHeight);
}

export function findActivePanelIndex({
  panels,
  viewportHeight,
  fallbackPanelIndex,
}: FindActivePanelIndexInput): number {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0 || panels.length === 0) {
    return fallbackPanelIndex;
  }

  const viewportMidpoint = viewportHeight / 2;
  const dominantPanel = panels.reduce(
    (best, panel) => {
      const ratio = Number.isFinite(panel.intersectionRatio)
        ? clamp01(panel.intersectionRatio ?? 0)
        : computeIntersectionRatio(panel.top, panel.bottom, viewportHeight);
      const distance = Math.abs((panel.top + panel.bottom) / 2 - viewportMidpoint);

      if (
        ratio > best.ratio + 0.0001 ||
        (Math.abs(ratio - best.ratio) <= 0.0001 && distance < best.distance)
      ) {
        return { panelIndex: panel.panelIndex, ratio, distance };
      }

      return best;
    },
    {
      panelIndex: fallbackPanelIndex,
      ratio: -1,
      distance: Number.POSITIVE_INFINITY,
    }
  );

  if (dominantPanel.ratio > 0) {
    return dominantPanel.panelIndex;
  }

  const nearestPanel = panels.reduce(
    (closest, panel) => {
      const panelCenter = (panel.top + panel.bottom) / 2;
      const distance = Math.abs(panelCenter - viewportMidpoint);
      if (distance < closest.distance) {
        return { panelIndex: panel.panelIndex, distance };
      }
      return closest;
    },
    { panelIndex: fallbackPanelIndex, distance: Number.POSITIVE_INFINITY }
  );

  return nearestPanel.panelIndex;
}
