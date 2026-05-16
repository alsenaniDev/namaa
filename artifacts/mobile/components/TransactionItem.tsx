import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

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
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2, borderRightColor: ic, borderRightWidth: 3 }]}
    >
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: ic + '15', borderRadius: 20 }]}>
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
          {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor ?? colors.foreground }]}>{amount}</Text>
        <Feather name="chevron-left" size={14} color={colors.mutedForeground} style={{ marginTop: 2 }} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  iconWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { fontSize: 14, fontFamily: 'Inter_500Medium', textAlign: 'right', marginBottom: 4 },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  subtitle: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});
