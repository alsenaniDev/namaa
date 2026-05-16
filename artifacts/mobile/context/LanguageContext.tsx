import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';
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

function getInitialLanguage(): Language {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(LANG_KEY);
        if (stored === 'en') return 'en';
        if (stored === 'ar') return 'ar';
      }
    } catch {}
    return 'ar';
  }
  // Native: default to 'ar' — I18nManager.isRTL will be false on first install,
  // but the effect will detect the mismatch and trigger a reload to RTL.
  return I18nManager.isRTL ? 'ar' : 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then(async (val) => {
      const lang: Language = val === 'ar' || val === 'en' ? val : 'ar';
      setLanguageState(lang);

      if (Platform.OS === 'web') {
        if (typeof localStorage === 'undefined') return;
        const stored = localStorage.getItem(LANG_KEY);
        const dirCurrentlyRTL = stored !== 'en'; // matches dir.ts logic
        const dirShouldBeRTL = lang === 'ar';

        if (stored !== lang) {
          localStorage.setItem(LANG_KEY, lang);
        }

        if (dirCurrentlyRTL !== dirShouldBeRTL) {
          window.location.reload();
        }
      } else {
        const shouldBeRTL = lang === 'ar';
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.allowRTL(shouldBeRTL);
          I18nManager.forceRTL(shouldBeRTL);
          try {
            await Updates.reloadAsync();
          } catch {
            // expo-updates not available in this environment
          }
        }
      }
    });
  }, []);

  const setLanguage = async (lang: Language) => {
    await AsyncStorage.setItem(LANG_KEY, lang);
    setLanguageState(lang);

    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LANG_KEY, lang);
      }
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } else {
      const shouldBeRTL = lang === 'ar';
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      try {
        await Updates.reloadAsync();
      } catch {
        // expo-updates not available in this environment
      }
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
