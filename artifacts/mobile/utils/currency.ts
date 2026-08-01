/**
 * Offline currency conversion using fixed reference rates.
 *
 * The app is fully offline, so live FX rates aren't available. The Gulf
 * currencies most users will encounter (SAR, AED, BHD, OMR, QAR, KWD) are
 * pegged, so their rates are effectively constant; the remaining rates are
 * reasonable approximations used only to pre-fill an editable amount — the user
 * can always adjust it on the review screen before saving.
 *
 * Rates are expressed as "units of the currency per 1 USD".
 */
const USD_RATES: Record<string, number> = {
  USD: 1,
  // Pegged Gulf currencies (official pegs).
  SAR: 3.75,
  AED: 3.6725,
  QAR: 3.64,
  BHD: 0.376,
  OMR: 0.3845,
  KWD: 0.3068,
  // Approximate (floating) — pre-fill only.
  EGP: 48,
  EUR: 0.92,
  GBP: 0.79,
};

/** True when a fixed reference rate is known for the given currency code. */
export function canConvert(currency: string): boolean {
  return currency in USD_RATES;
}

/**
 * Converts `amount` from one currency to another using the fixed reference
 * rates. Returns `null` when either currency is unknown, so callers can fall
 * back to the original amount.
 *
 * The result is rounded to two decimals.
 */
export function convertCurrency(amount: number, from: string, to: string): number | null {
  if (from === to) return amount;
  const fromRate = USD_RATES[from];
  const toRate = USD_RATES[to];
  if (!fromRate || !toRate || !Number.isFinite(amount)) return null;
  const converted = (amount / fromRate) * toRate;
  return Math.round(converted * 100) / 100;
}
