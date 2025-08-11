'use client';

import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon as X, 
  ClockIcon as Clock, 
  SpeakerWaveIcon as Volume2, 
  BellIcon as Bell, 
  SwatchIcon as Palette, 
  CakeIcon as Coffee 
} from '@heroicons/react/24/outline';
import { UserSettings } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: UserSettings) => void;
  currentSettings?: UserSettings;
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultSessionDuration: 1500, // 25 minutes
  soundEnabled: true,
  notificationsEnabled: true,
  theme: 'system',
  breakDuration: 300, // 5 minutes
  longBreakDuration: 900, // 15 minutes
  autoStartBreaks: false,
};

function SettingsModal({ isOpen, onClose, onSave, currentSettings }: SettingsModalProps) {
  const [settings, setSettings] = useState<UserSettings>(currentSettings || DEFAULT_SETTINGS);
  const [inputValues, setInputValues] = useState({
    defaultSessionDuration: '',
    breakDuration: '',
    longBreakDuration: ''
  });

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
      setInputValues({
        defaultSessionDuration: Math.floor((currentSettings.defaultSessionDuration || 1500) / 60).toString(),
        breakDuration: Math.floor((currentSettings.breakDuration || 300) / 60).toString(),
        longBreakDuration: Math.floor((currentSettings.longBreakDuration || 900) / 60).toString()
      });
    } else {
      setInputValues({
        defaultSessionDuration: '25',
        breakDuration: '5', 
        longBreakDuration: '15'
      });
    }
  }, [currentSettings]);

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const handleDurationChange = (field: keyof UserSettings, minutes: number) => {
    setSettings(prev => ({
      ...prev,
      [field]: minutes * 60 // Convert minutes to seconds
    }));
    // Update corresponding input value
    const inputField = field as keyof typeof inputValues;
    setInputValues(prev => ({
      ...prev,
      [inputField]: minutes.toString()
    }));
  };

  const handleInputChange = (field: keyof typeof inputValues, value: string) => {
    // Update input value immediately
    setInputValues(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Update settings only if valid number
    const minutes = parseInt(value);
    if (!isNaN(minutes) && minutes > 0) {
      setSettings(prev => ({
        ...prev,
        [field]: minutes * 60
      }));
    }
  };

  const handleInputBlur = (field: keyof typeof inputValues) => {
    const value = inputValues[field];
    const minutes = parseInt(value);
    
    // Validate and set default if invalid
    let defaultMinutes = 25;
    if (field === 'breakDuration') defaultMinutes = 5;
    if (field === 'longBreakDuration') defaultMinutes = 15;
    
    const validMinutes = (!isNaN(minutes) && minutes > 0) ? minutes : defaultMinutes;
    
    // Update both input and settings with valid value
    setInputValues(prev => ({
      ...prev,
      [field]: validMinutes.toString()
    }));
    
    setSettings(prev => ({
      ...prev,
      [field]: validMinutes * 60
    }));
  };

  const formatMinutes = (seconds?: number) => {
    if (!seconds) return '';
    return Math.floor(seconds / 60).toString();
  };

  const presetDurations = [
    { label: '15 min', value: 15 },
    { label: '25 min', value: 25 },
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '50 min', value: 50 },
    { label: '60 min', value: 60 },
  ];

  const breakPresets = [
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
    { label: '20 min', value: 20 },
    { label: '30 min', value: 30 },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Timer Settings */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Timer Settings</h3>
            </div>
            
            <div className="space-y-4">
              {/* Focus Session Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Focus Session Duration
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {presetDurations.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => handleDurationChange('defaultSessionDuration', preset.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        settings.defaultSessionDuration === preset.value * 60
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={inputValues.defaultSessionDuration}
                    onChange={(e) => handleInputChange('defaultSessionDuration', e.target.value)}
                    onBlur={() => handleInputBlur('defaultSessionDuration')}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                  <span className="text-sm text-gray-600">minutes</span>
                </div>
              </div>

              {/* Short Break Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short Break Duration
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {breakPresets.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => handleDurationChange('breakDuration', preset.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        settings.breakDuration === preset.value * 60
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={inputValues.breakDuration}
                    onChange={(e) => handleInputChange('breakDuration', e.target.value)}
                    onBlur={() => handleInputBlur('breakDuration')}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                  <span className="text-sm text-gray-600">minutes</span>
                </div>
              </div>

              {/* Long Break Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Long Break Duration
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={inputValues.longBreakDuration}
                    onChange={(e) => handleInputChange('longBreakDuration', e.target.value)}
                    onBlur={() => handleInputBlur('longBreakDuration')}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                  <span className="text-sm text-gray-600">minutes</span>
                </div>
              </div>
            </div>
          </section>

          {/* App Preferences */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-medium text-gray-900">Preferences</h3>
            </div>
            
            <div className="space-y-4">
              {/* Sound Settings */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Sound Effects</p>
                    <p className="text-sm text-gray-600">Play sounds when timer starts/ends</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Notifications</p>
                    <p className="text-sm text-gray-600">Show browser notifications</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notificationsEnabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, notificationsEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Auto-start Breaks */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Coffee className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Auto-start Breaks</p>
                    <p className="text-sm text-gray-600">Automatically start break timer after focus sessions</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoStartBreaks}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoStartBreaks: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Theme
                </label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' | 'system' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
