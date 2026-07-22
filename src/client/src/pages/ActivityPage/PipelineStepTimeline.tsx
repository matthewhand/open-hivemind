/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { RefreshCw, X, CheckCircle2, AlertCircle } from 'lucide-react';
import Badge from '../../components/DaisyUI/Badge';
import { statusColorMap, statusIconMap, type PipelineStep } from './pipelineSteps';

export const PipelineStepTimeline: React.FC<{ steps: PipelineStep[] }> = ({ steps }) => {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const isExpanded = expandedStep === step.id;
        const color = statusColorMap[step.status];
        const iconKey = statusIconMap[step.status];

        return (
          <div key={step.id} className="relative">
            {/* Connector line between steps */}
            {!isLast && (
              <div className={`absolute left-4 top-8 w-0.5 h-8 ${
                step.status === 'fail' ? 'bg-error' : 'bg-base-300'
              }`} />
            )}

            {/* Step row */}
            <div className="flex items-start gap-3 py-2">
              {/* Icon dot */}
              <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                color === 'success' ? 'bg-success/20 text-success' :
                color === 'error' ? 'bg-error/20 text-error' :
                color === 'warning' ? 'bg-warning/20 text-warning' :
                'bg-info/20 text-info'
              }`}>
                {iconKey === 'check' && <CheckCircle2 className="w-4 h-4" />}
                {iconKey === 'x' && <AlertCircle className="w-4 h-4" />}
                {iconKey === 'minus' && <X className="w-4 h-4" />}
                {iconKey === 'loader' && <RefreshCw className="w-4 h-4 animate-spin" />}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{step.icon}</span>
                  <span className="font-semibold text-sm">{step.name}</span>
                  <Badge variant={color as any} size="xs" style="outline">{step.status}</Badge>
                </div>
                <p className="text-xs text-base-content/60 mt-0.5">{step.summary}</p>

                {/* Inline detail fields */}
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                  {Object.entries(step.details).filter(([k]) => !k.startsWith('Error')).map(([key, value]) => (
                    <span key={key} className="text-base-content/50">
                      <span className="font-medium text-base-content/70">{key}:</span>{' '}{String(value)}
                    </span>
                  ))}
                </div>

                {/* Expandable raw JSON */}
                <button
                  className="text-xs text-primary mt-1.5 hover:underline cursor-pointer"
                  onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                  type="button"
                >
                  {isExpanded ? 'Hide technical details' : 'Show technical details'}
                </button>
                {isExpanded && (
                  <pre className="mt-1 p-2 bg-base-200 rounded text-xs overflow-x-auto max-h-40">
                    {JSON.stringify(step.rawJson, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

