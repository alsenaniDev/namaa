import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SubscriptionItem } from '@/components/SubscriptionItem';
import { getMonthlySubscriptionTotal, getYearlySubscriptionTotal, daysUntil } from '@/utils/calculations';
import { formatCurrency } from '@/utils/format';
import { useResponsive } from '@/hooks/useResponsive';
import { iosScrollViewObserverProps } from '@/utils/scrollView';

export default function SubscriptionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const responsive = useResponsive();
  const { subscriptions, userProfile } = useApp();
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  // Active first, then soonest-renewing.
  const sorted = [...subscriptions].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return daysUntil(a.nextRenewalDate) - daysUntil(b.nextRenewalDate);
  });

  const monthly = getMonthlySubscriptionTotal(subscriptions);
  const yearly = getYearlySubscriptionTotal(subscriptions);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {subscriptions.length > 0 ? (
        <Card style={[styles.summaryCard, { margin: responsive.screenPadding, marginBottom: 8 }]} padding={responsive.compactCardPadding}>
          <View style={[styles.summaryRow, { flexDirection: dir.row }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.summaryLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.subscriptions.summaryMonthly}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.summaryAmt, { textAlign: dir.textAlign, color: colors.commitment }]}>{formatCurrency(monthly, currency)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.summaryLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.subscriptions.summaryYearly}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.summaryAmt, { textAlign: dir.textAlign, color: colors.foreground }]}>{formatCurrency(yearly, currency)}</Text>
            </View>
          </View>
        </Card>
      ) : null}

      <FlatList
        {...iosScrollViewObserverProps}
        data={sorted}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!sorted.length}
        contentContainerStyle={[styles.list, { paddingHorizontal: responsive.screenPadding, paddingBottom: insets.bottom + bottomPad + 90 }, !sorted.length && styles.emptyList]}
        ListEmptyComponent={
          <EmptyState
            icon="repeat"
            title={t.subscriptions.emptyTitle}
            description={t.subscriptions.emptyDesc}
            actionLabel={t.subscriptions.addLabel}
            onAction={() => router.push('/subscriptions/add')}
          />
        }
        renderItem={({ item }) => (
          <SubscriptionItem
            subscription={item}
            currency={currency}
            onPress={() => router.push({ pathname: '/subscriptions/add', params: { id: item.id } })}
          />
        )}
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + bottomPad + 20 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/subscriptions/add'); }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: { marginBottom: 8 },
  summaryRow: { alignItems: 'center', gap: 12 },
  summaryLabel: { fontSize: 11, fontFamily: 'Cairo_400Regular', marginBottom: 4 },
  summaryAmt: { fontSize: 18, fontFamily: 'Cairo_700Bold' },
  list: { paddingTop: 4 },
  emptyList: { flex: 1 },
  fab: { position: 'absolute', left: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
});
