import { useState, useEffect, useCallback } from 'react';
import { UserSettings } from '@/types';

const DEFAULT_SETTINGS: UserSettings = {
  defaultSessionDuration: 1500, // 25 minutes
  soundEnabled: true,
  notificationsEnabled: true,
  theme: 'system',
  breakDuration: 300, // 5 minutes
  longBreakDuration: 900, // 15 minutes
  autoStartBreaks: true, // Enabled by default for testing
};

const STORAGE_KEY = 'focus-app-settings';

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load settings from localStorage on mount (only on client)
  useEffect(() => {
    if (!isClient) return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        // Merge with defaults to ensure all properties exist
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
      // Use defaults if loading fails
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoaded(true);
    }
  }, [isClient]);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: UserSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
      // Update state even if saving fails
      setSettings(newSettings);
    }
  }, []);

  // Update specific setting
  const updateSetting = useCallback((key: keyof UserSettings, value: unknown) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
  }, [saveSettings]);

  return {
    settings,
    saveSettings,
    updateSetting,
    resetSettings,
    isLoaded,
  };
}
