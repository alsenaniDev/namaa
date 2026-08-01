import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type { DetectedExpense } from '../types';
import { readClipboardText, subscribeToClipboardChanges } from '../services/clipboardService';
import { parseBankMessage } from '../parser/parseBankMessage';
import { getProcessedEntry, markDismissed } from '../storage/processedStore';

export interface ClipboardExpenseDetection {
    /** The currently detected purchase awaiting the user's decision, if any. */
    detected: DetectedExpense | null;
    /**
     * A purchase that was already added before and is being seen again. Surfaced
     * so the UI can tell the user "already added" instead of doing nothing.
     */
    duplicate: DetectedExpense | null;
    /** Marks the detection processed and clears it (used on "cancel"). */
    dismiss: () => Promise<void>;
    /**
     * Marks the detection processed, clears it, and returns it so the caller can
     * proceed to the review screen (used on "continue").
     */
    accept: () => Promise<DetectedExpense | null>;
    /** Clears the "already added" notice. */
    dismissDuplicate: () => void;
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
    // The last already-added fingerprint we notified about, so a passive check
    // (app launch / foreground) doesn't nag repeatedly about a lingering clipboard.
    const notifiedFingerprintRef = useRef<string | null>(null);

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

                const parsed = parseBankMessage(text);
                if (!parsed) return;

                const entry = await getProcessedEntry(parsed.fingerprint);
                if (!mountedRef.current) return;

                if (entry?.status === 'added') {
                    // An expense was already created from this message. Tell the user
                    // rather than doing nothing. A deliberate re-copy always informs; a
                    // passive check informs only once per distinct message so it doesn't
                    // nag about a message that simply stays on the clipboard.
                    if (options?.deliberate || notifiedFingerprintRef.current !== parsed.fingerprint) {
                        notifiedFingerprintRef.current = parsed.fingerprint;
                        setDuplicate((prev) =>
                            prev && prev.fingerprint === parsed.fingerprint ? prev : parsed,
                        );
                    }
                    return;
                }

                if (entry?.status === 'dismissed' && !options?.deliberate) {
                    // The user already declined this one; don't re-nag on a passive
                    // check. A deliberate re-copy (below) still resurfaces the popup.
                    return;
                }

                // No record, or the user deliberately re-copied a previously dismissed
                // message — surface the review popup. Preserve the existing object
                // reference when the same message is re-detected (e.g. the mount check
                // and the AppState "active" listener both firing at launch) so the
                // modal's entrance animation isn't needlessly replayed.
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
                // SMS to copy again). Reset the "already notified" guard so the next
                // return can inform about an already-added message once more. We use
                // 'background' — not 'inactive' — because the iOS paste-permission
                // prompt only causes 'inactive', and resetting then would be wrong.
                notifiedFingerprintRef.current = null;
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

    return { detected, duplicate, dismiss, accept, dismissDuplicate };
}
