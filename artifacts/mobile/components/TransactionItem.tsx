import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
  onDelete?: () => void;
  right?: React.ReactNode;
}

export function TransactionItem({
  title, subtitle, amount, amountColor, icon, iconColor, badge, badgeColor, onPress, onDelete, right,
}: TransactionItemProps) {
  const colors = useColors();
  const ic = iconColor ?? colors.primary;

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete?.();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}
    >
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: ic + '18', borderRadius: colors.radius - 4 }]}>
          <Feather name={icon as any} size={18} color={ic} />
        </View>
      ) : null}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.amount, { color: amountColor ?? colors.foreground }]}>{amount}</Text>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
        </View>
        {(subtitle || badge) ? (
          <View style={styles.bottomRow}>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: (badgeColor ?? colors.primary) + '20' }]}>
                <Text style={[styles.badgeText, { color: badgeColor ?? colors.primary }]}>{badge}</Text>
              </View>
            ) : null}
            {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
          </View>
        ) : null}
      </View>
      {right ?? null}
      {onDelete ? (
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="trash-2" size={16} color={colors.danger} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row-reverse', alignItems: 'center', padding: 12, borderWidth: 1, marginBottom: 8, gap: 10 },
  iconWrap: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  topRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 14, fontFamily: 'Inter_500Medium', flex: 1, textAlign: 'right' },
  amount: { fontSize: 14, fontFamily: 'Inter_700Bold', marginLeft: 8 },
  bottomRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  deleteBtn: { padding: 6 },
});
