/**
 * Steps Component - DaisyUI step indicator for multi-step processes
 */

import React from 'react';

interface Step {
  title: string;
  description?: string;
  status?: 'pending' | 'active' | 'completed' | 'error';
  icon?: React.ReactNode;
}

interface StepsProps {
  steps: Step[];
  currentStep: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  onStepClick?: (stepIndex: number) => void;
}

const Steps: React.FC<StepsProps> = ({
  steps,
  currentStep,
  orientation = 'horizontal',
  className = '',
  onStepClick
}) => {
  const getStepClasses = (index: number, step: Step) => {
    const baseClasses = 'step';
    const statusClasses = {
      completed: 'step-primary',
      active: 'step-primary',
      error: 'step-error',
      pending: ''
    };

    let status = step.status;
    if (!status) {
      if (index < currentStep) status = 'completed';
      else if (index === currentStep) status = 'active';
      else status = 'pending';
    }

    return `${baseClasses} ${statusClasses[status]}`;
  };

  return (
    <ul className={`steps ${orientation === 'vertical' ? 'steps-vertical' : ''} ${className}`}>
      {steps.map((step, index) => (
        <li
          key={index}
          className={getStepClasses(index, step)}
          onClick={() => onStepClick?.(index)}
          style={{ cursor: onStepClick ? 'pointer' : 'default' }}
        >
          <div className="step-content">
            {step.icon && <div className="step-icon">{step.icon}</div>}
            <div className="step-title">{step.title}</div>
            {step.description && (
              <div className="step-description text-sm opacity-70">
                {step.description}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default Steps;