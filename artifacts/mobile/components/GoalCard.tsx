import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useT } from '@/hooks/useT';
import { useResponsive } from '@/hooks/useResponsive';
import { formatCurrency } from '@/utils/format';
import type { SavingsGoal, GoalContribution } from '@/types';
import { getGoalProgress } from '@/utils/calculations';

interface Props {
  goal: SavingsGoal;
  contributions: GoalContribution[];
  currency: string;
  onPress?: () => void;
  compact?: boolean;
}

export function GoalCard({ goal, contributions, currency, onPress, compact = false }: Props) {
  const colors = useColors();
  const dir = useDir();
  const t = useT();
  const responsive = useResponsive();
  const prog = getGoalProgress(goal, contributions);
  const pct = Math.round(prog.percent);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.78 : 1}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius - 2,
          padding: compact ? responsive.compactCardPadding : responsive.cardPadding,
          marginBottom: 8,
        },
      ]}
    >
      <View style={[styles.headerRow, { flexDirection: dir.row }]}>
        <View style={[styles.iconCircle, { backgroundColor: goal.color + '22', borderColor: goal.color + '55' }]}>
          <Feather name={goal.icon as any} size={20} color={goal.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[styles.name, { textAlign: dir.textAlign, color: colors.foreground }]}>{goal.name}</Text>
          <Text style={[styles.sub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
            {formatCurrency(prog.saved, currency)} / {formatCurrency(goal.targetAmount, currency)}
          </Text>
        </View>
        <Text numberOfLines={1} style={[styles.pct, { color: goal.color }]}>{pct}٪</Text>
      </View>

      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.min(100, pct)}%` as any,
              backgroundColor: goal.color,
              ...(dir.isRTL ? { position: 'absolute', right: 0, top: 0, bottom: 0 } : {}),
            },
          ]}
        />
      </View>

      {!compact && prog.suggestedMonthly !== null && prog.suggestedMonthly > 0 ? (
        <Text style={[styles.suggest, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
          {t.goals.suggestedMonthly(formatCurrency(prog.suggestedMonthly, currency))}
        </Text>
      ) : null}

      {prog.isCompleted ? (
        <View style={[styles.doneBadge, { backgroundColor: colors.success + '22', borderColor: colors.success + '55' }]}>
          <Feather name="check" size={12} color={colors.success} />
          <Text style={[styles.doneText, { color: colors.success }]}>{t.goals.completed}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  headerRow: { alignItems: 'center', gap: 12, marginBottom: 10 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', marginBottom: 2 },
  sub: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  pct: { fontSize: 16, fontFamily: 'Cairo_700Bold', flexShrink: 1 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  suggest: { fontSize: 11, fontFamily: 'Cairo_400Regular', marginTop: 8 },
  doneBadge: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  doneText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
});
