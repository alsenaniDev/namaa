const CURRENCY_SYMBOLS: Record<string, string> = {
  SAR: 'ر.س',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  KWD: 'د.ك',
  BHD: 'د.ب',
  QAR: 'ر.ق',
  OMR: 'ر.ع',
  EGP: 'ج.م',
};

export const ARABIC_GREGORIAN_LOCALE = 'ar-SA-u-ca-gregory';
export const ENGLISH_GREGORIAN_LOCALE = 'en-US-u-ca-gregory';

export function getGregorianDateLocale(language: string = 'ar'): string {
  return language === 'ar' ? ARABIC_GREGORIAN_LOCALE : ENGLISH_GREGORIAN_LOCALE;
}

export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  const formatted = Math.abs(amount).toLocaleString('ar-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? '-' : '';
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${sign}${formatted} ${symbol}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Parses a date string into a local-timezone Date. `YYYY-MM-DD` strings — which
 * we use for expenses, start/end dates etc. — would otherwise be interpreted
 * by `new Date(str)` as UTC midnight, shifting users in negative timezones to
 * the previous day. This helper anchors to local midnight instead.
 */
export function parseDateLocal(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(dateStr: string): string {
  const date = parseDateLocal(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString(ARABIC_GREGORIAN_LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(dateStr: string): string {
  const date = parseDateLocal(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString(ARABIC_GREGORIAN_LOCALE, {
    month: 'short',
    day: 'numeric',
  });
}

export function formatMonthYear(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(ARABIC_GREGORIAN_LOCALE, { month: 'long', year: 'numeric' });
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function getOrdinalDay(day: number): string {
  return `اليوم ${day}`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Converts Arabic-Indic (٠١٢٣٤٥٦٧٨٩) and Eastern Arabic / Persian (۰۱۲۳۴۵۶۷۸۹)
 * digits to ASCII (0-9). Leaves letters and other characters untouched.
 * Used in real time on every keystroke in numeric input fields.
 */
export function toAsciiDigits(input: string): string {
  if (!input) return input;
  return input.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (ch) => {
    const code = ch.charCodeAt(0);
    // Arabic-Indic: U+0660..U+0669  → 0..9
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    // Extended Arabic-Indic (Persian/Urdu): U+06F0..U+06F9 → 0..9
    return String(code - 0x06f0);
  });
}
