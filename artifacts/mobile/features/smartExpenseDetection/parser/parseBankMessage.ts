import { toAsciiDigits } from '@/utils/format';
import type { DetectedExpense } from '../types';
import { computeFingerprint } from './fingerprint';
import { suggestCategory } from './categoryMapper';

/**
 * Keywords that signal a *purchase* (as opposed to a deposit, transfer or
 * balance alert). At least one must be present for the text to be treated as a
 * purchase transaction — this keeps deposits/salary messages from being parsed
 * as expenses.
 */
const PURCHASE_KEYWORDS = [
    'شراء', 'عملية شراء', 'مشتريات', 'نقاط البيع', 'نقاط بيع',
    'purchase', 'pos', 'point of sale',
];

/**
 * Supported currencies mapped to the textual tokens a bank might print. The
 * first token that resolves an adjacent amount wins.
 */
const CURRENCY_TOKENS: { code: string; patterns: string[] }[] = [
    { code: 'SAR', patterns: ['SAR', 'ر.س', 'ريال', 'رس'] },
    { code: 'AED', patterns: ['AED', 'د.إ', 'درهم'] },
    { code: 'KWD', patterns: ['KWD', 'د.ك'] },
    { code: 'BHD', patterns: ['BHD', 'د.ب'] },
    { code: 'QAR', patterns: ['QAR', 'ر.ق'] },
    { code: 'OMR', patterns: ['OMR', 'ر.ع'] },
    { code: 'EGP', patterns: ['EGP', 'ج.م'] },
    { code: 'USD', patterns: ['USD', 'دولار', '$'] },
    { code: 'EUR', patterns: ['EUR', 'يورو', '€'] },
    { code: 'GBP', patterns: ['GBP', '£'] },
];

/** Payment-method detectors, ordered from most to least specific. */
const PAYMENT_METHODS: { match: RegExp; label: string }[] = [
    { match: /apple\s*pay|ابل\s*باي|آبل\s*باي/i, label: 'Apple Pay' },
    { match: /google\s*pay|جوجل\s*باي/i, label: 'Google Pay' },
    { match: /stc\s*pay/i, label: 'STC Pay' },
    { match: /master\s*card|ماستر\s*كارد|ماستركارد/i, label: 'Mastercard' },
    { match: /visa|فيزا/i, label: 'Visa' },
    { match: /مدى|\bmada\b/i, label: 'مدى' },
];

const ESCAPE_REGEX = /[.*+?^${}()|[\]\\]/g;
function escapeRegExp(value: string): string {
    return value.replace(ESCAPE_REGEX, '\\$&');
}

/** Parses a numeric string that may contain thousands separators. */
function parseAmount(raw: string): number | null {
    const cleaned = raw.replace(/,/g, '').trim();
    const value = parseFloat(cleaned);
    if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) return null;
    return value;
}

interface AmountMatch {
    amount: number;
    currency: string;
    index: number;
}

/**
 * Collects every positive amount+currency pair in `text`, remembering where
 * each one occurred so callers can pick by reading order.
 */
function collectAmounts(text: string): AmountMatch[] {
    const results: AmountMatch[] = [];
    for (const { code, patterns } of CURRENCY_TOKENS) {
        for (const pattern of patterns) {
            const token = escapeRegExp(pattern);
            // Currency before amount, e.g. "SAR 68" or "بـSAR 35.5".
            const beforeRe = new RegExp(`${token}\\s*([0-9][0-9.,]*)`, 'gi');
            // Amount before currency, e.g. "68 SAR".
            const afterRe = new RegExp(`([0-9][0-9.,]*)\\s*${token}`, 'gi');
            let match: RegExpExecArray | null;
            while ((match = beforeRe.exec(text)) !== null) {
                const amount = parseAmount(match[1]);
                if (amount !== null) results.push({ amount, currency: code, index: match.index });
            }
            while ((match = afterRe.exec(text)) !== null) {
                const amount = parseAmount(match[1]);
                if (amount !== null) results.push({ amount, currency: code, index: match.index });
            }
        }
    }
    return results;
}

