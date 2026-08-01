import type * as ExpoClipboard from 'expo-clipboard';
import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Cached reference to the lazily-loaded `expo-clipboard` module.
 * - `undefined` → not attempted yet
 * - `null`      → native module unavailable (e.g. a dev client built before the
 *                 module was added); the feature degrades gracefully
 */
let cachedModule: typeof ExpoClipboard | null | undefined;

/**
 * Lazily resolves `expo-clipboard`.
 *
 * `expo-clipboard` calls `requireNativeModule('ExpoClipboard')` at import time,
 * which both reports to LogBox *and* throws synchronously when the native
 * module is missing from the running binary. We therefore first probe with
 * `requireOptionalNativeModule` — which returns `null` silently — and only
 * import `expo-clipboard` once the native module is confirmed present. This
 * keeps a stale/older dev client from surfacing a red-box; the feature simply
 * stays inactive until the client is rebuilt with the native module included.
 */
function getClipboard(): typeof ExpoClipboard | null {
    if (cachedModule !== undefined) return cachedModule;
    try {
        if (requireOptionalNativeModule('ExpoClipboard') == null) {
            cachedModule = null;
            return null;
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        cachedModule = require('expo-clipboard') as typeof ExpoClipboard;
    } catch {
        cachedModule = null;
    }
    return cachedModule;
}

/**
 * Reads plain text from the system clipboard.
 *
 * Returns `null` when clipboard access is unavailable, the clipboard is empty,
 * or it holds no string content. All access is local — clipboard content is
 * never transmitted off the device.
 */
export async function readClipboardText(): Promise<string | null> {
    try {
        const Clipboard = getClipboard();
        if (!Clipboard) return null;
        const hasString = await Clipboard.hasStringAsync();
        if (!hasString) return null;
        const text = await Clipboard.getStringAsync();
        return text && text.trim().length > 0 ? text : null;
    } catch {
        return null;
    }
}

/**
 * Subscribes to system clipboard changes.
 *
 * The callback fires when the clipboard content changes while the app is in the
 * foreground (backed by `UIPasteboard.changedNotification` on iOS), which is a
 * reliable signal for a *genuine new copy* — even when the copied text is
 * identical to something copied before. Returns an unsubscribe function; a no-op
 * unsubscribe is returned when clipboard access is unavailable.
 */
export function subscribeToClipboardChanges(onChange: () => void): () => void {
    const Clipboard = getClipboard();
    if (!Clipboard) return () => { };
    try {
        const subscription = Clipboard.addClipboardListener(() => onChange());
        return () => {
            try {
                subscription.remove();
            } catch {
                // Ignore teardown failures — the subscription is being discarded anyway.
            }
        };
    } catch {
        return () => { };
    }
}
