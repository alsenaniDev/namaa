import React from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';

/**
 * Custom header back button.
 *
 * Why we need this: the app intentionally pins React Native's I18nManager to
 * LTR (see `index.js` and `plugins/withForceRTL.js`) so iOS per-app language
 * settings can't invert our manually-rendered RTL layout. The side effect is
 * that the native stack header treats the layout as LTR and puts the default
 * back button on the visual LEFT — the OPPOSITE of where an Arabic user's
 * thumb expects it. Combined with screens that put an edit icon on
 * `headerRight` (visual right, where Arabic users instinctively tap to go
 * back), users frequently miss the back chevron or accidentally tap edit.
 *
 * We disable the default back globally and render this larger, right-aligned
 * chevron in `headerRight` via the root Stack screenOptions instead.
 */
export function HeaderBack() {
  const colors = useColors();
  const router = useRouter();
  if (!router.canGoBack()) return null;
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      style={{ paddingHorizontal: Platform.OS === 'ios' ? 12 : 14, paddingVertical: 6 }}
      accessibilityRole="button"
      accessibilityLabel="رجوع"
    >
      {/* chevron-right reads as "back" in Arabic */}
      <Feather name="chevron-right" size={26} color={colors.primary} />
    </TouchableOpacity>
  );
}
