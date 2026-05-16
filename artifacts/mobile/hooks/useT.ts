import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/utils/i18n';

export function useT() {
  const { language } = useLanguage();
  return translations[language];
}
