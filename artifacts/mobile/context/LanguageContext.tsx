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

/**
 * Synchronous initial language — used for the very first render before the
 * AsyncStorage hydration completes.
 *
 *  • Web:    read from localStorage (synchronous), default Arabic.
 *  • Native: derive from I18nManager.isRTL, which is persisted across launches
 *            in NSUserDefaults / SharedPreferences.  After the first install
 *            bootstrap below, isRTL always matches the user's saved language,
 *            so this gives a flash-free first render.
 */
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
  // Native: trust the persisted RTL flag.
  return I18nManager.isRTL ? 'ar' : 'en';
}

async function reloadApp() {
  try {
    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}

function showRestartAlert(lang: Language) {
  Alert.alert(
    lang === 'ar' ? 'إعادة تشغيل مطلوبة' : 'Restart Required',
    lang === 'ar'
      ? 'أغلق التطبيق وافتحه مرة أخرى لتطبيق اتجاه اللغة.'
      : 'Please close and reopen the app to apply the language direction.',
    [{ text: lang === 'ar' ? 'حسناً' : 'OK' }],
  );
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  // On mount: reconcile persisted language with the native RTL flag.
  // Three cases on native:
  //   (a) First install   — no stored value. Default to Arabic, force RTL, restart.
  //   (b) In sync         — stored matches I18nManager.isRTL. Just hydrate state.
  //   (c) Out of sync     — stored disagrees with native flag (rare; recover by
  //                         re-applying forceRTL and restarting).
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LANG_KEY).then(async (val) => {
      if (cancelled) return;
      const stored: Language | null = val === 'ar' || val === 'en' ? val : null;

      if (Platform.OS === 'web') {
        const lang: Language = stored ?? 'ar';
        setLanguageState(lang);
        if (typeof localStorage !== 'undefined' && localStorage.getItem(LANG_KEY) !== lang) {
          localStorage.setItem(LANG_KEY, lang);
        }
        const initialWasRTL = getInitialLanguage() !== 'en';
        const shouldBeRTL = lang === 'ar';
        if (initialWasRTL !== shouldBeRTL && typeof window !== 'undefined') {
          window.location.reload();
        }
        return;
      }

      // ─── Native ───
      const nativeIsRTL = I18nManager.isRTL;

      // (a) First install — no preference yet. Bootstrap to Arabic.
      if (stored === null) {
        await AsyncStorage.setItem(LANG_KEY, 'ar');
        setLanguageState('ar');
        if (!nativeIsRTL) {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(true);
          const reloaded = await reloadApp();
          if (!reloaded) showRestartAlert('ar');
        }
        return;
      }

      // (b) / (c) — hydrate, and realign native if needed.
      setLanguageState(stored);
      const shouldBeRTL = stored === 'ar';
      if (nativeIsRTL !== shouldBeRTL) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(shouldBeRTL);
        const reloaded = await reloadApp();
        if (!reloaded) showRestartAlert(stored);
      }
    });
    return () => {
      cancelled = true;
    };
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

    // Native: align the persisted RTL flag with the chosen language.
    const shouldBeRTL = lang === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(shouldBeRTL);
      const reloaded = await reloadApp();
      if (!reloaded) showRestartAlert(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
