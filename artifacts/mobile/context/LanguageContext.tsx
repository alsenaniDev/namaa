import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
  setLanguage: async () => { },
});

function applyWebDirection(lang: Language) {
  if (Platform.OS !== 'web') return;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_KEY, lang);
    if (typeof document !== 'undefined') {
      document.documentElement.style.direction = lang === 'ar' ? 'rtl' : 'ltr';
    }
  } catch {
    // ignore — direction is cosmetic on web
  }
}

/**
 * Holds the active language (Arabic / English) and persists it on-device.
 *
 * Layout direction is controlled manually (see hooks/useDir.ts) — Arabic is RTL,
 * English is LTR — so switching flips the UI instantly without touching
 * I18nManager (RN's native auto-flip stays disabled, see plugins/withForceRTL.js).
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>('ar');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((value) => {
        if (value === 'ar' || value === 'en') {
          setLang(value);
          applyWebDirection(value);
        }
      })
      .catch(() => { });
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLang(lang);
    applyWebDirection(lang);
    try {
      await AsyncStorage.setItem(LANG_KEY, lang);
    } catch {
      // Best-effort; keep the in-memory choice even if persistence fails.
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
