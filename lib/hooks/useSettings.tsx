'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Settings {
  soundEnabled: boolean;
  compactView: boolean;
  sortBy: 'deadline' | 'priority' | 'client' | 'created';
  sortOrder: 'asc' | 'desc';
}

interface SettingsContextType {
  settings: Settings;
  setSoundEnabled: (enabled: boolean) => void;
  setCompactView: (compact: boolean) => void;
  setSortBy: (sortBy: Settings['sortBy']) => void;
  setSortOrder: (order: Settings['sortOrder']) => void;
  toggleSound: () => void;
  toggleCompactView: () => void;
}

const defaultSettings: Settings = {
  soundEnabled: true,
  compactView: false,
  sortBy: 'deadline',
  sortOrder: 'asc',
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-settings');
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch {
        // Invalid JSON, use defaults
      }
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('dashboard-settings', JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  const setSoundEnabled = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, soundEnabled: enabled }));
  };

  const setCompactView = (compact: boolean) => {
    setSettings(prev => ({ ...prev, compactView: compact }));
  };

  const setSortBy = (sortBy: Settings['sortBy']) => {
    setSettings(prev => ({ ...prev, sortBy }));
  };

  const setSortOrder = (order: Settings['sortOrder']) => {
    setSettings(prev => ({ ...prev, sortOrder: order }));
  };

  const toggleSound = () => {
    setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const toggleCompactView = () => {
    setSettings(prev => ({ ...prev, compactView: !prev.compactView }));
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setSoundEnabled,
        setCompactView,
        setSortBy,
        setSortOrder,
        toggleSound,
        toggleCompactView,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
