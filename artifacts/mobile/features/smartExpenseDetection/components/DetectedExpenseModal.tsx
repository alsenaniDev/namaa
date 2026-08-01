import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useT } from '@/hooks/useT';
import { formatCurrency } from '@/utils/format';
import type { DetectedExpense } from '../types';

interface DetectedExpenseModalProps {
    detected: DetectedExpense | null;
    onCancel: () => void;
    onContinue: () => void;
}

/**
 * Popup shown when a purchase message is detected on the clipboard. It presents
 * a short preview (amount + merchant) and lets the user cancel or continue to
 * the review screen. Nothing is saved from here.
 */
export function DetectedExpenseModal({ detected, onCancel, onContinue }: DetectedExpenseModalProps) {
    const colors = useColors();
    const dir = useDir();
    const t = useT();
    const scale = useRef(new Animated.Value(0.9)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    // Tracks which detection the entrance animation has already played for, so a
    // re-render with the same detection doesn't replay (or flicker) the animation.
    const animatedForRef = useRef<string | null>(null);

    useEffect(() => {
        if (!detected) {
            animatedForRef.current = null;
            return;
        }
        if (animatedForRef.current === detected.fingerprint) return;
        animatedForRef.current = detected.fingerprint;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        scale.setValue(0.9);
        opacity.setValue(0);
        Animated.parallel([
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
            Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]).start();
    }, [detected, opacity, scale]);

    if (!detected) return null;

    return (
        <Modal visible transparent animationType="none" onRequestClose={onCancel}>
            <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
                <Animated.View
                    style={[
                        styles.card,
                        { backgroundColor: colors.card, borderColor: colors.primary + '40', opacity, transform: [{ scale }] },
                    ]}
                >
                    <View style={[styles.iconHalo, { backgroundColor: colors.primary + '18' }]}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                            <Feather name="shopping-bag" size={28} color="#fff" />
                        </View>
                    </View>

                    <Text style={[styles.title, { color: colors.foreground }]}>{t.smartDetection.modalTitle}</Text>
                    <Text style={[styles.desc, { color: colors.mutedForeground }]}>{t.smartDetection.modalDesc}</Text>

                    <View style={[styles.preview, { backgroundColor: colors.muted, flexDirection: dir.row }]}>
                        <Text style={[styles.previewAmount, { color: colors.primary }]} numberOfLines={1}>
                            {formatCurrency(detected.amount, detected.currency)}
                        </Text>
                        <Text style={[styles.previewMerchant, { color: colors.foreground, textAlign: dir.textAlign }]} numberOfLines={1}>
                            {detected.merchant}
                        </Text>
                    </View>

                    <View style={[styles.actions, { flexDirection: dir.row }]}>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={onCancel}
                            style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                        >
                            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>{t.common.cancel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={onContinue}
                            style={[styles.button, { backgroundColor: colors.primary }]}
                        >
                            <Text style={styles.continueText}>{t.smartDetection.continue}</Text>
                            <Feather name={dir.isRTL ? 'arrow-left' : 'arrow-right'} size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
    card: { width: '100%', maxWidth: 380, borderRadius: 22, borderWidth: 1, padding: 22, alignItems: 'center' },
    iconHalo: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 18, fontFamily: 'Cairo_700Bold', textAlign: 'center', marginBottom: 6 },
    desc: { fontSize: 13.5, fontFamily: 'Cairo_400Regular', textAlign: 'center', lineHeight: 21, marginBottom: 16 },
    preview: { width: '100%', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 18, gap: 12 },
    previewAmount: { fontSize: 16, fontFamily: 'Cairo_700Bold', flexShrink: 0 },
    previewMerchant: { flex: 1, fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
    actions: { width: '100%', gap: 10 },
    button: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
    cancelButton: { borderWidth: 1.5 },
    cancelText: { fontSize: 15, fontFamily: 'Cairo_600SemiBold' },
    continueText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#fff' },
});
