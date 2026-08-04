import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

/** What the user picked: a fixed theme, or "follow the device". */
export type ThemePreference = 'light' | 'dark' | 'system';
/** The concrete palette that ends up being applied. */
export type ResolvedScheme = 'light' | 'dark';

const THEME_KEY = '@mali/theme';

interface ThemeContextValue {
    /** The user's stored choice. */
    preference: ThemePreference;
    /** The effective palette after resolving `system` against the device. */
    scheme: ResolvedScheme;
    /** Persist a new choice and apply it immediately. */
    setPreference: (preference: ThemePreference) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Stores the user's light/dark preference on-device and resolves it against the
 * system appearance when set to `system`. Consumed by {@link useColors} so the
 * whole app re-themes instantly when the choice changes — no reload required.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const system = useColorScheme();
    const [preference, setPref] = useState<ThemePreference>('system');

    useEffect(() => {
        AsyncStorage.getItem(THEME_KEY)
            .then((value) => {
                if (value === 'light' || value === 'dark' || value === 'system') setPref(value);
            })
            .catch(() => { });
    }, []);

    const setPreference = useCallback(async (next: ThemePreference) => {
        setPref(next);
        try {
            await AsyncStorage.setItem(THEME_KEY, next);
        } catch {
            // Best-effort; keep the in-memory choice even if persistence fails.
        }
    }, []);

    const scheme: ResolvedScheme =
        preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

    return (
        <ThemeContext.Provider value={{ preference, scheme, setPreference }}>
            {children}
        </ThemeContext.Provider>
    );
}

/** Access the theme preference and setter (used by the settings screen). */
export function useThemePreference(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useThemePreference must be used within ThemeProvider');
    return ctx;
}
