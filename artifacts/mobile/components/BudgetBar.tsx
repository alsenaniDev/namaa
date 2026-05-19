import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useT } from '@/hooks/useT';
import { Card } from './ui/Card';
import { formatCurrency } from '@/utils/format';

interface BudgetBarProps {
  income: number;
  committed: number;
  spent: number;
  currency: string;
}

export function BudgetBar({ income, committed, spent, currency }: BudgetBarProps) {
  const colors = useColors();
  const dir = useDir();
  const t = useT();

  const totalOut = committed + spent;
  const available = income - totalOut;
  const overSpent = available < 0;

  // Segment widths: if income exceeds usage, distribute over income. If
  // usage exceeds income, distribute over totalOut so segments still fill 100%.
  const denom = Math.max(income, totalOut, 1);
  const wCommitted = (committed / denom) * 100;
  const wSpent = (spent / denom) * 100;
  const wAvailable = overSpent ? 0 : (available / denom) * 100;

  return (
    <Card style={styles.card}>
      <View style={[styles.headerRow, { flexDirection: dir.row }]}>
        <Text style={[styles.title, { color: colors.foreground, textAlign: dir.textAlign }]}>{t.dashboard.budgetBarTitle}</Text>
        <Text style={[styles.income, { color: colors.income }]}>{formatCurrency(income, currency)}</Text>
      </View>

      <View style={[styles.track, { backgroundColor: colors.muted, flexDirection: dir.row }]}>
        {wCommitted > 0 ? (
          <View style={{ width: `${wCommitted}%` as any, backgroundColor: colors.commitment }} />
        ) : null}
        {wSpent > 0 ? (
          <View style={{ width: `${wSpent}%` as any, backgroundColor: colors.expense }} />
        ) : null}
        {wAvailable > 0 ? (
          <View style={{ width: `${wAvailable}%` as any, backgroundColor: colors.success }} />
        ) : null}
      </View>

      <View style={[styles.legendRow, { flexDirection: dir.row }]}>
        <LegendChip color={colors.commitment} label={t.dashboard.committed} amount={formatCurrency(committed, currency)} />
        <LegendChip color={colors.expense} label={t.dashboard.spent} amount={formatCurrency(spent, currency)} />
        <LegendChip
          color={overSpent ? colors.danger : colors.success}
          label={overSpent ? t.dashboard.overSpent : t.dashboard.available}
          amount={formatCurrency(Math.abs(available), currency)}
        />
      </View>
    </Card>
  );
}

function LegendChip({ color, label, amount }: { color: string; label: string; amount: string }) {
  const colors = useColors();
  const dir = useDir();
  return (
    <View style={[styles.legend, { flex: 1 }]}>
      <View style={[styles.legendHeader, { flexDirection: dir.row }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.legendLabel, { color: colors.mutedForeground, textAlign: dir.textAlign }]} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[styles.legendAmount, { color: colors.foreground, textAlign: dir.textAlign }]} numberOfLines={1}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  headerRow: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  income: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  track: { height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  legendRow: { gap: 10 },
  legend: { minWidth: 0 },
  legendHeader: { alignItems: 'center', gap: 6, marginBottom: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', flex: 1 },
  legendAmount: { fontSize: 13, fontFamily: 'Inter_700Bold' },
});
