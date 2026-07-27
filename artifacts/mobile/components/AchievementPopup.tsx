import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { UserAchievement } from '@/types';
import { getAchievementMeta } from '@/utils/achievements';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useLanguage } from '@/context/LanguageContext';

interface AchievementPopupProps {
  achievement: UserAchievement | null;
  onDismiss: () => void;
}

export function AchievementPopup({ achievement, onDismiss }: AchievementPopupProps) {
  const colors = useColors();
  const dir = useDir();
  const { language } = useLanguage();
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!achievement) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.setValue(0.88);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [achievement, opacity, scale]);

  if (!achievement) return null;
  const meta = getAchievementMeta(achievement.id, language);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: meta.color + '55',
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <View style={[styles.iconHalo, { backgroundColor: meta.color + '18' }]}>
            <View style={[styles.iconCircle, { backgroundColor: meta.color }]}>
              <Feather name={meta.icon as any} size={30} color="#fff" />
            </View>
          </View>
          <Text style={[styles.kicker, { color: meta.color }]}>
            {language === 'en' ? 'Achievement unlocked' : 'تم فتح إنجاز'}
          </Text>
          <Text style={[styles.title, { color: colors.foreground, textAlign: 'center' }]}>{meta.title}</Text>
          <Text style={[styles.desc, { color: colors.mutedForeground, textAlign: 'center' }]}>{meta.description}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onDismiss}
            style={[styles.button, { backgroundColor: meta.color }]}
          >
            <Text style={styles.buttonText}>{language === 'en' ? 'Great' : 'رائع'}</Text>
            <Feather name={dir.isRTL ? 'arrow-left' : 'arrow-right'} size={16} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 380, borderWidth: 1.5, borderRadius: 18, padding: 20, alignItems: 'center' },
  iconHalo: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  iconCircle: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 12, fontFamily: 'Cairo_700Bold', marginBottom: 6 },
  title: { fontSize: 22, fontFamily: 'Cairo_700Bold', marginBottom: 6 },
  desc: { fontSize: 13, fontFamily: 'Cairo_400Regular', lineHeight: 22, marginBottom: 18 },
  button: { minHeight: 46, borderRadius: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buttonText: { color: '#fff', fontSize: 14, fontFamily: 'Cairo_700Bold' },
});
