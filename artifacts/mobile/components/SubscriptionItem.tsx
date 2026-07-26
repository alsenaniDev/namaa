import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useT } from '@/hooks/useT';
import { formatCurrency, formatShortDate } from '@/utils/format';
import { daysUntil, getSubscriptionMonthlyEquivalent } from '@/utils/calculations';
import type { Subscription } from '@/types';

interface Props {
  subscription: Subscription;
  currency: string;
  onPress?: () => void;
}

export function SubscriptionItem({ subscription, currency, onPress }: Props) {
  const colors = useColors();
  const dir = useDir();
  const t = useT();
  const days = daysUntil(subscription.nextRenewalDate);
  const cycleLabel = t.subscriptions.cycleLabels[subscription.cycle] ?? subscription.cycle;
  const monthly = getSubscriptionMonthlyEquivalent(subscription);
  const isSoon = days >= 0 && days <= 5;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.78 : 1}
      style={[
        styles.card,
        { flexDirection: dir.row, backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 },
        !subscription.isActive && { opacity: 0.55 },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: subscription.color + '22', borderColor: subscription.color + '55' }]}>
        <Feather name={subscription.icon as any} size={20} color={subscription.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[styles.name, { textAlign: dir.textAlign, color: colors.foreground }]}>{subscription.name}</Text>
        <View style={[styles.metaRow, { flexDirection: dir.row }]}>
          <View style={[styles.pill, { backgroundColor: subscription.color + '18' }]}>
            <Text style={[styles.pillText, { color: subscription.color }]}>{cycleLabel}</Text>
          </View>
          <Text style={[styles.metaText, { color: isSoon ? colors.danger : colors.mutedForeground }]}>
            {t.subscriptions.renewsOn} {formatShortDate(subscription.nextRenewalDate)}
            {isSoon ? ` · ${days === 0 ? t.subscriptions.today : t.subscriptions.inDays(days)}` : ''}
          </Text>
        </View>
      </View>
      <View style={[styles.right, { alignItems: dir.isRTL ? 'flex-start' : 'flex-end' }]}>
        <Text style={[styles.amount, { color: colors.commitment }]}>{formatCurrency(subscription.amount, currency)}</Text>
        <Text style={[styles.amountSub, { color: colors.mutedForeground }]}>≈ {formatCurrency(monthly, currency)}/{t.subscriptions.perMonthShort}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', padding: 14, borderWidth: 1, gap: 12, marginBottom: 8 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, flexShrink: 0 },
  name: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', marginBottom: 4 },
  metaRow: { alignItems: 'center', gap: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  pillText: { fontSize: 11, fontFamily: 'Cairo_500Medium' },
  metaText: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  right: { flexShrink: 0 },
  amount: { fontSize: 14, fontFamily: 'Cairo_700Bold' },
  amountSub: { fontSize: 10, fontFamily: 'Cairo_400Regular', marginTop: 2 },
});
