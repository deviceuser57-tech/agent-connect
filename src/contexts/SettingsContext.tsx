// Central app-wide settings store. Single seeding source consumed across
// the app (chat citations, hallucination checks, cognitive engine defaults,
// notifications, auto-save, analytics). Persisted to localStorage with
// back-compat keys (rag_*).
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

export interface AppSettings {
  // Notifications
  emailNotifications: boolean;
  browserNotifications: boolean;
  // RAG
  citationDisplay: boolean;
  hallucinationCheck: boolean;
  // General
  autoSave: boolean;
  analyticsEnabled: boolean;
  // Cognitive Architecture
  cognitiveEngineEnabled: boolean;
  hotPathEnabled: boolean;
}

const DEFAULTS: AppSettings = {
  emailNotifications: true,
  browserNotifications: false,
  citationDisplay: true,
  hallucinationCheck: true,
  autoSave: true,
  analyticsEnabled: true,
  cognitiveEngineEnabled: true,
  hotPathEnabled: true,
};

const STORAGE_KEYS: Record<keyof AppSettings, string> = {
  emailNotifications: 'rag_email_notifications',
  browserNotifications: 'rag_browser_notifications',
  citationDisplay: 'rag_citation_display',
  hallucinationCheck: 'rag_hallucination_check',
  autoSave: 'rag_auto_save',
  analyticsEnabled: 'rag_analytics',
  cognitiveEngineEnabled: 'rag_cognitive_engine',
  hotPathEnabled: 'rag_hot_path',
};

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const v = localStorage.getItem(key);
  return v === null ? fallback : v === 'true';
}

function loadAll(): AppSettings {
  return (Object.keys(DEFAULTS) as (keyof AppSettings)[]).reduce((acc, k) => {
    acc[k] = readBool(STORAGE_KEYS[k], DEFAULTS[k]);
    return acc;
  }, {} as AppSettings);
}

interface SettingsContextType {
  settings: AppSettings;
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => loadAll());

  const setSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(STORAGE_KEYS[key], String(value)); } catch { /* ignore */ }
      // Broadcast across tabs
      try {
        window.dispatchEvent(new CustomEvent('app-settings-change', { detail: { key, value } }));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULTS);
    (Object.keys(DEFAULTS) as (keyof AppSettings)[]).forEach((k) => {
      try { localStorage.setItem(STORAGE_KEYS[k], String(DEFAULTS[k])); } catch { /* ignore */ }
    });
  }, []);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      const entry = (Object.entries(STORAGE_KEYS) as [keyof AppSettings, string][]).find(([, v]) => v === e.key);
      if (!entry) return;
      const [k] = entry;
      setSettings((prev) => ({ ...prev, [k]: e.newValue === 'true' }));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
};

/** Convenience helper to read a single flag without subscribing to all settings. */
export const useSettingValue = <K extends keyof AppSettings>(key: K): AppSettings[K] => {
  const { settings } = useSettings();
  return settings[key];
};
