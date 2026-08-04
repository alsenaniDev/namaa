import { useLanguage } from '@/context/LanguageContext';

export interface DirValues {
  isRTL: boolean;
  row: 'row-reverse' | 'row';
  textAlign: 'right' | 'left';
  chevronDetail: string;
  chevronBack: string;
}

/**
 * Layout-direction primitives derived from the active language: Arabic is RTL,
 * English is LTR.
 *
 * React Native's automatic LTR<->RTL flipping is DISABLED at the native layer
 * (see plugins/withForceRTL.js) and at the JS layer (see index.js), so
 * I18nManager.isRTL stays false regardless of language. That lets us drive
 * direction purely from these values, flipping the whole UI instantly when the
 * user switches language — with no native reload and no double-flip risk.
 */
export function useDir(): DirValues {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  return {
    isRTL,
    row: isRTL ? 'row-reverse' : 'row',
    textAlign: isRTL ? 'right' : 'left',
    chevronDetail: isRTL ? 'chevron-left' : 'chevron-right',
    chevronBack: isRTL ? 'chevron-right' : 'chevron-left',
  };
}
