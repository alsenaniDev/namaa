import { I18nManager, Platform } from 'react-native';
import { useLanguage } from '@/context/LanguageContext';

export interface DirValues {
  isRTL: boolean;
  row: 'row-reverse' | 'row';
  textAlign: 'right' | 'left';
  chevronDetail: string;
  chevronBack: string;
}

/**
 * Returns layout direction values based on the CURRENT app language.
 *
 * Important nuance for `flexDirection`:
 *   React Native's layout engine reads I18nManager.isRTL and already flips
 *   `flexDirection: 'row'` to render right-to-left when isRTL = true. So if
 *   we want a row visually arranged RTL and native is ALREADY RTL, we must
 *   write 'row' (a manual 'row-reverse' would double-flip back to LTR).
 *   Conversely, if we want RTL but native is LTR, we write 'row-reverse'.
 *
 *   Formula: use 'row-reverse' iff desired direction != native direction.
 *
 * `textAlign: 'right' | 'left'` is absolute in RN and does NOT depend on
 * I18nManager.isRTL, so we can map it directly from the language.
 */
export function useDir(): DirValues {
  const { language } = useLanguage();
  const wantRTL = language === 'ar';
  const nativeIsRTL = Platform.OS === 'web' ? false : I18nManager.isRTL;
  const needsManualFlip = wantRTL !== nativeIsRTL;

  return {
    isRTL: wantRTL,
    row: needsManualFlip ? 'row-reverse' : 'row',
    textAlign: wantRTL ? 'right' : 'left',
    chevronDetail: wantRTL ? 'chevron-left' : 'chevron-right',
    chevronBack: wantRTL ? 'chevron-right' : 'chevron-left',
  };
}