/**
 * Labels that mark the *total amount actually charged* to the account. On a
 * foreign-currency purchase the bank prints the original amount (e.g. "25 USD")
 * plus the settled total in the account currency (e.g. "95.8 SAR"). The settled
 * total is what leaves the account, so it takes priority.
 */
const TOTAL_AMOUNT_LABELS = [
    'إجمالي المبلغ المستحق', 'إجمالى المبلغ المستحق',
    'اجمالي المبلغ المستحق', 'اجمالى المبلغ المستحق',
    'إجمالي المبلغ', 'إجمالى المبلغ', 'اجمالي المبلغ', 'اجمالى المبلغ',
    'المبلغ الإجمالي', 'المبلغ الاجمالي',
    'المبلغ المستحق',
    'total amount due', 'total amount', 'amount due', 'grand total', 'total',
];

/** Returns the amount+currency printed right after a "total charged" label. */
function extractLabeledTotal(text: string): { amount: number; currency: string } | null {
    const lower = text.toLowerCase();
    for (const label of TOTAL_AMOUNT_LABELS) {
        const idx = lower.indexOf(label.toLowerCase());
        if (idx === -1) continue;
        // Only look at the remainder of the label's own line.
        const segment = text.slice(idx + label.length).split(/\r?\n/)[0];
        const [first] = collectAmounts(segment).sort((a, b) => a.index - b.index);
        if (first) return { amount: first.amount, currency: first.currency };
    }
    return null;
}

/**
 * Extracts the amount and currency actually charged. Prefers an explicit
 * "total amount due" (the settled amount in the account currency); otherwise
 * falls back to the first positive amount in reading order.
 */
function extractAmountAndCurrency(text: string): { amount: number; currency: string } | null {
    const total = extractLabeledTotal(text);
    if (total) return total;

    const all = collectAmounts(text).sort((a, b) => a.index - b.index);
    if (!all.length) return null;
    return { amount: all[0].amount, currency: all[0].currency };
}

/** Extracts the payment method label(s), joined when several are present. */
function extractPaymentMethod(text: string): string | undefined {
    const labels = PAYMENT_METHODS.filter(({ match }) => match.test(text)).map(({ label }) => label);
    return labels.length ? Array.from(new Set(labels)).join(' · ') : undefined;
}

/** Extracts the last four digits of the card / terminal, when present. */
function extractCardLastFour(text: string): string | undefined {
    const match = text.match(/(?:عبر|بطاقة|بطاقه|card|ending|منتهية)\s*[:#\-]?\s*[*xX]*\s*(\d{3,6})/i)
        ?? text.match(/[*xX]{2,}\s*(\d{4})/);
    if (!match) return undefined;
    return match[1].slice(-4);
}

/** Expands a 2-digit year to a full year (assumes the 2000s). */
function normalizeYear(year: number): number {
    return year < 100 ? year + 2000 : year;
}

/**
 * Builds a `Date` from components, returning `null` when the values don't form a
 * real calendar date (guards against month/day overflow rollover).
 */
function buildDate(year: number, month: number, day: number, hour: number, minute: number): Date | null {
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(year, month - 1, day, hour, minute);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
    }
    return date;
}

/**
 * Extracts a transaction date/time, defaulting to "now" when absent/invalid.
 *
 * Bank SMS use two common short formats that are ambiguous with a 2-digit year:
 * `DD/MM/YY` (day-first) and `YY/MM/DD` (used by Saudi banks, e.g. Al Rajhi).
 * Since a purchase always happened in the past, we try both orderings and pick
 * the first interpretation that is a valid, non-future date.
 */
function extractDate(text: string): Date {
    const match = text.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})(?:[\s,T]+(\d{1,2}):(\d{2}))?/);
    if (!match) return new Date();

    const a = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const c = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    if (hour > 23 || minute > 59) return new Date();

    // A 4-digit third group is unambiguously the year → DD/MM/YYYY.
    const fourDigitYear = match[3].length === 4;
    const candidates: Array<Date | null> = fourDigitYear
        ? [buildDate(c, month, a, hour, minute)]
        : [
            buildDate(normalizeYear(c), month, a, hour, minute), // DD/MM/YY (day-first)
            buildDate(normalizeYear(a), month, c, hour, minute), // YY/MM/DD (Saudi banks)
        ];

    // Allow a small skew tolerance so a message stamped slightly ahead of the
    // device clock isn't rejected.
    const futureLimit = Date.now() + 24 * 60 * 60 * 1000;
    const nonFuture = candidates.find((d) => d !== null && d.getTime() <= futureLimit);
    if (nonFuture) return nonFuture;

    // No non-future interpretation — fall back to the first valid one, else now.
    return candidates.find((d): d is Date => d !== null) ?? new Date();
}

