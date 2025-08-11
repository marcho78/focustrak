'use client';

import { TaskStep } from '@/types';
import { CheckCircleIcon, CircleStackIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface TaskStepsProps {
  steps: TaskStep[];
  onToggleStep: (stepId: string) => void;
  readonly?: boolean;
}

export default function TaskSteps({ steps, onToggleStep, readonly = false }: TaskStepsProps) {
  const completedSteps = steps.filter(step => step.done).length;
  const nextStep = steps.find(step => !step.done);

  return (
    <div className="w-full">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <CircleStackIcon className="w-4 h-4 mr-2" />
          <span>Progress: {completedSteps}/{steps.length} steps</span>
        </div>
        <div className="text-sm text-gray-500">
          {Math.round((completedSteps / steps.length) * 100)}% complete
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${(completedSteps / steps.length) * 100}%` }}
        />
      </div>

      {/* Current/next step highlight */}
      {nextStep && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
            Next step:
          </div>
          <div className="text-blue-700 dark:text-blue-300">
            {nextStep.content}
          </div>
          {!readonly && (
            <button
              onClick={() => onToggleStep(nextStep.id)}
              className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
            >
              ✓ Mark as complete
            </button>
          )}
        </div>
      )}

      {/* All steps list */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-start p-3 rounded-lg transition-all ${
              step.done
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : step === nextStep
                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <button
              onClick={() => !readonly && onToggleStep(step.id)}
              disabled={readonly}
              className={`mr-3 mt-0.5 transition-colors ${
                readonly ? 'cursor-default' : 'cursor-pointer hover:scale-105'
              }`}
            >
              {step.done ? (
                <CheckCircleIconSolid className="w-5 h-5 text-green-500" />
              ) : (
                <CheckCircleIcon className="w-5 h-5 text-gray-400 hover:text-blue-500" />
              )}
            </button>
            
            <div className="flex-1">
              <div className="flex items-center mb-1">
                <span className="text-xs font-medium text-gray-500 mr-2">
                  Step {index + 1}
                </span>
                {step === nextStep && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                    Current
                  </span>
                )}
              </div>
              <div
                className={`text-sm ${
                  step.done
                    ? 'text-green-700 dark:text-green-300 line-through'
                    : step === nextStep
                    ? 'text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {step.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Completion celebration */}
      {completedSteps === steps.length && steps.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
          <div className="text-2xl mb-2">🎉</div>
          <div className="text-green-800 dark:text-green-200 font-semibold">
            All steps completed!
          </div>
          <div className="text-sm text-green-600 dark:text-green-400 mt-1">
            Great job breaking this task down and following through!
          </div>
        </div>
      )}
    </div>
  );
}
