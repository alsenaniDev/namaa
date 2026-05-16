import { useLanguage } from '@/context/LanguageContext';

export interface DirValues {
  isRTL: boolean;
  row: 'row-reverse' | 'row';
  textAlign: 'right' | 'left';
  chevronDetail: string;
  chevronBack: string;
}

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
