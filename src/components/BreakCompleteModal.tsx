import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  CheckCircleIcon,
  PlayIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { focusContentService } from '@/lib/focus-content-service';

interface BreakCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartNewSession: () => void;
  breakType: 'short' | 'long';
  breakDuration: number; // in seconds
  hasTaskToResume?: boolean; // Whether there's a task to continue
}

export default function BreakCompleteModal({
  isOpen,
  onClose,
  onStartNewSession,
  breakType,
  breakDuration,
  hasTaskToResume = false
}: BreakCompleteModalProps) {
  const [sessionStartLine, setSessionStartLine] = useState<string>('');
  
  useEffect(() => {
    if (isOpen) {
      // Get a fresh session start line each time the modal opens
      const line = focusContentService.getSessionStartLine();
      setSessionStartLine(line);
    }
  }, [isOpen]);
  
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3" />
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Break Complete! 🌟
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-green-800">
                      🎉 Great job taking a {breakType} break! You recharged for {formatDuration(breakDuration)}. Ready to get back to focused work?
                    </p>
                  </div>

                  {/* Motivational Line for Next Session */}
                  {sessionStartLine && (
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 mb-4">
                      <div className="flex items-start space-x-3">
                        <SparklesIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium opacity-90 mb-1">Ready for your next session?</p>
                          <p className="text-sm font-medium leading-relaxed">
                            {sessionStartLine}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center mb-4">
                    <p className="text-sm font-medium text-blue-900">
                      {breakType === 'short' ? '☕' : '🌿'} {formatDuration(breakDuration)}
                    </p>
                    <p className="text-xs text-blue-700">
                      {breakType === 'short' ? 'Short Break' : 'Long Break'} Time
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
                    onClick={onStartNewSession}
                  >
                    <PlayIcon className="h-4 w-4 mr-2" />
                    {hasTaskToResume ? 'Continue Focus Session' : 'Start New Focus Session'}
                  </button>
                  
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 transition-colors"
                    onClick={onClose}
                  >
                    I'll Start Later
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
