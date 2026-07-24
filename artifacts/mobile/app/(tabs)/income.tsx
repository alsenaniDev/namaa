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
import { TransactionItem } from '@/components/TransactionItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { INCOME_TYPES } from '@/types';

type IncomeSort = 'default' | 'amountAsc' | 'amountDesc' | 'titleAsc';

export default function IncomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const { incomes, getMonthlyTotals, userProfile, customTypes } = useApp();
  const { month, year } = getCurrentMonthYear();
  const totals = getMonthlyTotals(month, year);
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : 0;
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<IncomeSort>('default');

  const typeColors: Record<string, string> = {
    'راتب': colors.income, 'عمل إضافي': colors.commitment, 'مكافأة': colors.warning,
    'تجارة': colors.primary, 'استثمار': colors.success, 'أخرى': colors.mutedForeground,
  };
  const typeIcons: Record<string, string> = {
    'راتب': 'briefcase', 'عمل إضافي': 'clock', 'مكافأة': 'gift',
    'تجارة': 'shopping-cart', 'استثمار': 'trending-up', 'أخرى': 'dollar-sign',
  };
  const typeOptions = useMemo(
    () => ['all', ...INCOME_TYPES, ...customTypes.incomeTypes]
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .map((value) => ({ value, label: value === 'all' ? t.income.filterAll : value })),
    [customTypes.incomeTypes, t.income.filterAll],
  );
  const sortOptions = [
    { value: 'default', label: t.income.sortDefault },
    { value: 'amountAsc', label: t.common.sortAmountAsc },
    { value: 'amountDesc', label: t.common.sortAmountDesc },
    { value: 'titleAsc', label: t.common.sortTitleAsc },
  ];

  const visibleIncomes = useMemo(
    () => {
      const filtered = incomes.filter((item) => typeFilter === 'all' || item.type === typeFilter);
      const sorted = [...filtered];
      if (sortBy === 'amountAsc') sorted.sort((a, b) => a.amount - b.amount);
      if (sortBy === 'amountDesc') sorted.sort((a, b) => b.amount - a.amount);
      if (sortBy === 'titleAsc') sorted.sort((a, b) => a.title.localeCompare(b.title, 'ar'));
      return sorted;
    },
    [incomes, sortBy, typeFilter],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Card style={styles.summaryCard} padding={16}>
        <Text style={[styles.summaryLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.income.totalLabel}</Text>
        <Text style={[styles.summaryAmount, { textAlign: dir.textAlign, color: colors.income }]}>{formatCurrency(totals.totalIncome, currency)}</Text>
        <Text style={[styles.summaryCount, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{visibleIncomes.length} {t.income.sourceSuffix}</Text>
      </Card>

      <Card style={styles.controlsCard} padding={12}>
        <View style={[styles.controlsRow, { flexDirection: dir.row }]}>
          <View style={styles.controlCell}>
            <Select
              label={t.common.filter}
              value={typeFilter}
              options={typeOptions}
              onValueChange={setTypeFilter}
            />
          </View>
          <View style={styles.controlCell}>
            <Select
              label={t.common.sort}
              value={sortBy}
              options={sortOptions}
              onValueChange={(value) => setSortBy(value as IncomeSort)}
            />
          </View>
        </View>
      </Card>

      <FlatList
        data={visibleIncomes}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!visibleIncomes.length}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + bottomPad + 90 }, !visibleIncomes.length && styles.emptyList]}
        ListEmptyComponent={
          <EmptyState icon="trending-up" title={t.income.emptyTitle} description={t.income.emptyDesc} actionLabel={t.income.addLabel} onAction={() => router.push('/income/add')} />
        }
        renderItem={({ item }) => {
          const ic = typeColors[item.type] ?? colors.income;
          return (
            <TransactionItem
              title={item.title}
              subtitle={item.isRecurring ? t.income.recurringDay(item.receivedDay) : t.income.nonRecurring}
              amount={formatCurrency(item.amount, currency)}
              amountColor={ic}
              icon={typeIcons[item.type] ?? 'dollar-sign'}
              iconColor={ic}
              badge={item.type}
              badgeColor={ic}
              onPress={() => router.push({ pathname: '/income/add', params: { id: item.id } })}
            />
          );
        }}
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + bottomPad + 80 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/income/add'); }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: { margin: 16, marginBottom: 8 },
  summaryLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  summaryAmount: { fontSize: 24, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  summaryCount: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  controlsCard: { marginHorizontal: 16, marginBottom: 8 },
  controlsRow: { gap: 10 },
  controlCell: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  emptyList: { flex: 1 },
  fab: { position: 'absolute', left: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
});
