'use client';

import { useState } from 'react';
import { DistractionCaptureProps } from '@/types';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function DistractionCapture({
  isOpen,
  onClose,
  onCapture,
  sessionId,
}: DistractionCaptureProps) {
  const [distractionText, setDistractionText] = useState('');
  const [recentDistractions, setRecentDistractions] = useState<string[]>([]);

  const handleCapture = () => {
    if (distractionText.trim()) {
      onCapture(distractionText.trim());
      setRecentDistractions(prev => [distractionText.trim(), ...prev.slice(0, 4)]);
      setDistractionText('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCapture();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const quickCaptures = [
    'Check social media',
    'Send a message',
    'Look something up',
    'Get a snack',
    'Check email',
    'Random thought',
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Not Now...
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Capture the distraction and get back to focus
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Text input */}
            <div className="mb-6">
              <textarea
                value={distractionText}
                onChange={(e) => setDistractionText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on your mind? (Press Enter to save, Escape to cancel)"
                className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                rows={3}
                autoFocus
              />
            </div>

            {/* Quick capture buttons */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Quick captures:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickCaptures.map((capture) => (
                  <button
                    key={capture}
                    onClick={() => {
                      onCapture(capture);
                      setRecentDistractions(prev => [capture, ...prev.slice(0, 4)]);
                      onClose();
                    }}
                    className="p-3 text-sm text-left text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    {capture}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent distractions */}
            {recentDistractions.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Recent distractions:
                </p>
                <div className="space-y-2">
                  {recentDistractions.map((distraction, index) => (
                    <div
                      key={index}
                      className="p-2 text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 rounded border-l-4 border-yellow-400"
                    >
                      {distraction}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleCapture}
                disabled={!distractionText.trim()}
                className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Save & Continue Focus
              </button>
              
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 <strong>Pro tip:</strong> Just capturing the distraction often makes it lose its urgency. You can address it after your focus session!
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
