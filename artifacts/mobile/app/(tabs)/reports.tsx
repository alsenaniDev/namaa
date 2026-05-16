import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatMonthYear } from '@/utils/format';
import { getExpensesByCategory, getCommitmentsByCategory } from '@/utils/calculations';
import { ProgressBar } from '@/components/ProgressBar';
import { Card } from '@/components/ui/Card';

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getMonthlyTotals, expenses, commitments, userProfile } = useApp();
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m);
    setYear(y);
  };

  const totals = getMonthlyTotals(month, year);
  const expCats = getExpensesByCategory(expenses, month, year);
  const comCats = getCommitmentsByCategory(commitments);

  const maxBar = Math.max(totals.totalIncome, totals.totalCommitments, totals.totalExpenses, 1);

  const BAR_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6B7280'];

  const sortedExpCats = Object.entries(expCats).sort((a, b) => b[1] - a[1]);
  const sortedComCats = Object.entries(comCats).sort((a, b) => b[1] - a[1]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + bottomPad + 90 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Month Selector */}
      <View style={[styles.monthBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => changeMonth(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="chevron-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.foreground }]}>{formatMonthYear(month, year)}</Text>
        <TouchableOpacity onPress={() => changeMonth(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="chevron-right" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.grid}>
        {[
          { label: 'الدخل', amount: totals.totalIncome, color: colors.income },
          { label: 'الالتزامات', amount: totals.totalCommitments, color: colors.commitment },
          { label: 'المصاريف', amount: totals.totalExpenses, color: colors.expense },
          { label: 'الصافي', amount: totals.netRemaining, color: totals.netRemaining >= 0 ? colors.success : colors.danger },
        ].map((item) => (
          <View key={item.label} style={[styles.summaryCell, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}>
            <Text style={[styles.cellLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
            <Text style={[styles.cellAmount, { color: item.color }]}>{formatCurrency(item.amount, currency)}</Text>
          </View>
        ))}
      </View>

      {/* Bar Chart */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>مقارنة بصرية</Text>
        <View style={styles.barChart}>
          {[
            { label: 'الدخل', value: totals.totalIncome, color: colors.income },
            { label: 'الالتزامات', value: totals.totalCommitments, color: colors.commitment },
            { label: 'المصاريف', value: totals.totalExpenses, color: colors.expense },
          ].map((bar) => {
            const pct = maxBar > 0 ? (bar.value / maxBar) * 100 : 0;
            return (
              <View key={bar.label} style={styles.barCol}>
                <Text style={[styles.barAmt, { color: bar.color }]}>{formatCurrency(bar.value, currency)}</Text>
                <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                  <View style={[styles.barFill, { height: `${pct}%`, backgroundColor: bar.color }]} />
                </View>
                <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{bar.label}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Percentages */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>نسبة الالتزامات والمصاريف</Text>
        <ProgressBar
          label="نسبة الالتزامات من الدخل"
          value={totals.totalCommitments}
          max={totals.totalIncome}
          color={totals.commitmentPercent > 70 ? colors.danger : totals.commitmentPercent > 50 ? colors.warning : colors.success}
        />
        <ProgressBar
          label="نسبة المصاريف من الدخل"
          value={totals.totalExpenses}
          max={totals.totalIncome}
          color={colors.expense}
        />
      </Card>

      {/* Expense by Category */}
      {sortedExpCats.length > 0 ? (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>المصاريف حسب الفئة</Text>
          {sortedExpCats.map(([cat, amt], i) => (
            <View key={cat} style={styles.catRow}>
              <Text style={[styles.catAmt, { color: BAR_COLORS[i % BAR_COLORS.length] }]}>{formatCurrency(amt, currency)}</Text>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={styles.catLabelRow}>
                  <Text style={[styles.catPct, { color: colors.mutedForeground }]}>
                    {totals.totalExpenses > 0 ? Math.round((amt / totals.totalExpenses) * 100) : 0}٪
                  </Text>
                  <Text style={[styles.catName, { color: colors.foreground }]}>{cat}</Text>
                </View>
                <View style={[styles.catBar, { backgroundColor: colors.muted }]}>
                  <View
                    style={[
                      styles.catBarFill,
                      {
                        width: totals.totalExpenses > 0 ? `${(amt / totals.totalExpenses) * 100}%` : '0%',
                        backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Commitment by Category */}
      {sortedComCats.length > 0 ? (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الالتزامات حسب الفئة</Text>
          {sortedComCats.map(([cat, amt], i) => (
            <View key={cat} style={styles.catRow}>
              <Text style={[styles.catAmt, { color: BAR_COLORS[(i + 3) % BAR_COLORS.length] }]}>{formatCurrency(amt, currency)}</Text>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={styles.catLabelRow}>
                  <Text style={[styles.catPct, { color: colors.mutedForeground }]}>
                    {totals.totalCommitments > 0 ? Math.round((amt / totals.totalCommitments) * 100) : 0}٪
                  </Text>
                  <Text style={[styles.catName, { color: colors.foreground }]}>{cat}</Text>
                </View>
                <View style={[styles.catBar, { backgroundColor: colors.muted }]}>
                  <View
                    style={[
                      styles.catBarFill,
                      {
                        width: totals.totalCommitments > 0 ? `${(amt / totals.totalCommitments) * 100}%` : '0%',
                        backgroundColor: BAR_COLORS[(i + 3) % BAR_COLORS.length],
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {/* No data */}
      {totals.totalIncome === 0 && totals.totalCommitments === 0 && totals.totalExpenses === 0 ? (
        <View style={styles.noData}>
          <Feather name="bar-chart-2" size={48} color={colors.mutedForeground} />
          <Text style={[styles.noDataText, { color: colors.mutedForeground }]}>لا توجد بيانات لهذا الشهر</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16 },
  monthBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  monthLabel: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  summaryCell: { width: '48%', padding: 14, borderWidth: 1 },
  cellLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'right', marginBottom: 4 },
  cellAmount: { fontSize: 15, fontFamily: 'Inter_700Bold', textAlign: 'right' },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', textAlign: 'right', marginBottom: 14 },
  barChart: { flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'flex-end', height: 160, gap: 8 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barAmt: { fontSize: 10, fontFamily: 'Inter_700Bold', marginBottom: 6, textAlign: 'center' },
  barTrack: { width: '100%', flex: 1, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden', maxHeight: 100 },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 6, textAlign: 'center' },
  catRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12 },
  catLabelRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  catPct: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  catAmt: { fontSize: 13, fontFamily: 'Inter_700Bold', marginLeft: 8, minWidth: 80, textAlign: 'left' },
  catBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  catBarFill: { height: 6, borderRadius: 3 },
  noData: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  noDataText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
});
