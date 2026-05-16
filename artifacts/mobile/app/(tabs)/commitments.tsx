import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { formatCurrency, getCurrentMonthYear } from '@/utils/format';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import type { Commitment } from '@/types';

export default function CommitmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { commitments, commitmentPayments, markCommitmentPaid, markCommitmentUnpaid, getMonthlyTotals, userProfile } = useApp();
  const { month, year } = getCurrentMonthYear();
  const totals = getMonthlyTotals(month, year);
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const getPayment = (commitmentId: string) =>
    commitmentPayments.find((p) => p.commitmentId === commitmentId && p.month === month && p.year === year);

  const handleTogglePaid = (item: Commitment) => {
    const payment = getPayment(item.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (payment?.status === 'paid') {
      markCommitmentUnpaid(item.id, month, year);
    } else {
      markCommitmentPaid(item.id, month, year, item.amount);
    }
  };

  const today = new Date().getDate();
  const activeCommitments = commitments.filter((c) => c.isActive);
  const paidCount = activeCommitments.filter((c) => getPayment(c.id)?.status === 'paid').length;
  const lateCount = activeCommitments.filter((c) => !getPayment(c.id) && c.dueDay < today).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Card style={styles.summaryCard} padding={14}>
        <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>إجمالي الالتزامات الشهرية</Text>
        <Text style={[styles.summaryAmount, { color: colors.commitment }]}>
          {formatCurrency(totals.totalCommitments, currency)}
        </Text>
        <View style={styles.statsRow}>
          {lateCount > 0 ? (
            <View style={[styles.statBadge, { backgroundColor: colors.danger + '18' }]}>
              <Feather name="alert-circle" size={11} color={colors.danger} />
              <Text style={[styles.statText, { color: colors.danger }]}>{lateCount} متأخر</Text>
            </View>
          ) : null}
          <View style={[styles.statBadge, { backgroundColor: colors.success + '18' }]}>
            <Feather name="check-circle" size={11} color={colors.success} />
            <Text style={[styles.statText, { color: colors.success }]}>{paidCount} مدفوع</Text>
          </View>
          <Text style={[styles.statTotal, { color: colors.mutedForeground }]}>{activeCommitments.length} التزام</Text>
        </View>
      </Card>

      <FlatList
        data={activeCommitments}
        keyExtractor={(item) => item.id}
        scrollEnabled
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + bottomPad + 90 },
          !activeCommitments.length && styles.emptyList,
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="credit-card"
            title="لا توجد التزامات"
            description="أضف التزاماتك الشهرية من قروض وإيجار وفواتير"
            actionLabel="إضافة التزام"
            onAction={() => router.push('/commitments/add')}
          />
        }
        renderItem={({ item }) => {
          const payment = getPayment(item.id);
          const isPaid = payment?.status === 'paid';
          const isLate = !isPaid && item.dueDay < today;
          const accentColor = isPaid ? colors.success : isLate ? colors.danger : colors.warning;

          return (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/commitments/add', params: { id: item.id } })}
              activeOpacity={0.72}
              style={[styles.cardWrapper, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}
            >
              {/* Accent strip on the right */}
              <View style={[styles.strip, { backgroundColor: accentColor }]} />

              {/* Card content */}
              <View style={styles.cardInner}>
                {/* Rightmost: paid toggle button */}
                <TouchableOpacity
                  onPress={() => handleTogglePaid(item)}
                  style={[
                    styles.checkBtn,
                    { borderColor: accentColor, backgroundColor: isPaid ? accentColor + '20' : 'transparent' },
                  ]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {isPaid ? (
                    <Feather name="check" size={14} color={accentColor} />
                  ) : (
                    <View style={[styles.checkDot, { backgroundColor: accentColor }]} />
                  )}
                </TouchableOpacity>

                {/* Center: info */}
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.cardMetaRow}>
                    <View style={[styles.statusPill, { backgroundColor: accentColor + '18' }]}>
                      <Text style={[styles.statusPillText, { color: accentColor }]}>
                        {isPaid ? 'مدفوع' : isLate ? 'متأخر' : `يوم ${item.dueDay}`}
                      </Text>
                    </View>
                    <Text style={[styles.cardCat, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.category}
                    </Text>
                  </View>
                </View>

                {/* Left: amount + chevron */}
                <View style={styles.cardRight}>
                  <Text style={[styles.cardAmount, { color: colors.commitment }]} numberOfLines={1}>
                    {formatCurrency(item.amount, currency)}
                  </Text>
                  <Feather name="chevron-left" size={13} color={colors.mutedForeground} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + bottomPad + 80 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/commitments/add');
        }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: { margin: 16, marginBottom: 8 },
  summaryLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'right', marginBottom: 4 },
  summaryAmount: { fontSize: 24, fontFamily: 'Inter_700Bold', textAlign: 'right', marginBottom: 8 },
  statsRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  statBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  statText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  statTotal: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  emptyList: { flex: 1 },
  // Card
  cardWrapper: { flexDirection: 'row-reverse', borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  strip: { width: 4 },
  cardInner: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, gap: 10 },
  checkBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkDot: { width: 8, height: 8, borderRadius: 4 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: 'Inter_500Medium', textAlign: 'right', marginBottom: 4 },
  cardMetaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  cardCat: { fontSize: 11, fontFamily: 'Inter_400Regular', flexShrink: 1 },
  cardRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, flexShrink: 0 },
  cardAmount: { fontSize: 14, fontFamily: 'Inter_700Bold', textAlign: 'right' },
  fab: { position: 'absolute', left: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
});
