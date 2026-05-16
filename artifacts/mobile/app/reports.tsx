import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { formatCurrency, formatMonthYear } from '@/utils/format';
import { getExpensesByCategory, getCommitmentsByCategory } from '@/utils/calculations';
import { ProgressBar } from '@/components/ProgressBar';
import { Card } from '@/components/ui/Card';

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const dir = useDir();
  const { getMonthlyTotals, expenses, commitments, userProfile } = useApp();
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
  const comCats = getCommitmentsByCategory(commitments);
  const BAR_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
  const sortedExpCats = Object.entries(expCats).sort((a, b) => b[1] - a[1]);
  const sortedComCats = Object.entries(comCats).sort((a, b) => b[1] - a[1]);
  const maxBar = Math.max(totals.totalIncome, totals.totalCommitments, totals.totalExpenses, 1);
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
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
      <View style={[styles.grid, { flexDirection: dir.row }]}>
        {[
          { label: t.reports.income, amount: totals.totalIncome, color: colors.income },
          { label: t.reports.commitments, amount: totals.totalCommitments, color: colors.commitment },
          { label: t.reports.expenses, amount: totals.totalExpenses, color: colors.expense },
          { label: t.reports.net, amount: totals.netRemaining, color: totals.netRemaining >= 0 ? colors.success : colors.danger },
        ].map((item) => (
          <View key={item.label} style={[styles.summaryCell, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}>
            <Text style={[styles.cellLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{item.label}</Text>
            <Text style={[styles.cellAmount, { textAlign: dir.textAlign, color: item.color }]}>{formatCurrency(item.amount, currency)}</Text>
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
                <View style={{ flex: 1, marginLeft: 12 }}>
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
                <View style={{ flex: 1, marginLeft: 12 }}>
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

      {totals.totalIncome === 0 && totals.totalCommitments === 0 && totals.totalExpenses === 0 && (
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
  content: { paddingHorizontal: 16, paddingTop: 16 },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  monthLabel: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  grid: { flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  summaryCell: { width: '48%', padding: 14, borderWidth: 1 },
  cellLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  cellAmount: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 14 },
  barChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 130, gap: 8 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barAmt: { fontSize: 10, fontFamily: 'Inter_700Bold', marginBottom: 6, textAlign: 'center' },
  barTrack: { width: '80%', flex: 1, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden', maxHeight: 80 },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 6, textAlign: 'center' },
  catRow: { alignItems: 'center', marginBottom: 12 },
  catLabelRow: { justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  catPct: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  catAmt: { fontSize: 13, fontFamily: 'Inter_700Bold', minWidth: 80 },
  catBar: { height: 6, borderRadius: 3, overflow: 'hidden', position: 'relative' },
  catFill: { height: 6, borderRadius: 3, top: 0, bottom: 0 },
  noData: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  noDataTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  noDataSub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
