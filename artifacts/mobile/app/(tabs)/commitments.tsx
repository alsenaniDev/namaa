import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { formatCurrency, getCurrentMonthYear } from '@/utils/format';
import { getCommitmentProgress } from '@/utils/calculations';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { LenderAvatar } from '@/components/LenderAvatar';
import type { Commitment } from '@/types';

type CommitmentFilter = 'all' | 'paid' | 'unpaid' | 'late';
type CommitmentSort = 'dueDayAsc' | 'amountAsc' | 'amountDesc' | 'titleAsc';

export default function CommitmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const { commitments, commitmentPayments, lenders, markCommitmentPaid, markCommitmentUnpaid, getMonthlyTotals, userProfile } = useApp();
  const { month, year } = getCurrentMonthYear();
  const totals = getMonthlyTotals(month, year);
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : 0;
  const [statusFilter, setStatusFilter] = useState<CommitmentFilter>('all');
  const [sortBy, setSortBy] = useState<CommitmentSort>('dueDayAsc');

  const getPayment = (commitmentId: string) =>
    commitmentPayments.find((p) => p.commitmentId === commitmentId && p.month === month && p.year === year);

  const getLender = (lenderId?: string) => (lenderId ? lenders.find((l) => l.id === lenderId) : undefined);

  const handleTogglePaid = (item: Commitment) => {
    const payment = getPayment(item.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (payment?.status === 'paid') markCommitmentUnpaid(item.id, month, year);
    else markCommitmentPaid(item.id, month, year, item.amount);
  };

  const today = new Date().getDate();
  const activeCommitments = commitments.filter((c) => c.isActive);
  const paidCount = activeCommitments.filter((c) => getPayment(c.id)?.status === 'paid').length;
  const lateCount = activeCommitments.filter((c) => !getPayment(c.id) && c.dueDay < today).length;
  const statusOptions = [
    { value: 'all', label: t.commitments.filterAll },
    { value: 'paid', label: t.commitments.paid },
    { value: 'unpaid', label: t.commitments.unpaid },
    { value: 'late', label: t.commitments.late },
  ];
  const sortOptions = [
    { value: 'dueDayAsc', label: t.commitments.sortDueDayAsc },
    { value: 'amountAsc', label: t.common.sortAmountAsc },
    { value: 'amountDesc', label: t.common.sortAmountDesc },
    { value: 'titleAsc', label: t.common.sortTitleAsc },
  ];
  const visibleCommitments = useMemo(
    () => {
      const filtered = activeCommitments.filter((item) => {
        const payment = getPayment(item.id);
        const isPaid = payment?.status === 'paid';
        const isLate = !isPaid && item.dueDay < today;
        if (statusFilter === 'paid') return isPaid;
        if (statusFilter === 'late') return isLate;
        if (statusFilter === 'unpaid') return !isPaid && !isLate;
        return true;
      });
      const sorted = [...filtered];
      if (sortBy === 'dueDayAsc') sorted.sort((a, b) => a.dueDay - b.dueDay);
      if (sortBy === 'amountAsc') sorted.sort((a, b) => a.amount - b.amount);
      if (sortBy === 'amountDesc') sorted.sort((a, b) => b.amount - a.amount);
      if (sortBy === 'titleAsc') sorted.sort((a, b) => a.title.localeCompare(b.title, 'ar'));
      return sorted;
    },
    [activeCommitments, commitmentPayments, sortBy, statusFilter, today],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Card style={styles.summaryCard} padding={14}>
        <View style={[styles.summaryHeader, { flexDirection: dir.row }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.commitments.totalLabel}</Text>
            <Text style={[styles.summaryAmount, { textAlign: dir.textAlign, color: colors.commitment }]}>{formatCurrency(totals.totalCommitments, currency)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/lenders')}
            style={[styles.lendersPill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}
            activeOpacity={0.78}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather name="briefcase" size={14} color={colors.primary} />
            <Text style={[styles.lendersPillText, { color: colors.primary }]}>{t.commitments.manageLenders}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.statsRow, { flexDirection: dir.row }]}>
          {lateCount > 0 ? (
            <View style={[styles.statBadge, { flexDirection: dir.row, backgroundColor: colors.danger + '18' }]}>
              <Feather name="alert-circle" size={11} color={colors.danger} />
              <Text style={[styles.statText, { color: colors.danger }]}>{lateCount} {t.commitments.lateSuffix}</Text>
            </View>
          ) : null}
          <View style={[styles.statBadge, { flexDirection: dir.row, backgroundColor: colors.success + '18' }]}>
            <Feather name="check-circle" size={11} color={colors.success} />
            <Text style={[styles.statText, { color: colors.success }]}>{paidCount} {t.commitments.paidSuffix}</Text>
          </View>
          <Text style={[styles.statTotal, { color: colors.mutedForeground }]}>{visibleCommitments.length} {t.commitments.countSuffix}</Text>
        </View>
      </Card>

      <Card style={styles.controlsCard} padding={12}>
        <View style={[styles.controlsRow, { flexDirection: dir.row }]}>
          <View style={styles.controlCell}>
            <Select
              label={t.common.filter}
              value={statusFilter}
              options={statusOptions}
              onValueChange={(value) => setStatusFilter(value as CommitmentFilter)}
            />
          </View>
          <View style={styles.controlCell}>
            <Select
              label={t.common.sort}
              value={sortBy}
              options={sortOptions}
              onValueChange={(value) => setSortBy(value as CommitmentSort)}
            />
          </View>
        </View>
      </Card>

      <FlatList
        data={visibleCommitments}
        keyExtractor={(item) => item.id}
        scrollEnabled
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + bottomPad + 90 }, !visibleCommitments.length && styles.emptyList]}
        ListEmptyComponent={
          <EmptyState icon="credit-card" title={t.commitments.emptyTitle} description={t.commitments.emptyDesc} actionLabel={t.commitments.addLabel} onAction={() => router.push('/commitments/add')} />
        }
        renderItem={({ item }) => {
          const payment = getPayment(item.id);
          const isPaid = payment?.status === 'paid';
          const isLate = !isPaid && item.dueDay < today;
          const lender = getLender(item.lenderId);
          const accentColor = isPaid ? colors.success : isLate ? colors.danger : (lender?.color ?? colors.warning);
          const statusLabel = isPaid ? t.commitments.paid : isLate ? t.commitments.late : `${t.commitments.dayPrefix} ${item.dueDay}`;
          const progress = getCommitmentProgress(item, commitmentPayments);

          return (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/commitments/[id]', params: { id: item.id } })}
              activeOpacity={0.78}
              style={[styles.cardWrapper, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}
            >
              <View style={[styles.cardTop, { flexDirection: dir.row }]}>
                <View style={[styles.strip, { backgroundColor: accentColor }]} />
                <TouchableOpacity
                  onPress={() => handleTogglePaid(item)}
                  style={[styles.checkBtn, { borderColor: accentColor, backgroundColor: isPaid ? accentColor + '20' : 'transparent' }]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {isPaid ? <Feather name="check" size={14} color={accentColor} /> : <View style={[styles.checkDot, { backgroundColor: accentColor }]} />}
                </TouchableOpacity>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { textAlign: dir.textAlign, color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
                  <View style={[styles.cardMetaRow, { flexDirection: dir.row }]}>
                    <View style={[styles.statusPill, { backgroundColor: accentColor + '18' }]}>
                      <Text style={[styles.statusPillText, { color: accentColor }]}>{statusLabel}</Text>
                    </View>
                    {lender ? (
                      <View style={[styles.lenderChip, { flexDirection: dir.row, backgroundColor: lender.color + '12' }]}>
                        <LenderAvatar lender={lender} size={18} fontSize={9} borderWidth={0} />
                        <Text style={[styles.lenderChipText, { color: lender.color }]} numberOfLines={1}>{lender.name}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.cardCat, { color: colors.mutedForeground }]} numberOfLines={1}>{item.category}</Text>
                    )}
                  </View>
                </View>
                <View style={[styles.cardRight, { flexDirection: dir.row }]}>
                  <Text style={[styles.cardAmount, { textAlign: dir.textAlign, color: colors.commitment }]} numberOfLines={1}>{formatCurrency(item.amount, currency)}</Text>
                  <Feather name={dir.chevronDetail as any} size={13} color={colors.mutedForeground} />
                </View>
              </View>

              {progress.isFinite ? (
                <View style={[styles.progressWrap, { borderTopColor: colors.border }]}>
                  <View style={[styles.progressHeader, { flexDirection: dir.row }]}>
                    <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
                      {t.commitments.installmentsPaid(progress.paidInstallmentCount, progress.installmentCount)}
                    </Text>
                    <Text style={[styles.progressPct, { color: accentColor }]}>{Math.round(progress.progressPercent)}%</Text>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progress.progressPercent}%`,
                          backgroundColor: accentColor,
                          ...(dir.isRTL ? { right: 0 } : { left: 0 }),
                        },
                      ]}
                    />
                  </View>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + bottomPad + 80 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/commitments/add'); }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: { margin: 16, marginBottom: 8 },
  summaryHeader: { alignItems: 'flex-start', gap: 10 },
  summaryLabel: { fontSize: 13, fontFamily: 'Cairo_400Regular', marginBottom: 4 },
  summaryAmount: { fontSize: 24, fontFamily: 'Cairo_700Bold', marginBottom: 8 },
  lendersPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  lendersPillText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  statsRow: { alignItems: 'center', gap: 8 },
  statBadge: { alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  statText: { fontSize: 12, fontFamily: 'Cairo_500Medium' },
  statTotal: { fontSize: 12, fontFamily: 'Cairo_400Regular' },
  controlsCard: { marginHorizontal: 16, marginBottom: 8 },
  controlsRow: { gap: 10 },
  controlCell: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  emptyList: { flex: 1 },
  cardWrapper: { borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  cardTop: { alignItems: 'center' },
  strip: { width: 4, alignSelf: 'stretch' },
  checkBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginHorizontal: 10, marginVertical: 12 },
  checkDot: { width: 8, height: 8, borderRadius: 4 },
  cardBody: { flex: 1, paddingVertical: 12 },
  cardTitle: { fontSize: 14, fontFamily: 'Cairo_500Medium', marginBottom: 4 },
  cardMetaRow: { alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  lenderChip: { alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  lenderChipText: { fontSize: 11, fontFamily: 'Cairo_500Medium', maxWidth: 140 },
  cardCat: { fontSize: 11, fontFamily: 'Cairo_400Regular', flexShrink: 1 },
  cardRight: { alignItems: 'center', gap: 4, flexShrink: 0, paddingHorizontal: 12 },
  cardAmount: { fontSize: 14, fontFamily: 'Cairo_700Bold' },
  progressWrap: { paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  progressHeader: { justifyContent: 'space-between', marginBottom: 6 },
  progressText: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  progressPct: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
  progressBar: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { position: 'absolute', top: 0, bottom: 0, height: '100%', borderRadius: 3 },
  fab: { position: 'absolute', left: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
});
