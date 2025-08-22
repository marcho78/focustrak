import { useState, useEffect, useCallback } from 'react';
import { UserSettings } from '@/types';

const DEFAULT_SETTINGS: UserSettings = {
  defaultSessionDuration: 1500, // 25 minutes
  soundEnabled: true,
  notificationsEnabled: false, // Default to false until user grants permission
  theme: 'system',
  breakDuration: 300, // 5 minutes
  longBreakDuration: 900, // 15 minutes
  autoStartBreaks: true, // Enabled by default for testing
};

const STORAGE_KEY = 'focus-app-settings';
const STORAGE_VERSION = '1.0';
const EXPIRATION_DAYS = 30; // Settings expire after 30 days

interface StoredSettings {
  version: string;
  timestamp: number;
  expiresAt: number;
  data: UserSettings;
}

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
        const storedData: StoredSettings = JSON.parse(stored);
        
        // Check version compatibility
        if (storedData.version !== STORAGE_VERSION) {
          console.log('Settings version mismatch, using defaults');
          localStorage.removeItem(STORAGE_KEY);
          setSettings(DEFAULT_SETTINGS);
          return;
        }
        
        // Check expiration
        const now = Date.now();
        if (storedData.expiresAt && storedData.expiresAt < now) {
          console.log('Settings expired, using defaults');
          localStorage.removeItem(STORAGE_KEY);
          setSettings(DEFAULT_SETTINGS);
          return;
        }
        
        // Validate data structure
        if (!storedData.data || typeof storedData.data !== 'object') {
          console.warn('Invalid settings structure, using defaults');
          localStorage.removeItem(STORAGE_KEY);
          setSettings(DEFAULT_SETTINGS);
          return;
        }
        
        // Merge with defaults to ensure all properties exist
        setSettings({ ...DEFAULT_SETTINGS, ...storedData.data });
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
      // Clear corrupted data
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      // Use defaults if loading fails
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoaded(true);
    }
  }, [isClient]);

  // Save settings to localStorage with expiration
  const saveSettings = useCallback((newSettings: UserSettings) => {
    try {
      const now = Date.now();
      const storedData: StoredSettings = {
        version: STORAGE_VERSION,
        timestamp: now,
        expiresAt: now + (EXPIRATION_DAYS * 24 * 60 * 60 * 1000),
        data: newSettings
      };
      
      // Limit localStorage usage (max 5KB for settings)
      const serialized = JSON.stringify(storedData);
      if (serialized.length > 5120) {
        console.warn('Settings too large, not saving');
        return;
      }
      
      localStorage.setItem(STORAGE_KEY, serialized);
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
