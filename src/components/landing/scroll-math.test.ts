import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clamp01,
  computeTrackProgress,
  computeTranslateX,
  findActivePanelIndex,
  getActiveStepIndex,
  getWorkflowRailState,
} from './scroll-math';

test('clamp01 constrains to [0, 1]', () => {
  assert.equal(clamp01(-0.2), 0);
  assert.equal(clamp01(0), 0);
  assert.equal(clamp01(0.42), 0.42);
  assert.equal(clamp01(1), 1);
  assert.equal(clamp01(1.4), 1);
});

test('computeTrackProgress returns 0 before stage and 1 after stage end', () => {
  const before = computeTrackProgress({
    scrollY: 120,
    stageTop: 200,
    stageHeight: 3000,
    viewportHeight: 1000,
  });
  const after = computeTrackProgress({
    scrollY: 2600,
    stageTop: 200,
    stageHeight: 3000,
    viewportHeight: 1000,
  });

  assert.equal(before, 0);
  assert.equal(after, 1);
});

test('computeTrackProgress returns normalized progress inside stage', () => {
  const progress = computeTrackProgress({
    scrollY: 700,
    stageTop: 200,
    stageHeight: 3000,
    viewportHeight: 1000,
  });

  // distance = 3000 - 1000 = 2000, offset = 500 => 0.25
  assert.equal(progress, 0.25);
});

test('computeTrackProgress handles non-scrollable stage defensively', () => {
  const progress = computeTrackProgress({
    scrollY: 300,
    stageTop: 200,
    stageHeight: 900,
    viewportHeight: 1000,
  });

  assert.equal(progress, 0);
});

test('computeTranslateX maps progress into horizontal travel distance', () => {
  assert.equal(computeTranslateX({ progress: 0, panelCount: 9, viewportWidth: 1200 }), 0);
  assert.equal(computeTranslateX({ progress: 0.5, panelCount: 9, viewportWidth: 1200 }), 4800);
  assert.equal(computeTranslateX({ progress: 1, panelCount: 9, viewportWidth: 1200 }), 9600);
});

test('computeTranslateX returns 0 for invalid panel counts', () => {
  assert.equal(computeTranslateX({ progress: 0.5, panelCount: 1, viewportWidth: 1200 }), 0);
  assert.equal(computeTranslateX({ progress: 0.5, panelCount: 0, viewportWidth: 1200 }), 0);
});

test('getActiveStepIndex maps process panels to Capture..Practice indices', () => {
  assert.equal(getActiveStepIndex({ activePanelIndex: 0 }), null);
  assert.equal(getActiveStepIndex({ activePanelIndex: 1 }), null);
  assert.equal(getActiveStepIndex({ activePanelIndex: 2 }), 0);
  assert.equal(getActiveStepIndex({ activePanelIndex: 3 }), 1);
  assert.equal(getActiveStepIndex({ activePanelIndex: 4 }), 2);
  assert.equal(getActiveStepIndex({ activePanelIndex: 5 }), 3);
  assert.equal(getActiveStepIndex({ activePanelIndex: 6 }), 4);
  assert.equal(getActiveStepIndex({ activePanelIndex: 7 }), null);
  assert.equal(getActiveStepIndex({ activePanelIndex: 8 }), null);
});

test('getWorkflowRailState keeps intro neutral before the workflow begins', () => {
  assert.deepEqual(getWorkflowRailState({ activePanelIndex: 0, stepCount: 5 }), {
    phase: 'intro',
    activeStepIndex: null,
    workflowProgress: 0,
    phaseLabel: 'Sissejuhatus',
  });

  assert.deepEqual(getWorkflowRailState({ activePanelIndex: 1, stepCount: 5 }), {
    phase: 'intro',
    activeStepIndex: null,
    workflowProgress: 0,
    phaseLabel: 'Sissejuhatus',
  });
});

test('getWorkflowRailState maps workflow panels and completion state explicitly', () => {
  assert.deepEqual(getWorkflowRailState({ activePanelIndex: 2, stepCount: 5 }), {
    phase: 'workflow',
    activeStepIndex: 0,
    workflowProgress: 0,
    phaseLabel: null,
  });

  assert.deepEqual(getWorkflowRailState({ activePanelIndex: 4, stepCount: 5 }), {
    phase: 'workflow',
    activeStepIndex: 2,
    workflowProgress: 0.5,
    phaseLabel: null,
  });

  assert.deepEqual(getWorkflowRailState({ activePanelIndex: 8, stepCount: 5 }), {
    phase: 'post',
    activeStepIndex: null,
    workflowProgress: 1,
    phaseLabel: 'Töövoog läbitud',
  });
});

test('findActivePanelIndex picks panel containing viewport midpoint', () => {
  const activePanelIndex = findActivePanelIndex({
    panels: [
      { panelIndex: 0, top: -400, bottom: 200 },
      { panelIndex: 1, top: 220, bottom: 980 },
      { panelIndex: 2, top: 1000, bottom: 1760 },
    ],
    viewportHeight: 1000,
    fallbackPanelIndex: 0,
  });

  assert.equal(activePanelIndex, 1);
});

test('findActivePanelIndex falls back to nearest panel center when midpoint is between panels', () => {
  const activePanelIndex = findActivePanelIndex({
    panels: [
      { panelIndex: 0, top: -500, bottom: -100 },
      { panelIndex: 1, top: 0, bottom: 380 },
      { panelIndex: 2, top: 560, bottom: 940 },
      { panelIndex: 3, top: 1120, bottom: 1500 },
    ],
    viewportHeight: 1000,
    fallbackPanelIndex: 0,
  });

  assert.equal(activePanelIndex, 2);
});

test('findActivePanelIndex prefers the highest intersection ratio when panels overlap vertically', () => {
  const activePanelIndex = findActivePanelIndex({
    panels: [
      { panelIndex: 0, top: 0, bottom: 900, intersectionRatio: 0.08 },
      { panelIndex: 1, top: 0, bottom: 900, intersectionRatio: 0.76 },
      { panelIndex: 2, top: 0, bottom: 900, intersectionRatio: 0.16 },
    ],
    viewportHeight: 900,
    fallbackPanelIndex: 0,
  });

  assert.equal(activePanelIndex, 1);
});

test('findActivePanelIndex returns fallback when panel measurements are empty', () => {
  const activePanelIndex = findActivePanelIndex({
    panels: [],
    viewportHeight: 1000,
    fallbackPanelIndex: 4,
  });

  assert.equal(activePanelIndex, 4);
});
