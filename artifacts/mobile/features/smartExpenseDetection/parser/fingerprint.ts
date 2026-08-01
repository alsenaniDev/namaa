import { toAsciiDigits } from '@/utils/format';

/**
 * Normalizes clipboard text so that visually-identical messages produce the
 * same fingerprint: converts Arabic-Indic digits to ASCII, collapses all
 * whitespace runs to a single space, trims, and lowercases.
 */
export function normalizeForFingerprint(text: string): string {
    return toAsciiDigits(text).replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Computes a compact, deterministic fingerprint for a piece of text using the
 * FNV-1a 32-bit hash. This is used purely for local duplicate detection, so a
 * non-cryptographic hash is sufficient and keeps storage tiny.
 */
export function computeFingerprint(text: string): string {
    const normalized = normalizeForFingerprint(text);
    let hash = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < normalized.length; i++) {
        hash ^= normalized.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193); // FNV prime
    }
    // Coerce to an unsigned 32-bit integer and render as fixed-width hex.
    return (hash >>> 0).toString(16).padStart(8, '0');
}
