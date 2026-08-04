import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useT } from '@/hooks/useT';

/**
 * Custom header back button, used for BOTH languages so the icon/label look
 * identical regardless of direction.
 *
 * Why we need this: the app pins React Native's I18nManager to LTR (see
 * `index.js` and `plugins/withForceRTL.js`) so iOS per-app language settings
 * can't invert our manually-rendered layout. The native stack header then always
 * puts its back button on the visual LEFT, which is right for English. For
 * Arabic the back control belongs on the visual RIGHT, so in RTL it is placed on
 * `headerRight` (see `app/_layout.tsx`). English reads "‹ Back", Arabic "الرجوع ‹".
 */
export function HeaderBack() {
  const colors = useColors();
  const router = useRouter();
  const dir = useDir();
  const t = useT();
  if (!router.canGoBack()) return null;
  const icon = <Feather name={dir.isRTL ? 'chevron-left' : 'chevron-right'} size={24} color={colors.primary} />;
  const label = <Text style={[styles.label, { color: colors.primary }]}>{t.nav.back}</Text>;
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={t.nav.back}
    >
      {dir.isRTL ? (
        <>
          {label}
          {icon}
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'ios' ? 4 : 8,
    paddingVertical: 6,
  },
  label: { fontSize: 16, fontFamily: 'Cairo_500Medium', marginHorizontal: 2 },
});
