import { I18nManager, Platform } from 'react-native';

function computeIsRTL(): boolean {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') {
        const lang = localStorage.getItem('@mali/language');
        return lang !== 'en';
      }
    } catch {
      // ignore
    }
    return true;
  }
  return I18nManager.isRTL;
}

export const isRTL = computeIsRTL();
export const row = isRTL ? ('row-reverse' as const) : ('row' as const);
export const textAlign = isRTL ? ('right' as const) : ('left' as const);
export const chevronDetail = isRTL ? 'chevron-left' : 'chevron-right';
export const chevronBack = isRTL ? 'chevron-right' : 'chevron-left';
