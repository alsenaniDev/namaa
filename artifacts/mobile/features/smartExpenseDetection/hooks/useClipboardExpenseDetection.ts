import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type { DetectedExpense } from '../types';
import { readClipboardText, subscribeToClipboardChanges } from '../services/clipboardService';
import { classifyBankMessage } from '../parser/parseBankMessage';
import { getProcessedEntry, markDismissed } from '../storage/processedStore';

export interface ClipboardExpenseDetection {
    /** The currently detected purchase awaiting the user's decision, if any. */
    detected: DetectedExpense | null;
    /**
     * A purchase that was already added before and is being seen again. Surfaced
     * so the UI can tell the user "already added" instead of doing nothing.
     */
    duplicate: DetectedExpense | null;
    /**
     * True when the clipboard holds a bank message we recognize but can't add
     * automatically (e.g. a transfer or deposit). Surfaced so the UI can tell the
     * user why nothing was added instead of doing nothing.
     */
    unsupported: boolean;
    /** Marks the detection processed and clears it (used on "cancel"). */
    dismiss: () => Promise<void>;
    /**
     * Marks the detection processed, clears it, and returns it so the caller can
     * proceed to the review screen (used on "continue").
     */
    accept: () => Promise<DetectedExpense | null>;
    /** Clears the "already added" notice. */
    dismissDuplicate: () => void;
    /** Clears the "unsupported message" notice. */
    dismissUnsupported: () => void;
}

/**
 * Watches the clipboard for bank purchase messages and surfaces them for the
 * user to review.
 *
 * Detection runs:
 *  - once when the hook mounts (app start), and
 *  - every time the app returns to the foreground.
 *
 * A detection is surfaced only when it is enabled, the clipboard holds text
 * that parses as a purchase, and that exact message has not been processed
 * before. All work happens locally; clipboard content never leaves the device.
 */
export function useClipboardExpenseDetection(enabled: boolean): ClipboardExpenseDetection {
    const [detected, setDetected] = useState<DetectedExpense | null>(null);
    const [duplicate, setDuplicate] = useState<DetectedExpense | null>(null);
    const [unsupported, setUnsupported] = useState(false);
    // Guards against overlapping async checks and stale writes after unmount.
    const runningRef = useRef(false);
    const mountedRef = useRef(true);
    // Set when a check is requested while another is still in flight (e.g. the
    // first read is awaiting the iOS paste-permission prompt). Ensures we re-read
    // once that settles so a just-granted clipboard isn't missed.
    const rerunRef = useRef(false);
    // Remembers whether a queued rerun was requested by a deliberate copy, so the
    // "deliberate" intent survives being coalesced behind an in-flight check.
    const rerunDeliberateRef = useRef(false);
    // The last clipboard fingerprint we surfaced (popup, "already added" or
    // "unsupported" notice) this foreground session, so we don't re-show it on
    // every re-check. Cleared on background so returning with a (re)copied message
    // reliably re-surfaces.
    const handledFingerprintRef = useRef<string | null>(null);

    const runCheck = useCallback(
        async (options?: { deliberate?: boolean }) => {
            if (!enabled) return;
            if (runningRef.current) {
                rerunRef.current = true;
                if (options?.deliberate) rerunDeliberateRef.current = true;
                return;
            }
            runningRef.current = true;
            try {
                const text = await readClipboardText();
                if (!text) return;

                const result = classifyBankMessage(text);
                if (result.kind === 'none') return;

                if (result.kind === 'unsupported') {
                    // A bank message we can't add (transfer, deposit, fee…). Announce
                    // it, then guard against re-showing on every re-check this
                    // session. The guard clears on background, so returning to the
                    // app re-shows it without needing a reload.
                    if (handledFingerprintRef.current === result.fingerprint && !options?.deliberate) {
                        return;
                    }
                    if (!mountedRef.current) return;
                    handledFingerprintRef.current = result.fingerprint;
                    setUnsupported(true);
                    return;
                }

                const parsed = result.expense;

                // Skip only if we've already surfaced this exact clipboard content
                // during the current foreground session (avoids re-showing on every
                // re-check). A genuine new copy reported by the OS (`deliberate`)
                // always re-evaluates, and the guard is cleared on background so a
                // return with a (re)copied message reliably re-detects.
                if (handledFingerprintRef.current === parsed.fingerprint && !options?.deliberate) {
                    return;
                }

                const entry = await getProcessedEntry(parsed.fingerprint);
                if (!mountedRef.current) return;

                handledFingerprintRef.current = parsed.fingerprint;

                if (entry?.status === 'added') {
                    // An expense already exists for this message — inform the user
                    // ("already added") instead of silently doing nothing.
                    setDuplicate((prev) =>
                        prev && prev.fingerprint === parsed.fingerprint ? prev : parsed,
                    );
                    return;
                }

                // A new message, or one the user previously dismissed — offer it for
                // review. Preserve the existing object reference when the same message
                // is re-detected so the modal's entrance animation isn't replayed.
                setDetected((prev) =>
                    prev && prev.fingerprint === parsed.fingerprint ? prev : parsed,
                );
            } catch {
                // Detection is best-effort; never let it crash the app.
            } finally {
                runningRef.current = false;
                // A check was requested mid-flight (typically right after the user granted
                // the paste prompt) — run once more against the now-accessible clipboard.
                if (rerunRef.current && mountedRef.current && enabled) {
                    rerunRef.current = false;
                    const deliberate = rerunDeliberateRef.current;
                    rerunDeliberateRef.current = false;
                    void runCheck({ deliberate });
                }
            }
        },
        [enabled],
    );

    useEffect(() => {
        mountedRef.current = true;
        // Only clear an in-flight detection when the feature is turned off; keep it
        // visible across re-renders while enabled.
        if (!enabled) {
            setDetected(null);
            return () => {
                mountedRef.current = false;
            };
        }

        runCheck();
        const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active') {
                runCheck();
            } else if (state === 'background') {
                // Leaving the app is where a re-copy happens (switching to the bank
                // SMS to copy again). Clear the in-session guard so returning always
                // re-evaluates the clipboard and reliably re-surfaces a message. We
                // use 'background' — not 'inactive' — because the iOS paste-permission
                // prompt only causes 'inactive', and resetting then would be wrong.
                handledFingerprintRef.current = null;
            }
        });
        // A genuine new copy while the app is foreground is a deliberate action: if
        // the message was already added we inform the user ("already added"); if it
        // was deleted (and thus un-marked) it surfaces for adding again.
        const unsubscribeClipboard = subscribeToClipboardChanges(() => {
            void runCheck({ deliberate: true });
        });

        return () => {
            mountedRef.current = false;
            subscription.remove();
            unsubscribeClipboard();
        };
    }, [enabled, runCheck]);

    const dismiss = useCallback(async () => {
        if (detected) await markDismissed(detected.fingerprint);
        setDetected(null);
    }, [detected]);

    const accept = useCallback(async () => {
        const current = detected;
        // Mark as dismissed (not added) so a passive check won't re-open the popup
        // over the review screen. The review screen upgrades this to 'added' (with
        // the created expense id) only if the user actually saves.
        if (current) await markDismissed(current.fingerprint);
        setDetected(null);
        return current;
    }, [detected]);

    const dismissDuplicate = useCallback(() => setDuplicate(null), []);
    const dismissUnsupported = useCallback(() => setUnsupported(false), []);

    return { detected, duplicate, unsupported, dismiss, accept, dismissDuplicate, dismissUnsupported };
}
