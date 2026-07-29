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
import { formatCurrency, formatMonthYear, formatShortDate, getCurrentMonthYear, parseDateLocal } from '@/utils/format';
import { TransactionItem } from '@/components/TransactionItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { useResponsive } from '@/hooks/useResponsive';
import { iosScrollViewObserverProps } from '@/utils/scrollView';

const CATEGORY_ICONS: Record<string, string> = {
  'مطاعم': 'coffee', 'قهوة': 'coffee', 'تسوق': 'shopping-bag', 'بنزين': 'navigation',
  'سفر': 'map', 'ترفيه': 'film', 'صحة': 'heart', 'تعليم': 'book', 'أخرى': 'more-horizontal',
};
const CATEGORY_COLORS: Record<string, string> = {
  'مطاعم': '#F97316', 'قهوة': '#92400E', 'تسوق': '#8B5CF6', 'بنزين': '#3B82F6',
  'سفر': '#14B8A6', 'ترفيه': '#EC4899', 'صحة': '#EF4444', 'تعليم': '#10B981', 'أخرى': '#6B7280',
};

export default function ExpensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const responsive = useResponsive();
  const { expenses, getMonthlyTotals, userProfile } = useApp();
  const { month, year } = getCurrentMonthYear();
  const [viewMonth, setViewMonth] = useState(month);
  const [viewYear, setViewYear] = useState(year);
  const totals = getMonthlyTotals(viewMonth, viewYear);
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : 0;
  const isCurrentMonth = viewMonth === month && viewYear === year;

  const changeMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewMonth(next.getMonth() + 1);
    setViewYear(next.getFullYear());
  };

  const monthExpenses = useMemo(
    () => expenses
      .filter((e) => {
        const d = parseDateLocal(e.expenseDate);
        return !!d && d.getMonth() + 1 === viewMonth && d.getFullYear() === viewYear;
      })
      .sort((a, b) => {
        const bd = parseDateLocal(b.expenseDate)?.getTime() ?? 0;
        const ad = parseDateLocal(a.expenseDate)?.getTime() ?? 0;
        return bd - ad;
      }),
    [expenses, viewMonth, viewYear],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Card style={[styles.summaryCard, { margin: responsive.screenPadding, marginBottom: 8 }]} padding={responsive.compactCardPadding}>
        <Text style={[styles.summaryLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.expenses.filteredTotalLabel}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.summaryAmount, { textAlign: dir.textAlign, color: colors.expense }]}>
          {formatCurrency(totals.totalExpenses, currency)}
        </Text>
        <Text style={[styles.summaryCount, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{monthExpenses.length} {t.expenses.countSuffix}</Text>
      </Card>

      <View style={[styles.filterBar, { flexDirection: dir.row, backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: responsive.screenPadding, gap: responsive.isTiny ? 6 : 10 }]}>
        <TouchableOpacity
          style={[styles.monthButton, { backgroundColor: colors.muted }]}
          onPress={() => changeMonth(-1)}
          activeOpacity={0.75}
          accessibilityLabel={t.expenses.previousMonth}
        >
          <Feather name={dir.isRTL ? 'chevron-right' : 'chevron-left'} size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.monthTitleWrap}>
          <Text style={[styles.monthTitle, { textAlign: 'center', color: colors.foreground }]}>{formatMonthYear(viewMonth, viewYear)}</Text>
          {!isCurrentMonth ? (
            <TouchableOpacity
              onPress={() => { setViewMonth(month); setViewYear(year); }}
              activeOpacity={0.75}
              style={[styles.todayChip, { backgroundColor: colors.primary + '14' }]}
            >
              <Text style={[styles.todayChipText, { color: colors.primary }]}>{t.expenses.currentMonth}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.monthButton, { backgroundColor: colors.muted }]}
          onPress={() => changeMonth(1)}
          activeOpacity={0.75}
          accessibilityLabel={t.expenses.nextMonth}
        >
          <Feather name={dir.isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <FlatList
        {...iosScrollViewObserverProps}
        data={monthExpenses}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!monthExpenses.length}
        contentContainerStyle={[styles.list, { paddingHorizontal: responsive.screenPadding, paddingBottom: insets.bottom + bottomPad + 90 }, !monthExpenses.length && styles.emptyList]}
        ListEmptyComponent={
          <EmptyState icon="shopping-bag" title={t.expenses.emptyTitle} description={t.expenses.emptyDesc} actionLabel={t.expenses.addLabel} onAction={() => router.push('/expenses/add')} />
        }
        renderItem={({ item }) => {
          const ic = CATEGORY_COLORS[item.category] ?? colors.expense;
          return (
            <TransactionItem
              title={item.title}
              subtitle={formatShortDate(item.expenseDate)}
              amount={formatCurrency(item.amount, currency)}
              amountColor={ic}
              icon={CATEGORY_ICONS[item.category] ?? 'more-horizontal'}
              iconColor={ic}
              badge={item.category}
              badgeColor={ic}
              onPress={() => router.push({ pathname: '/expenses/add', params: { id: item.id } })}
            />
          );
        }}
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + bottomPad + 80 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/expenses/add'); }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: { marginBottom: 8 },
  summaryLabel: { fontSize: 13, fontFamily: 'Cairo_400Regular', marginBottom: 4 },
  summaryAmount: { fontSize: 24, fontFamily: 'Cairo_700Bold', marginBottom: 2 },
  summaryCount: { fontSize: 12, fontFamily: 'Cairo_400Regular' },
  filterBar: { alignItems: 'center', borderWidth: 1, borderRadius: 12, marginBottom: 8, padding: 8 },
  monthButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  monthTitleWrap: { flex: 1, alignItems: 'center', minHeight: 38, justifyContent: 'center' },
  monthTitle: { fontSize: 15, fontFamily: 'Cairo_600SemiBold' },
  todayChip: { marginTop: 5, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  todayChipText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  list: { paddingTop: 4 },
  emptyList: { flex: 1 },
  fab: { position: 'absolute', left: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
});
