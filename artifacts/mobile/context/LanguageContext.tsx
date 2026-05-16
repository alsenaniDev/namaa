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
  // Native: always default to 'ar' so useDir() returns RTL values on the very
  // first render — even before AsyncStorage resolves and before I18nManager
  // has been force-set (which only takes effect after a native restart).
  // The effect below will correct this to 'en' if the user previously chose English.
  return 'ar';
}

async function triggerNativeRestart(shouldBeRTL: boolean) {
  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);
  try {
    await Updates.reloadAsync();
  } catch {
    // expo-updates is not configured for OTA — the I18nManager flag is now
    // persisted and will apply on the next manual app launch.
    // Visual direction is already handled reactively via useDir(), so the
    // UI looks correct immediately. Full native RTL (cursor, ScrollView
    // inertia direction) will be applied on the next cold start.
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  // On mount: read the persisted language and sync I18nManager if needed.
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then(async (val) => {
      const lang: Language = val === 'ar' || val === 'en' ? val : 'ar';
      setLanguageState(lang);

      if (Platform.OS === 'web') {
        if (typeof localStorage === 'undefined') return;
        const stored = localStorage.getItem(LANG_KEY);
        const dirCurrentlyRTL = stored !== 'en';
        const dirShouldBeRTL = lang === 'ar';
        if (stored !== lang) localStorage.setItem(LANG_KEY, lang);
        if (dirCurrentlyRTL !== dirShouldBeRTL) window.location.reload();
      } else {
        const shouldBeRTL = lang === 'ar';
        if (I18nManager.isRTL !== shouldBeRTL) {
          // Sets the native bridge flag for the NEXT launch.
          // Visual direction is already correct via useDir() + language state.
          await triggerNativeRestart(shouldBeRTL);
        }
      }
    });
  }, []);

  const setLanguage = async (lang: Language) => {
    await AsyncStorage.setItem(LANG_KEY, lang);
    setLanguageState(lang);

    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_KEY, lang);
      if (typeof window !== 'undefined') window.location.reload();
      return;
    }

    // Native: useDir() is reactive so the UI direction updates immediately.
    // Also persist the I18nManager flag so native system behaviours (cursor,
    // ScrollView) are correct on the next cold start.
    const shouldBeRTL = lang === 'ar';
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);

    try {
      await Updates.reloadAsync();
    } catch {
      // expo-updates not configured for OTA. The layout direction switches
      // instantly via useDir(). For full native RTL, ask user to restart.
      const isNowRTL = lang === 'ar';
      Alert.alert(
        isNowRTL ? 'تم تغيير اللغة' : 'Language Changed',
        isNowRTL
          ? 'أعد تشغيل التطبيق لتطبيق جميع التغييرات بالكامل'
          : 'Please restart the app to fully apply all changes.',
        [{ text: isNowRTL ? 'حسناً' : 'OK' }],
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
