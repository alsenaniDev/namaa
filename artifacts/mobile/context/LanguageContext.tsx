import React, { createContext, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Language } from '@/utils/i18n';

const LANG_KEY = '@mali/language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: async () => {},
});

// The app is Arabic-only. Layout direction is controlled manually (see
// hooks/useDir.ts) — we do NOT touch I18nManager here because RN's auto-flip
// is intentionally disabled at the native layer (plugins/withForceRTL.js).
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    AsyncStorage.setItem(LANG_KEY, 'ar').catch(() => {});
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(LANG_KEY, 'ar');
        }
        if (typeof document !== 'undefined') {
          document.documentElement.style.direction = 'rtl';
        }
      } catch {}
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language: 'ar', setLanguage: async () => {} }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
