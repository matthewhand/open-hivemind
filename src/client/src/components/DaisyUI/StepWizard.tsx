import React, { useState, useCallback } from 'react';
import { Input } from './index';

export interface Step {
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;
  validation?: () => boolean | Promise<boolean>;
  optional?: boolean;
  icon?: string;
}

export interface StepWizardProps {
  steps: Step[];
  currentStep?: number;
  onStepChange?: (stepIndex: number) => void;
  onComplete?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
  allowSkip?: boolean;
  showProgress?: boolean;
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

const StepWizard: React.FC<StepWizardProps> = ({
  steps,
  currentStep = 0,
  onStepChange,
  onComplete,
  onCancel,
  allowSkip = false,
  showProgress = true,
  variant = 'horizontal',
  className = ''
}) => {
  const [activeStep, setActiveStep] = useState(currentStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isValidating, setIsValidating] = useState(false);

  const handleStepChange = useCallback((stepIndex: number) => {
    setActiveStep(stepIndex);
    onStepChange?.(stepIndex);
  }, [onStepChange]);

  const validateCurrentStep = async (): Promise<boolean> => {
    const currentStepData = steps[activeStep];
    if (!currentStepData.validation) return true;

    setIsValidating(true);
    try {
      const isValid = await currentStepData.validation();
      return isValid;
    } catch (error) {
      console.error('Step validation failed:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    setCompletedSteps(prev => new Set([...prev, activeStep]));
    
    if (activeStep < steps.length - 1) {
      handleStepChange(activeStep + 1);
    } else {
      onComplete?.({});
    }
  };

  const handlePrevious = () => {
    if (activeStep > 0) {
      handleStepChange(activeStep - 1);
    }
  };

  const handleSkip = () => {
    if (allowSkip && activeStep < steps.length - 1) {
      handleStepChange(activeStep + 1);
    }
  };

  const canGoToStep = (stepIndex: number): boolean => {
    // Can always go back to completed steps or current step
    if (stepIndex <= activeStep) return true;
    // Can only go forward if all previous steps are completed
    for (let i = 0; i < stepIndex; i++) {
      if (!completedSteps.has(i) && !steps[i].optional) {
        return false;
      }
    }
    return true;
  };

  const getStepStatus = (stepIndex: number): 'completed' | 'active' | 'pending' | 'error' => {
    if (completedSteps.has(stepIndex)) return 'completed';
    if (stepIndex === activeStep) return 'active';
    if (stepIndex < activeStep) return 'error'; // Skipped required step
    return 'pending';
  };

  const getStepIcon = (step: Step, status: string, index: number) => {
    if (status === 'completed') return '✓';
    if (status === 'error') return '✗';
    if (step.icon) return step.icon;
    return index + 1;
  };

  const progressPercentage = ((activeStep + (completedSteps.has(activeStep) ? 1 : 0)) / steps.length) * 100;

  return (
    <div className={`w-full ${className}`}>
      {/* Progress Bar */}
      {showProgress && (
        <div className="mb-8">
          <div className="flex justify-between text-sm text-base-content/60 mb-2">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}% Complete</span>
          </div>
          <progress 
            className="progress progress-primary w-full" 
            value={progressPercentage} 
            max="100"
          />
        </div>
      )}

      {/* Steps Navigation */}
      <div className={`steps w-full mb-8 ${variant === 'vertical' ? 'steps-vertical' : ''}`}>
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const canNavigate = canGoToStep(index);
          
          return (
            <div
              key={step.id}
              className={`step ${
                status === 'completed' ? 'step-primary' : 
                status === 'active' ? 'step-primary' : 
                status === 'error' ? 'step-error' : ''
              } ${canNavigate ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
              data-content={getStepIcon(step, status, index)}
              onClick={() => canNavigate && handleStepChange(index)}
            >
              <div className="text-left">
                <div className="font-medium">{step.title}</div>
                {step.description && (
                  <div className="text-sm text-base-content/60">{step.description}</div>
                )}
                {step.optional && (
                  <div className="badge badge-ghost badge-xs mt-1">Optional</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Step Content */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="card-title text-2xl">
                {steps[activeStep]?.icon && (
                  <span className="text-3xl mr-2">{steps[activeStep].icon}</span>
                )}
                {steps[activeStep]?.title}
              </h2>
              {steps[activeStep]?.description && (
                <p className="text-base-content/70 mt-2">{steps[activeStep].description}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="badge badge-primary">
                Step {activeStep + 1} of {steps.length}
              </div>
              {steps[activeStep]?.optional && (
                <div className="badge badge-secondary">Optional</div>
              )}
            </div>
          </div>

          {/* Step Content */}
          <div className="min-h-[300px]">
            {steps[activeStep]?.content}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            className="btn btn-ghost"
            onClick={handlePrevious}
            disabled={activeStep === 0}
          >
            ← Previous
          </button>
          
          {allowSkip && activeStep < steps.length - 1 && steps[activeStep]?.optional && (
            <button
              className="btn btn-outline"
              onClick={handleSkip}
            >
              Skip
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <button
              className="btn btn-ghost"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          
          <button
            className={`btn btn-primary ${isValidating ? 'loading' : ''}`}
            onClick={handleNext}
            disabled={isValidating}
          >
            {isValidating ? '' : activeStep === steps.length - 1 ? 'Complete' : 'Next →'}
          </button>
        </div>
      </div>

      {/* Step Summary (for completed steps) */}
      {completedSteps.size > 0 && (
        <div className="mt-8">
          <div className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" />
            <div className="collapse-title text-xl font-medium">
              Review Completed Steps ({completedSteps.size}/{steps.length})
            </div>
            <div className="collapse-content">
              <div className="space-y-2">
                {Array.from(completedSteps).map(stepIndex => (
                  <div key={stepIndex} className="flex items-center gap-3 p-2 bg-base-100 rounded">
                    <div className="badge badge-success">✓</div>
                    <div>
                      <div className="font-medium">{steps[stepIndex]?.title}</div>
                      {steps[stepIndex]?.description && (
                        <div className="text-sm text-base-content/60">
                          {steps[stepIndex].description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Bot Setup Wizard Example Component
interface BotSetupWizardProps {
  onComplete: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}

export const BotSetupWizard: React.FC<BotSetupWizardProps> = ({ onComplete, onCancel }) => {
  const [formData, setFormData] = useState({
    botName: '',
    platform: '',
    token: '',
    personality: '',
    features: [] as string[]
  });

  const updateFormData = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const steps: Step[] = [
    {
      id: 'basic-info',
      title: 'Basic Information',
      description: 'Configure your bot\'s basic settings',
      icon: '🤖',
      content: (
        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Bot Name</span>
            </label>
            <Input
              type="text"
              placeholder="Enter bot name"
              className="w-full"
              value={formData.botName}
              onChange={(e) => updateFormData('botName', e.target.value)}
            />
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Platform</span>
            </label>
            <select
              className="select select-bordered"
              value={formData.platform}
              onChange={(e) => updateFormData('platform', e.target.value)}
            >
              <option value="">Select platform</option>
              <option value="discord">Discord</option>
              <option value="slack">Slack</option>
              <option value="telegram">Telegram</option>
              <option value="mattermost">Mattermost</option>
            </select>
          </div>
        </div>
      ),
      validation: () => formData.botName.trim() !== '' && formData.platform !== ''
    },
    {
      id: 'authentication',
      title: 'Authentication',
      description: 'Configure bot token and permissions',
      icon: '🔐',
      content: (
        <div className="space-y-4">
          <div className="alert alert-info">
            <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Your token will be encrypted and stored securely.</span>
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Bot Token</span>
            </label>
            <Input
              type="password"
              placeholder="Enter bot token"
              className="w-full"
              value={formData.token}
              onChange={(e) => updateFormData('token', e.target.value)}
            />
          </div>
        </div>
      ),
      validation: () => formData.token.trim() !== ''
    },
    {
      id: 'personality',
      title: 'Personality',
      description: 'Choose your bot\'s personality and behavior',
      icon: '🎭',
      optional: true,
      content: (
        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Personality Type</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Helpful', 'Friendly', 'Professional', 'Casual', 'Witty', 'Serious'].map(personality => (
                <label key={personality} className="cursor-pointer">
                  <input
                    type="radio"
                    name="personality"
                    value={personality.toLowerCase()}
                    className="radio radio-primary"
                    checked={formData.personality === personality.toLowerCase()}
                    onChange={(e) => updateFormData('personality', e.target.value)}
                  />
                  <span className="label-text ml-2">{personality}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'features',
      title: 'Features',
      description: 'Select additional features for your bot',
      icon: '⚡',
      optional: true,
      content: (
        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Available Features</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Auto-responses',
                'Message logging',
                'User management',
                'Custom commands',
                'File uploads',
                'Scheduled messages'
              ].map(feature => (
                <label key={feature} className="cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={formData.features.includes(feature)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateFormData('features', [...formData.features, feature]);
                      } else {
                        updateFormData('features', formData.features.filter(f => f !== feature));
                      }
                    }}
                  />
                  <span className="label-text ml-2">{feature}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'review',
      title: 'Review & Confirm',
      description: 'Review your bot configuration',
      icon: '✅',
      content: (
        <div className="space-y-4">
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title">Configuration Summary</h3>
              <div className="space-y-2">
                <div><strong>Name:</strong> {formData.botName}</div>
                <div><strong>Platform:</strong> {formData.platform}</div>
                <div><strong>Token:</strong> {'*'.repeat(formData.token.length)}</div>
                <div><strong>Personality:</strong> {formData.personality || 'Default'}</div>
                <div><strong>Features:</strong> {formData.features.join(', ') || 'None selected'}</div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Bot Setup Wizard</h1>
        <p className="text-base-content/70">Follow these steps to configure your new bot</p>
      </div>
      
      <StepWizard
        steps={steps}
        onComplete={() => onComplete(formData)}
        onCancel={onCancel}
        allowSkip={true}
        showProgress={true}
      />
    </div>
  );
};

export default StepWizard;