'use client';

import { clamp01, type WorkflowRailPhase } from './scroll-math';
import styles from './landing-page.module.css';

type ProgressRailStep = {
  indexLabel: string;
  title: string;
};

type ProgressRailProps = {
  steps: ProgressRailStep[];
  phase: WorkflowRailPhase;
  phaseLabel: string | null;
  workflowProgress: number;
  activeStepIndex: number | null;
  isDesktop: boolean;
  onStepSelect: (stepIndex: number) => void;
};

export function ProgressRail({
  steps,
  phase,
  phaseLabel,
  workflowProgress,
  activeStepIndex,
  isDesktop,
  onStepSelect,
}: ProgressRailProps) {
  const boundedProgress = clamp01(workflowProgress);
  const indicatorPosition = `${boundedProgress * 100}%`;
  const hintLabel = phaseLabel ?? 'Liigu sammude vahel';

  if (!isDesktop) {
    return (
      <nav
        className={styles.mobileProgress}
        aria-label="Koosraja sammude navigeerimine"
        data-phase={phase}
      >
        <p className={styles.mobileProgressHint}>{hintLabel}</p>
        <ol className={styles.mobileProgressList}>
          {steps.map((step, index) => {
            const isActive = index === activeStepIndex;
            return (
              <li key={step.title}>
                <button
                  type="button"
                  className={`${styles.mobileProgressButton} ${
                    isActive ? styles.mobileProgressButtonActive : ''
                  }`}
                  onClick={() => onStepSelect(index)}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className={styles.mobileProgressIndex}>{step.indexLabel}</span>
                  <span className={styles.mobileProgressTitle}>{step.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <nav
      className={`${styles.progressRail} ${styles.progressRailVisible}`}
      aria-label="Koosraja edenemine"
      data-phase={phase}
    >
      <div className={styles.progressHead}>
        <p
          className={`${styles.progressPhaseLabel} ${
            phaseLabel ? styles.progressPhaseLabelVisible : ''
          }`}
        >
          {phaseLabel ?? ' '}
        </p>
      </div>
      <div className={styles.progressTrack}>
        <span className={styles.progressFill} style={{ transform: `scaleX(${boundedProgress})` }} />
        {phase === 'intro' ? null : (
          <span className={styles.progressIndicator} style={{ left: indicatorPosition }} />
        )}
      </div>
      <ol className={styles.progressLabels}>
        {steps.map((step, index) => {
          const isActive = index === activeStepIndex;
          return (
            <li key={step.title}>
              <button
                type="button"
                className={`${styles.progressStepButton} ${isActive ? styles.progressStepActive : ''}`}
                onClick={() => onStepSelect(index)}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className={styles.progressStepIndex}>{step.indexLabel}</span>
                <span className={styles.progressStepTitle}>{step.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
