import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { formatCurrency, formatMonthYear } from '@/utils/format';
import {
  getExpensesByCategory, getCommitmentsByCategory,
  getGoalProgress, getBudgetUsages,
  getMonthlySubscriptionTotal, getYearlySubscriptionTotal,
} from '@/utils/calculations';
import { ProgressBar } from '@/components/ProgressBar';
import { Card } from '@/components/ui/Card';
import { useResponsive } from '@/hooks/useResponsive';
import { iosScrollViewObserverProps } from '@/utils/scrollView';

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const dir = useDir();
  const responsive = useResponsive();
  const { getMonthlyTotals, expenses, commitments, commitmentPayments, userProfile, goals, goalContributions, budgets, subscriptions } = useApp();
  const currency = userProfile?.preferredCurrency ?? 'SAR';

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const changeMonth = (delta: number) => {
    let m = month + delta; let y = year;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m); setYear(y);
  };

  const totals = getMonthlyTotals(month, year);
  const expCats = getExpensesByCategory(expenses, month, year);
  const comCats = getCommitmentsByCategory(commitments, commitmentPayments);
  const BAR_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
  const sortedExpCats = Object.entries(expCats).sort((a, b) => b[1] - a[1]);
  const sortedComCats = Object.entries(comCats).sort((a, b) => b[1] - a[1]);
  const maxBar = Math.max(totals.totalIncome, totals.totalCommitments, totals.totalExpenses, 1);
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // Phase 4 sections — derived per current data, not month-scoped.
  const goalProgress = goals.map((g) => ({ g, p: getGoalProgress(g, goalContributions) }));
  const activeGoals = goalProgress.filter((x) => !x.p.isCompleted);
  const completedGoals = goalProgress.filter((x) => x.p.isCompleted);
  const goalsSaved = goalProgress.reduce((s, x) => s + x.p.saved, 0);
  const goalsTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const goalsTopFour = [...goalProgress].sort((a, b) => b.p.percent - a.p.percent).slice(0, 4);

  const activeSubs = subscriptions.filter((s) => s.isActive);
  const subsMonthly = getMonthlySubscriptionTotal(subscriptions);
  const subsYearly = getYearlySubscriptionTotal(subscriptions);

  const budgetUsages = getBudgetUsages(budgets, expenses, month, year);
  const budgetStatusColor = (s: 'safe' | 'warning' | 'over') =>
    s === 'over' ? colors.danger : s === 'warning' ? colors.warning : colors.success;

  return (
    <ScrollView
      {...iosScrollViewObserverProps}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: responsive.screenPadding, paddingTop: responsive.isTiny ? 12 : 16, paddingBottom: bottomPad + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Month Selector */}
      <View style={[styles.monthBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => changeMonth(-1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="chevron-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.foreground }]}>{formatMonthYear(month, year)}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="chevron-right" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Grid */}
      <View style={[styles.grid, { flexDirection: dir.row, gap: responsive.isTiny ? 8 : 10 }]}>
        {[
          { label: t.reports.income, amount: totals.totalIncome, color: colors.income },
          { label: t.reports.commitments, amount: totals.totalCommitments, color: colors.commitment },
          { label: t.reports.expenses, amount: totals.totalExpenses, color: colors.expense },
          { label: t.reports.net, amount: totals.netRemaining, color: totals.netRemaining >= 0 ? colors.success : colors.danger },
        ].map((item) => (
          <View key={item.label} style={[styles.summaryCell, { width: responsive.isTiny ? '100%' : '48%', padding: responsive.isTiny ? 12 : 14, backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}>
            <Text style={[styles.cellLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{item.label}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.cellAmount, { textAlign: dir.textAlign, color: item.color }]}>{formatCurrency(item.amount, currency)}</Text>
          </View>
        ))}
      </View>

      {/* Visual Bar Comparison */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.reports.visualComparison}</Text>
        <View style={styles.barChart}>
          {[
            { label: t.reports.expenses, value: totals.totalExpenses, color: colors.expense },
            { label: t.reports.commitments, value: totals.totalCommitments, color: colors.commitment },
            { label: t.reports.income, value: totals.totalIncome, color: colors.income },
          ].map((bar) => {
            const pct = maxBar > 0 ? (bar.value / maxBar) * 100 : 0;
            return (
              <View key={bar.label} style={styles.barCol}>
                <Text style={[styles.barAmt, { color: bar.color }]}>{formatCurrency(bar.value, currency)}</Text>
                <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                  <View style={[styles.barFill, { height: `${pct}%` as any, backgroundColor: bar.color }]} />
                </View>
                <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{bar.label}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Percentage Bars */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.reports.spendingRatio}</Text>
        <ProgressBar label={t.reports.commitmentsRatio} value={totals.totalCommitments} max={totals.totalIncome} color={totals.commitmentPercent > 70 ? colors.danger : totals.commitmentPercent > 50 ? colors.warning : colors.success} />
        <ProgressBar label={t.reports.expensesRatio} value={totals.totalExpenses} max={totals.totalIncome} color={colors.expense} />
      </Card>

      {/* Expenses by Category */}
      {sortedExpCats.length > 0 && (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.reports.expensesByCategory}</Text>
          {sortedExpCats.map(([cat, amt], i) => {
            const pct = totals.totalExpenses > 0 ? (amt / totals.totalExpenses) * 100 : 0;
            const barColor = BAR_COLORS[i % BAR_COLORS.length];
            return (
              <View key={cat} style={[styles.catRow, { flexDirection: dir.row }]}>
                <Text style={[styles.catAmt, { textAlign: dir.textAlign, color: barColor }]}>{formatCurrency(amt, currency)}</Text>
                <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                  <View style={[styles.catLabelRow, { flexDirection: dir.row }]}>
                    <Text style={[styles.catPct, { color: colors.mutedForeground }]}>{Math.round(pct)}٪</Text>
                    <Text style={[styles.catName, { color: colors.foreground }]}>{cat}</Text>
                  </View>
                  <View style={[styles.catBar, { backgroundColor: colors.muted }]}>
                    <View style={[styles.catFill, { width: `${pct}%` as any, backgroundColor: barColor, position: 'absolute', ...(dir.isRTL ? { right: 0 } : { left: 0 }) }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* Commitments by Category */}
      {sortedComCats.length > 0 && (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.reports.commitmentsByCategory}</Text>
          {sortedComCats.map(([cat, amt], i) => {
            const pct = totals.totalCommitments > 0 ? (amt / totals.totalCommitments) * 100 : 0;
            const barColor = BAR_COLORS[(i + 3) % BAR_COLORS.length];
            return (
              <View key={cat} style={[styles.catRow, { flexDirection: dir.row }]}>
                <Text style={[styles.catAmt, { textAlign: dir.textAlign, color: barColor }]}>{formatCurrency(amt, currency)}</Text>
                <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                  <View style={[styles.catLabelRow, { flexDirection: dir.row }]}>
                    <Text style={[styles.catName, { color: colors.foreground }]}>{cat}</Text>
                    <Text style={[styles.catPct, { color: colors.mutedForeground }]}>{Math.round(pct)}٪</Text>
                  </View>
                  <View style={[styles.catBar, { backgroundColor: colors.muted }]}>
                    <View style={[styles.catFill, { width: `${pct}%` as any, backgroundColor: barColor, position: 'absolute', ...(dir.isRTL ? { right: 0 } : { left: 0 }) }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* Goals overview — not month-scoped */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.reports.goalsSection}</Text>
        {goals.length === 0 ? (
          <Text style={[styles.emptyText, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.reports.goalsEmpty}</Text>
        ) : (
          <>
            <View style={[styles.metaRow, { flexDirection: dir.row }]}>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{t.reports.goalsTotal}</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>
                {formatCurrency(goalsSaved, currency)} / {formatCurrency(goalsTarget, currency)}
              </Text>
            </View>
            <View style={[styles.pillRow, { flexDirection: dir.row }]}>
              <View style={[styles.pill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
                <Text style={[styles.pillText, { color: colors.primary }]}>{t.reports.goalsActiveCount(activeGoals.length)}</Text>
              </View>
              {completedGoals.length > 0 && (
                <View style={[styles.pill, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
                  <Text style={[styles.pillText, { color: colors.success }]}>{t.reports.goalsCompletedCount(completedGoals.length)}</Text>
                </View>
              )}
            </View>
            {goalsTopFour.map(({ g, p }) => (
              <View key={g.id} style={{ marginTop: 12 }}>
                <View style={[styles.catLabelRow, { flexDirection: dir.row }]}>
                  <Text style={[styles.catName, { color: colors.foreground }]} numberOfLines={1}>{g.name}</Text>
                  <Text style={[styles.catPct, { color: colors.mutedForeground }]}>{Math.round(p.percent)}٪</Text>
                </View>
                <View style={[styles.catBar, { backgroundColor: colors.muted }]}>
                  <View style={[styles.catFill, { width: `${Math.min(100, p.percent)}%` as any, backgroundColor: g.color, position: 'absolute', ...(dir.isRTL ? { right: 0 } : { left: 0 }) }]} />
                </View>
              </View>
            ))}
          </>
        )}
      </Card>

      {/* Subscriptions overview */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.reports.subscriptionsSection}</Text>
        {activeSubs.length === 0 ? (
          <Text style={[styles.emptyText, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.reports.subsEmpty}</Text>
        ) : (
          <>
            <View style={[styles.metaRow, { flexDirection: dir.row }]}>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{t.reports.subsMonthlyEq}</Text>
              <Text style={[styles.metaValue, { color: colors.commitment }]}>{formatCurrency(subsMonthly, currency)}</Text>
            </View>
            <View style={[styles.metaRow, { flexDirection: dir.row }]}>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{t.reports.subsYearlyEq}</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>{formatCurrency(subsYearly, currency)}</Text>
            </View>
            <View style={[styles.pillRow, { flexDirection: dir.row, marginTop: 4 }]}>
              <View style={[styles.pill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
                <Text style={[styles.pillText, { color: colors.primary }]}>{t.reports.subsActiveCount(activeSubs.length)}</Text>
              </View>
            </View>
          </>
        )}
      </Card>

      {/* Budgets vs actual — month-scoped */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.reports.budgetsSection}</Text>
        {budgetUsages.length === 0 ? (
          <Text style={[styles.emptyText, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.reports.budgetsEmpty}</Text>
        ) : (
          budgetUsages.map((u) => {
            const c = budgetStatusColor(u.status);
            return (
              <View key={u.category} style={{ marginBottom: 12 }}>
                <View style={[styles.catLabelRow, { flexDirection: dir.row }]}>
                  <Text style={[styles.catName, { color: colors.foreground }]}>{u.category}</Text>
                  <Text style={[styles.catPct, { color: c }]}>{Math.round(u.percent)}٪</Text>
                </View>
                <View style={[styles.catBar, { backgroundColor: colors.muted }]}>
                  <View style={[styles.catFill, { width: `${Math.min(100, u.percent)}%` as any, backgroundColor: c, position: 'absolute', ...(dir.isRTL ? { right: 0 } : { left: 0 }) }]} />
                </View>
                <Text style={[styles.budgetMeta, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
                  {formatCurrency(u.spent, currency)} {t.reports.ofLimit(formatCurrency(u.limit, currency))}
                </Text>
              </View>
            );
          })
        )}
      </Card>

      {totals.totalIncome === 0 && totals.totalCommitments === 0 && totals.totalExpenses === 0 && goals.length === 0 && activeSubs.length === 0 && budgetUsages.length === 0 && (
        <View style={styles.noData}>
          <Feather name="bar-chart-2" size={56} color={colors.mutedForeground} />
          <Text style={[styles.noDataTitle, { color: colors.foreground }]}>{t.reports.noDataTitle}</Text>
          <Text style={[styles.noDataSub, { color: colors.mutedForeground }]}>{t.reports.noDataSub}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {},
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  monthLabel: { fontSize: 16, fontFamily: 'Cairo_600SemiBold' },
  grid: { flexWrap: 'wrap', marginBottom: 16 },
  summaryCell: { borderWidth: 1 },
  cellLabel: { fontSize: 12, fontFamily: 'Cairo_400Regular', marginBottom: 4 },
  cellAmount: { fontSize: 15, fontFamily: 'Cairo_700Bold' },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', marginBottom: 14 },
  barChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 130, gap: 8 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barAmt: { fontSize: 10, fontFamily: 'Cairo_700Bold', marginBottom: 6, textAlign: 'center' },
  barTrack: { width: '80%', flex: 1, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden', maxHeight: 80 },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 11, fontFamily: 'Cairo_500Medium', marginTop: 6, textAlign: 'center' },
  catRow: { alignItems: 'center', marginBottom: 12 },
  catLabelRow: { justifyContent: 'space-between', marginBottom: 4 },
  catName: { flex: 1, minWidth: 0, fontSize: 13, fontFamily: 'Cairo_500Medium' },
  catPct: { fontSize: 12, fontFamily: 'Cairo_400Regular' },
  catAmt: { fontSize: 13, fontFamily: 'Cairo_700Bold', minWidth: 80 },
  catBar: { height: 6, borderRadius: 3, overflow: 'hidden', position: 'relative' },
  catFill: { height: 6, borderRadius: 3, top: 0, bottom: 0 },
  emptyText: { fontSize: 13, fontFamily: 'Cairo_400Regular', lineHeight: 20 },
  metaRow: { justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  metaLabel: { flex: 1, minWidth: 0, fontSize: 12, fontFamily: 'Cairo_500Medium' },
  metaValue: { fontSize: 14, fontFamily: 'Cairo_700Bold', flexShrink: 1, maxWidth: '48%' },
  pillRow: { flexWrap: 'wrap', gap: 6, marginTop: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  budgetMeta: { fontSize: 11, fontFamily: 'Cairo_400Regular', marginTop: 4 },
  noData: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  noDataTitle: { fontSize: 16, fontFamily: 'Cairo_600SemiBold' },
  noDataSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', textAlign: 'center' },
});
