import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, I18nManager, Platform } from 'react-native';
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

// Synchronous initial state — used for the very first render before AsyncStorage resolves.
// On native: _layout.tsx already called I18nManager.forceRTL(true) at module level,
// so the native bridge is RTL from the start. We default the JS state to 'ar' to match.
// On web: read from localStorage so there is no direction flash.
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
  // Native: always default to 'ar'. The module-level forceRTL(true) in _layout.tsx
  // has already set the native bridge to RTL, so this matches that state.
  return 'ar';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  // On mount: hydrate from persisted storage. We only update the JS language state
  // here — we do NOT call forceRTL in this effect to avoid oscillating with the
  // module-level forceRTL(true) that already ran in _layout.tsx.
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((val) => {
      const lang: Language = val === 'ar' || val === 'en' ? val : 'ar';
      setLanguageState(lang);

      if (Platform.OS === 'web') {
        if (typeof localStorage === 'undefined') return;
        if (localStorage.getItem(LANG_KEY) !== lang) {
          localStorage.setItem(LANG_KEY, lang);
        }
        // Web: reload if direction changed since the synchronous initial setup.
        const initialWasRTL = getInitialLanguage() !== 'en';
        const shouldBeRTL = lang === 'ar';
        if (initialWasRTL !== shouldBeRTL) {
          window.location.reload();
        }
      }
      // Native: no forceRTL here — _layout.tsx module-level handles it.
      // I18nManager.isRTL is already true (set synchronously before first render).
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
      return;
    }

    // Native: update the native RTL bridge flag for the next cold start.
    // Our useDir() hook is reactive, so the UI direction switches immediately
    // without needing a reload. The native system behaviours (cursor position,
    // ScrollView inertia) will align on the next cold start.
    const shouldBeRTL = lang === 'ar';
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);

    try {
      await Updates.reloadAsync();
    } catch {
      // expo-updates OTA not configured — show a one-time restart prompt so
      // users know to close and reopen the app for full native direction change.
      Alert.alert(
        lang === 'ar' ? 'تم تغيير اللغة' : 'Language Changed',
        lang === 'ar'
          ? 'أعد تشغيل التطبيق لتطبيق التغييرات بالكامل'
          : 'Please restart the app to fully apply all changes.',
        [{ text: lang === 'ar' ? 'حسناً' : 'OK' }],
      );
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
