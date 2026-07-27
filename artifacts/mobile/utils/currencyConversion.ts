// Offline defaults used to prefill the converter. The user can edit the rate
// before applying the converted amount, so the app stays usable without network.
const USD_VALUE_BY_CURRENCY: Record<string, number> = {
  USD: 1,
  SAR: 1 / 3.75,
  AED: 1 / 3.6725,
  QAR: 1 / 3.64,
  OMR: 2.6008,
  BHD: 1 / 0.376081,
  KWD: 1000 / 306.4,
  EGP: 1 / 50.77,
};

export function getDefaultExchangeRate(fromCurrency: string, toCurrency: string): number {
  const fromUsd = USD_VALUE_BY_CURRENCY[fromCurrency];
  const toUsd = USD_VALUE_BY_CURRENCY[toCurrency];
  if (!fromUsd || !toUsd) return 1;
  return fromUsd / toUsd;
}

export function formatRateForInput(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return '1';
  return Number(rate.toFixed(6)).toString();
}

export function formatAmountForInput(amount: number): string {
  if (!Number.isFinite(amount)) return '';
  return Number(amount.toFixed(2)).toString();
}
