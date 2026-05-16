import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, I18nManager, Platform } from 'react-native';
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
 * Synchronous initial language for the very first render.
 *  • Web: read from localStorage (sync), default Arabic.
 *  • Native: we cannot read AsyncStorage synchronously, so default to Arabic
 *    (the app's primary language). The mount effect immediately hydrates the
 *    real stored value — same-language users see no change; English users see
 *    a brief Arabic frame then switch.
 *
 *  We intentionally do NOT read I18nManager.isRTL here. On iOS, isRTL is a
 *  cached value that does not update until the entire native process restarts
 *  (a JS reload does not refresh it). Deriving the JS language from it caused
 *  an infinite reload loop on first install.
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
  return 'ar';
}

function showRestartAlert(lang: Language) {
  Alert.alert(
    lang === 'ar' ? 'إعادة تشغيل مطلوبة' : 'Restart Required',
    lang === 'ar'
      ? 'تم تغيير اللغة. أغلق التطبيق تماماً وافتحه مرة أخرى لإكمال تغيير الاتجاه.'
      : 'Language changed. Please fully close the app and reopen it to complete the direction change.',
    [{ text: lang === 'ar' ? 'حسناً' : 'OK' }],
  );
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  // Guards the hydration effect so it never runs twice (would re-trigger the
  // first-install bootstrap or restart prompt on every re-render).
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

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
        return;
      }

      // ─── Native ───
      if (stored === null) {
        // First install: persist Arabic as the default. Also persist the
        // native RTL flag so the NEXT cold start has native chrome (back
        // arrow, swipe-back gesture, ScrollView inertia) in RTL too.
        await AsyncStorage.setItem(LANG_KEY, 'ar');
        setLanguageState('ar');
        if (!I18nManager.isRTL) {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(true);
          // We do NOT call Updates.reloadAsync() — on iOS the isRTL value is
          // cached for the lifetime of the native process, so a JS reload
          // cannot pick up the new value and would cause an infinite loop.
          // Content layout is already correct via useDir(); native chrome
          // will align on the next manual cold start.
        }
        return;
      }

      // Subsequent launches: hydrate state from storage. If the native RTL
      // flag is out of sync with the stored language (e.g. the user changed
      // language and reopened the app), align it for the NEXT cold start.
      // Do NOT auto-reload here — see comment above.
      setLanguageState(stored);
      const shouldBeRTL = stored === 'ar';
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(shouldBeRTL);
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

    // Native: content layout switches immediately because useDir() reads our
    // language state. We persist the native RTL flag so the NEXT cold start
    // also has correct native chrome direction. Show a one-time restart
    // prompt — auto-reload won't update the cached isRTL value anyway.
    const shouldBeRTL = lang === 'ar';
    const nativeNeedsChange = I18nManager.isRTL !== shouldBeRTL;
    if (nativeNeedsChange) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(shouldBeRTL);
      showRestartAlert(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
