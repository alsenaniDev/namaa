import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import * as dir from '@/utils/dir';

interface TransactionItemProps {
  title: string;
  subtitle?: string;
  amount: string;
  amountColor?: string;
  icon?: string;
  iconColor?: string;
  badge?: string;
  badgeColor?: string;
  onPress?: () => void;
}

export function TransactionItem({
  title, subtitle, amount, amountColor, icon, iconColor, badge, badgeColor, onPress,
}: TransactionItemProps) {
  const colors = useColors();
  const ic = iconColor ?? colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.72}
      style={[styles.wrapper, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}
    >
      {/* Accent strip */}
      <View style={[styles.strip, { backgroundColor: ic }]} />

      {/* Content */}
      <View style={styles.inner}>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: ic + '15', borderRadius: 18 }]}>
            <Feather name={icon as any} size={17} color={ic} />
          </View>
        ) : null}

        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
          <View style={styles.metaRow}>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: (badgeColor ?? colors.primary) + '18' }]}>
                <Text style={[styles.badgeText, { color: badgeColor ?? colors.primary }]}>{badge}</Text>
              </View>
            ) : null}
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.right}>
          <Text style={[styles.amount, { color: amountColor ?? colors.foreground }]} numberOfLines={1}>
            {amount}
          </Text>
          <Feather name={dir.chevronDetail as any} size={13} color={colors.mutedForeground} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: dir.row,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  strip: {
    width: 4,
  },
  inner: {
    flex: 1,
    flexDirection: dir.row,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: dir.textAlign,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: dir.row,
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    flexShrink: 1,
  },
  right: {
    flexDirection: dir.row,
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  amount: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    textAlign: dir.textAlign,
  },
});
