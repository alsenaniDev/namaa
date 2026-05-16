import React, { createContext, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Platform } from 'react-native';
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

// The app is Arabic-only. Language switching is intentionally disabled.
// LanguageProvider exists so existing consumers of useLanguage() keep working,
// but it always reports 'ar' and ensures the persisted RTL flag stays true.
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Persist 'ar' so any legacy reader sees the correct value.
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
      return;
    }

    // Native: keep NSUserDefaults RTL flag aligned for the next cold start.
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language: 'ar', setLanguage: async () => {} }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
