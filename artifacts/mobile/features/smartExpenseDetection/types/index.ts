import type { ExpenseCategory } from '@/types';

/**
 * A purchase transaction extracted locally from clipboard text (bank SMS /
 * push notification). Everything here is derived on-device — no network calls.
 */
export interface DetectedExpense {
    /** Purchase amount as a positive number. */
    amount: number;
    /** ISO-4217-style currency code (e.g. `SAR`, `USD`). Falls back to `SAR`. */
    currency: string;
    /** Merchant / beneficiary name as printed in the message. */
    merchant: string;
    /** Human-readable payment method (e.g. `مدى-ابل باي`, `Visa`). */
    paymentMethod?: string;
    /** Last four digits of the card / terminal, when present. */
    cardLastFourDigits?: string;
    /** Parsed transaction date; defaults to "now" when the message omits one. */
    transactionDate: Date;
    /** The original, unmodified clipboard text. Never leaves the device. */
    originalText: string;
    /** Stable hash of the normalized text — used for duplicate prevention. */
    fingerprint: string;
    /**
     * Best-effort expense category suggestion. Always a valid built-in
     * {@link ExpenseCategory} so it can be reused directly by the expense model.
     */
    suggestedCategory: ExpenseCategory;
}
