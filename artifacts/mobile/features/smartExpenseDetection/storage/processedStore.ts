import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local, on-device record of clipboard bank messages the user has already seen,
 * used to decide what to do the next time the same message is detected.
 *
 * Each entry has a status:
 *  - `'added'`    — an expense was created from it. Linked to that expense via
 *                   `expenseId`, so deleting the expense un-records it and the
 *                   message can be added again. Re-detecting shows an
 *                   "already added" notice.
 *  - `'dismissed'`— the user saw the suggestion and declined (or opened the
 *                   review screen but didn't save). It is *not* "added", so it
 *                   never shows the "already added" notice and a deliberate
 *                   re-copy resurfaces the popup.
 *
 * Namespaced under the app's existing `@mali/` AsyncStorage prefix. The `_v2`
 * suffix supersedes an earlier format whose entries couldn't distinguish
 * "added" from "dismissed" (which caused stale "already added" notices).
 */
const PROCESSED_KEY = '@mali/smart_expense_processed_v2';

/** Keep the list bounded so it can never grow without limit. */
const MAX_ENTRIES = 300;

export type ProcessedStatus = 'added' | 'dismissed';

export interface ProcessedEntry {
    /** The clipboard message fingerprint. */
    fp: string;
    /** What happened with this message. */
    status: ProcessedStatus;
    /** The id of the expense created from this detection (only for `'added'`). */
    expenseId?: string;
}

async function readEntries(): Promise<ProcessedEntry[]> {
    try {
        const raw = await AsyncStorage.getItem(PROCESSED_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((v): ProcessedEntry | null => {
                if (!v || typeof v.fp !== 'string') return null;
                const status: ProcessedStatus = v.status === 'added' ? 'added' : 'dismissed';
                const expenseId = typeof v.expenseId === 'string' ? v.expenseId : undefined;
                return expenseId ? { fp: v.fp, status, expenseId } : { fp: v.fp, status };
            })
            .filter((v): v is ProcessedEntry => v !== null);
    } catch {
        return [];
    }
}

async function writeEntries(entries: ProcessedEntry[]): Promise<void> {
    await AsyncStorage.setItem(PROCESSED_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
}

/** Returns the stored entry for a fingerprint, or `null` when none exists. */
export async function getProcessedEntry(fingerprint: string): Promise<ProcessedEntry | null> {
    const entries = await readEntries();
    return entries.find((e) => e.fp === fingerprint) ?? null;
}

async function upsert(entry: ProcessedEntry): Promise<void> {
    try {
        const entries = await readEntries();
        const filtered = entries.filter((e) => e.fp !== entry.fp);
        filtered.push(entry);
        await writeEntries(filtered);
    } catch {
        // Non-fatal: failing to persist only risks re-showing the popup later.
    }
}

/**
 * Records that an expense was created from this message, linking it to the
 * created expense so a later delete can un-record it.
 */
export async function markAdded(fingerprint: string, expenseId: string): Promise<void> {
    await upsert({ fp: fingerprint, status: 'added', expenseId });
}

/**
 * Records that the user saw this message and declined (or didn't save). Does not
 * overwrite an existing `'added'` entry — a dismissal must never mask the fact
 * that an expense already exists.
 */
export async function markDismissed(fingerprint: string): Promise<void> {
    const existing = await getProcessedEntry(fingerprint);
    if (existing?.status === 'added') return;
    await upsert({ fp: fingerprint, status: 'dismissed' });
}

/** Removes a fingerprint's record entirely (e.g. to resurface it deliberately). */
export async function clearFingerprint(fingerprint: string): Promise<void> {
    try {
        const entries = await readEntries();
        const next = entries.filter((e) => e.fp !== fingerprint);
        if (next.length !== entries.length) await writeEntries(next);
    } catch {
        // Non-fatal.
    }
}

/**
 * Removes any `'added'` record linked to the given expense id, so the
 * originating bank message can be detected and added again. Called when an
 * expense created from a detection is deleted.
 */
export async function unmarkByExpenseId(expenseId: string): Promise<void> {
    try {
        const entries = await readEntries();
        const next = entries.filter((e) => e.expenseId !== expenseId);
        if (next.length !== entries.length) await writeEntries(next);
    } catch {
        // Non-fatal.
    }
}
