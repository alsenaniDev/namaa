import { toAsciiDigits } from './format';

// Structural shape — accepts both `translations.ar` and `translations.en`
// without locking us to one set of literal strings.
type ValidatorT = {
  forms: {
    errorTitle: string;
    errorTitleTooLong: string;
    errorAmount: string;
    errorAmountInvalid: string;
    errorAmountTooLarge: string;
    errorDayRange: string;
    errorDateInvalid: string;
    errorNotesTooLong: string;
  };
};

const MAX_TITLE = 100;
const MAX_NOTES = 500;
const MAX_AMOUNT = 1_000_000_000_000; // 1 trillion — sanity ceiling

export function validateTitle(value: string, t: ValidatorT): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return t.forms.errorTitle;
  if (trimmed.length > MAX_TITLE) return t.forms.errorTitleTooLong;
  return undefined;
}

export function validateAmount(value: string, t: ValidatorT): string | undefined {
  const normalized = toAsciiDigits(value).trim();
  if (!normalized) return t.forms.errorAmount;
  // Only digits, optional single decimal point
  if (!/^\d+(\.\d+)?$/.test(normalized)) return t.forms.errorAmountInvalid;
  const n = parseFloat(normalized);
  if (!isFinite(n) || isNaN(n)) return t.forms.errorAmountInvalid;
  if (n <= 0) return t.forms.errorAmount;
  if (n > MAX_AMOUNT) return t.forms.errorAmountTooLarge;
  return undefined;
}

export function validateDay(
  value: string,
  t: ValidatorT,
  required = false,
): string | undefined {
  const normalized = toAsciiDigits(value).trim();
  if (!normalized) return required ? t.forms.errorDayRange : undefined;
  if (!/^\d+$/.test(normalized)) return t.forms.errorDayRange;
  const n = parseInt(normalized, 10);
  if (!Number.isInteger(n) || n < 1 || n > 28) return t.forms.errorDayRange;
  return undefined;
}

export function validateDate(
  value: string,
  t: ValidatorT,
  required = false,
): string | undefined {
  const normalized = toAsciiDigits(value).trim();
  if (!normalized) return required ? t.forms.errorDateInvalid : undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return t.forms.errorDateInvalid;
  const [y, m, d] = normalized.split('-').map((x) => parseInt(x, 10));
  if (m < 1 || m > 12) return t.forms.errorDateInvalid;
  if (d < 1 || d > 31) return t.forms.errorDateInvalid;
  const dt = new Date(normalized);
  if (isNaN(dt.getTime()) || dt.getFullYear() !== y) return t.forms.errorDateInvalid;
  return undefined;
}

export function validateNotes(value: string, t: ValidatorT): string | undefined {
  if (!value) return undefined;
  if (value.length > MAX_NOTES) return t.forms.errorNotesTooLong;
  return undefined;
}

export const FIELD_LIMITS = {
  title: MAX_TITLE,
  notes: MAX_NOTES,
};
