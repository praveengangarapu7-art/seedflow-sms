import { Check } from 'lucide-react';
import styles from './Stepper.module.css';

interface StepItem {
  key: string;
  label: string;
}

interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  onStepClick?: (index: number) => void;
}

export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <div className={styles.root}>
      {steps.map((step, idx) => {
        const isDone = idx < currentStep;
        const isCurrent = idx === currentStep;

        return (
          <div key={step.key} className={styles.stepWrapper}>
            {/* Step circle + label */}
            <div className={styles.stepCol}>
              <button
                type="button"
                className={`${styles.circle} ${isDone ? styles.circleDone : ''} ${isCurrent ? styles.circleCurrent : ''} ${!isDone && !isCurrent ? styles.circleFuture : ''}`}
                onClick={() => isDone && onStepClick?.(idx)}
                disabled={!isDone}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isDone ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : (
                  <span className={styles.stepNumber}>{idx + 1}</span>
                )}
              </button>
              <span
                className={`${styles.label} ${isDone ? styles.labelDone : ''} ${isCurrent ? styles.labelCurrent : ''} ${!isDone && !isCurrent ? styles.labelFuture : ''}`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line (not after last step) */}
            {idx < steps.length - 1 && (
              <div
                className={`${styles.connector} ${idx < currentStep ? styles.connectorDone : styles.connectorFuture}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
