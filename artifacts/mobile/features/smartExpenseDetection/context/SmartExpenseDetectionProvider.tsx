import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, InteractionManager, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useT } from '@/hooks/useT';
import { useDir } from '@/hooks/useDir';
import { DetectedExpenseModal } from '../components/DetectedExpenseModal';
import { useClipboardExpenseDetection } from '../hooks/useClipboardExpenseDetection';
import type { DetectedExpense } from '../types';

interface SmartExpenseDetectionContextValue {
    /** The detection the user chose to review; consumed by the review screen. */
    pending: DetectedExpense | null;
    /** Clears the pending detection once the review screen is done with it. */
    clearPending: () => void;
}

const SmartExpenseDetectionContext = createContext<SmartExpenseDetectionContextValue | null>(null);

const TOAST_VISIBLE_MS = 2600;

type ToastVariant = 'alreadyAdded' | 'unsupported';

/**
 * Transient banner explaining why a copied message produced no popup: either it
 * was already added, or it's a bank message we can't add automatically (e.g. a
 * transfer). Auto-dismisses after a short delay.
 */
function DetectionToast({ variant, show, onHide }: { variant: ToastVariant; show: boolean; onHide: () => void }) {
    const colors = useColors();
    const dir = useDir();
    const t = useT();
    const insets = useSafeAreaInsets();
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-12)).current;

    const config =
        variant === 'alreadyAdded'
            ? {
                icon: 'check-circle' as const,
                tint: colors.primary,
                title: t.smartDetection.alreadyAddedTitle,
                text: t.smartDetection.alreadyAddedText,
            }
            : {
                icon: 'alert-circle' as const,
                tint: colors.warning,
                title: t.smartDetection.unsupportedTitle,
                text: t.smartDetection.unsupportedText,
            };

    useEffect(() => {
        if (!show) return;
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 90 }),
        ]).start();
        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: -12, duration: 200, useNativeDriver: true }),
            ]).start(({ finished }) => {
                if (finished) onHide();
            });
        }, TOAST_VISIBLE_MS);
        return () => clearTimeout(timer);
    }, [show, opacity, translateY, onHide]);

    if (!show) return null;

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.toast,
                {
                    top: insets.top + 10,
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    flexDirection: dir.row,
                    opacity,
                    transform: [{ translateY }],
                },
            ]}
        >
            <View style={[styles.toastIcon, { backgroundColor: config.tint + '1A' }]}>
                <Feather name={config.icon} size={18} color={config.tint} />
            </View>
            <View style={styles.toastTextWrap}>
                <Text style={[styles.toastTitle, { color: colors.foreground, textAlign: dir.textAlign }]}>
                    {config.title}
                </Text>
                <Text style={[styles.toastDesc, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>
                    {config.text}
                </Text>
            </View>
        </Animated.View>
    );
}

/**
 * Wires clipboard detection into the app: runs the detection hook, shows the
 * "purchase detected" modal, and — on continue — hands the parsed expense to
 * the review screen via context.
 *
 * Enabled by default; only disabled when the user explicitly turns the setting
 * off (`clipboardDetectionEnabled === false`) or before onboarding completes.
 */
export function SmartExpenseDetectionProvider({ children }: { children: React.ReactNode }) {
    const { userProfile } = useApp();
    const router = useRouter();
    const enabled = !!userProfile && userProfile.clipboardDetectionEnabled !== false;

    const { detected, duplicate, unsupported, dismiss, accept, dismissDuplicate, dismissUnsupported } =
        useClipboardExpenseDetection(enabled);
    const [pending, setPending] = useState<DetectedExpense | null>(null);

    const handleContinue = useCallback(async () => {
        const current = await accept();
        if (!current) return;
        setPending(current);
        // Closing the detection popup (via accept → setDetected(null)) dismisses an
        // RN <Modal>. Presenting the review screen in the same frame is dropped on
        // iOS ("nothing happens"), so we navigate only after that dismissal and the
        // setPending state have settled.
        InteractionManager.runAfterInteractions(() => {
            router.push('/expenses/review');
        });
    }, [accept, router]);

    const clearPending = useCallback(() => setPending(null), []);

    return (
        <SmartExpenseDetectionContext.Provider value={{ pending, clearPending }}>
            {children}
            <DetectedExpenseModal detected={detected} onCancel={dismiss} onContinue={handleContinue} />
            <DetectionToast variant="alreadyAdded" show={!!duplicate} onHide={dismissDuplicate} />
            <DetectionToast variant="unsupported" show={unsupported} onHide={dismissUnsupported} />
        </SmartExpenseDetectionContext.Provider>
    );
}

/** Access the pending detected expense (used by the review screen). */
export function usePendingDetectedExpense(): SmartExpenseDetectionContextValue {
    const ctx = useContext(SmartExpenseDetectionContext);
    if (!ctx) {
        throw new Error('usePendingDetectedExpense must be used within SmartExpenseDetectionProvider');
    }
    return ctx;
}

const styles = StyleSheet.create({
    toast: {
        position: 'absolute',
        left: 16,
        right: 16,
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6,
    },
    toastIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    toastTextWrap: { flex: 1 },
    toastTitle: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', marginBottom: 2 },
    toastDesc: { fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 18 },
});

