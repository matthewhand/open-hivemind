import React from 'react';

export interface StepperProps {
  activeStep: number;
  steps: Array<{
    label: string;
    description?: string;
    icon?: React.ReactNode;
    optional?: boolean;
  }>;
  orientation?: 'horizontal' | 'vertical';
  connector?: React.ReactNode;
  onStepClick?: (stepIndex: number) => void;
  completed?: Set<number>;
  className?: string;
}

const Stepper: React.FC<StepperProps> = ({
  activeStep,
  steps,
  orientation = 'horizontal',
  onStepClick,
  completed = new Set(),
  className = '',
}) => {
  const isHorizontal = orientation === 'horizontal';
  
  const containerClasses = [
    'stepper',
    isHorizontal ? 'flex items-center justify-between' : 'flex flex-col space-y-4',
    className,
  ].filter(Boolean).join(' ');

  const getStepStatus = (index: number) => {
    if (completed.has(index)) return 'completed';
    if (index === activeStep) return 'active';
    if (index < activeStep) return 'completed';
    return 'inactive';
  };

  const getStepClasses = (index: number) => {
    const status = getStepStatus(index);
    const baseClasses = 'step-item flex items-center cursor-pointer transition-all duration-200';
    
    const statusClasses = {
      active: 'text-primary',
      completed: 'text-success',
      inactive: 'text-base-content/50',
    };

    return `${baseClasses} ${statusClasses[status]}`;
  };

  const getStepIconClasses = (index: number) => {
    const status = getStepStatus(index);
    const baseClasses = 'step-icon flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-semibold mr-3';
    
    const statusClasses = {
      active: 'bg-primary text-primary-content border-primary',
      completed: 'bg-success text-success-content border-success',
      inactive: 'bg-base-100 text-base-content/50 border-base-content/20',
    };

    return `${baseClasses} ${statusClasses[status]}`;
  };

  return (
    <div className={containerClasses}>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div
            className={getStepClasses(index)}
            onClick={() => onStepClick?.(index)}
            role={onStepClick ? 'button' : undefined}
            tabIndex={onStepClick ? 0 : undefined}
          >
            <div className={getStepIconClasses(index)}>
              {step.icon || (
                getStepStatus(index) === 'completed' ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )
              )}
            </div>
            <div className="step-content">
              <div className="step-label font-medium text-sm">
                {step.label}
                {step.optional && (
                  <span className="text-xs text-base-content/50 ml-1">(optional)</span>
                )}
              </div>
              {step.description && (
                <div className="step-description text-xs text-base-content/70 mt-1">
                  {step.description}
                </div>
              )}
            </div>
          </div>
          
          {/* Connector line between steps */}
          {index < steps.length - 1 && (
            <div className={
              isHorizontal 
                ? 'flex-1 h-px bg-base-content/20 mx-4' 
                : 'w-px h-6 bg-base-content/20 ml-4'
            } />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Stepper;