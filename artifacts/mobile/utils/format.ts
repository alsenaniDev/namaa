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

export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatMonthYear(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
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