const MERCHANT_MARKER = /(?:^|\s)(?:لـ|لدى|من|@|at|from)\s*[:：]?\s*([^\n]+)/i;

/** Strips known markers/punctuation from a raw merchant fragment. */
function cleanMerchant(raw: string): string {
    return raw
        .replace(/^(?:لـ|لدى|من|@|at|from)\s*/i, '')
        .replace(/^[:：\-\s]+/, '') // drop leading separators (e.g. "لدى:" residue)
        .replace(/[;،,].*$/, '') // drop anything after a separator
        .trim();
}

/** Returns true when a line is metadata rather than a merchant name. */
function isMetadataLine(line: string): boolean {
    const lower = line.toLowerCase();
    const isKeyword = PURCHASE_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
    const hasAmount = extractAmountAndCurrency(line) !== null;
    const isDate = /\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}/.test(line);
    const isCardOrPayment = /عبر|مدى|بطاقة|بطاقه|card|apple\s*pay|ابل\s*باي|visa|فيزا|master/i.test(line);
    return isKeyword || hasAmount || isDate || isCardOrPayment;
}

/** Extracts the merchant name, preferring an explicit "لـ / لدى / at" marker. */
function extractMerchant(originalText: string, asciiText: string): string | undefined {
    const marked = asciiText.match(MERCHANT_MARKER);
    if (marked) {
        const merchant = cleanMerchant(marked[1]);
        if (merchant) return merchant;
    }
    // Fallback: the first content line that is not recognizable metadata.
    const lines = originalText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const candidate = lines.find((line) => !isMetadataLine(line));
    return candidate ? cleanMerchant(candidate) : undefined;
}

/**
 * Parses clipboard text into a {@link DetectedExpense}. Returns `null` when the
 * text is not recognizable as a bank purchase transaction.
 *
 * All processing is local; the input is never transmitted anywhere.
 */
export function parseBankMessage(text: string): DetectedExpense | null {
    if (!text || !text.trim()) return null;

    const asciiText = toAsciiDigits(text);
    const lower = asciiText.toLowerCase();

    // 1) Must look like a purchase.
    const isPurchase = PURCHASE_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
    if (!isPurchase) return null;

    // 2) Must have a recognizable amount + currency.
    const money = extractAmountAndCurrency(asciiText);
    if (!money) return null;

    // 3) Must have a merchant to attribute the expense to.
    const merchant = extractMerchant(text, asciiText);
    if (!merchant) return null;

    return {
        amount: money.amount,
        currency: money.currency,
        merchant,
        paymentMethod: extractPaymentMethod(asciiText),
        cardLastFourDigits: extractCardLastFour(asciiText),
        transactionDate: extractDate(asciiText),
        originalText: text,
        fingerprint: computeFingerprint(text),
        suggestedCategory: suggestCategory(merchant),
    };
}
