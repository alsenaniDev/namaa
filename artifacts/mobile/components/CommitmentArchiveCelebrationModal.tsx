import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';

interface CommitmentArchiveCelebrationModalProps {
  visible: boolean;
  kicker: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CommitmentArchiveCelebrationModal({
  visible,
  kicker,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: CommitmentArchiveCelebrationModalProps) {
  const colors = useColors();
  const dir = useDir();
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!visible) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.setValue(0.9);
    opacity.setValue(0);
    lift.setValue(12);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 88 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(lift, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [lift, opacity, scale, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.success + '55',
              opacity,
              transform: [{ scale }, { translateY: lift }],
            },
          ]}
        >
          <View style={[styles.iconStage, { backgroundColor: colors.success + '12' }]}>
            <View style={[styles.spark, styles.sparkTop, { backgroundColor: colors.warning }]} />
            <View style={[styles.spark, styles.sparkSide, { backgroundColor: colors.commitment }]} />
            <View style={[styles.iconCircle, { backgroundColor: colors.success }]}>
              <Feather name="gift" size={32} color="#fff" />
            </View>
            <View style={[styles.starBadge, { backgroundColor: colors.warning }]}>
              <Feather name="star" size={13} color="#fff" />
            </View>
          </View>

          <Text style={[styles.kicker, { color: colors.success }]}>{kicker}</Text>
          <Text style={[styles.title, { color: colors.foreground, textAlign: 'center' }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.mutedForeground, textAlign: 'center' }]}>{message}</Text>

          <View style={[styles.actions, { flexDirection: dir.row }]}>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={onCancel}
              style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <Text style={[styles.secondaryText, { color: colors.mutedForeground }]}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={onConfirm}
              style={[styles.primaryButton, { backgroundColor: colors.success }]}
            >
              <Text style={styles.primaryText}>{confirmLabel}</Text>
              <Feather name="archive" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: {
    width: '100%',
    maxWidth: 390,
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  iconStage: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBadge: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    right: 18,
    bottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  spark: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  sparkTop: { top: 16, left: 28 },
  sparkSide: { top: 36, right: 12 },
  kicker: { fontSize: 12, fontFamily: 'Cairo_700Bold', marginBottom: 5 },
  title: { fontSize: 21, fontFamily: 'Cairo_700Bold', marginBottom: 7 },
  message: { fontSize: 13, fontFamily: 'Cairo_400Regular', lineHeight: 23, marginBottom: 18 },
  actions: { width: '100%', gap: 10 },
  primaryButton: {
    flex: 1.25,
    minHeight: 48,
    borderRadius: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 0.9,
    minHeight: 48,
    borderRadius: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primaryText: { color: '#fff', fontSize: 13, fontFamily: 'Cairo_700Bold', textAlign: 'center' },
  secondaryText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', textAlign: 'center' },
});
