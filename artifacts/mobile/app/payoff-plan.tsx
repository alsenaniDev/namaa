import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { formatCurrency, getCurrentMonthYear } from '@/utils/format';
import { getPayoffPlan, PayoffStrategy, PayoffStrategyKind } from '@/utils/calculations';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { iosScrollViewObserverProps } from '@/utils/scrollView';

export default function PayoffPlanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dir = useDir();
  const t = useT();
  const { commitments, commitmentPayments, userProfile, getMonthlyTotals } = useApp();
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const { month, year } = getCurrentMonthYear();
  const totals = getMonthlyTotals(month, year);
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const plan = useMemo(
    () => getPayoffPlan(commitments, commitmentPayments, totals),
    [commitments, commitmentPayments, totals],
  );

  const capacityColor =
    plan.capacity === 'strong' ? colors.success :
      plan.capacity === 'balanced' ? colors.warning :
        colors.danger;
  const capacityTitle =
    plan.capacity === 'strong' ? t.payoffPlan.capacityStrong :
      plan.capacity === 'balanced' ? t.payoffPlan.capacityBalanced :
        t.payoffPlan.capacityTight;
  const capacityMessage =
    plan.capacity === 'strong' ? t.payoffPlan.capacityStrongMsg :
      plan.capacity === 'balanced' ? t.payoffPlan.capacityBalancedMsg :
        t.payoffPlan.capacityTightMsg;
  const best = plan.strategies[0];

  if (plan.debts.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState
          icon="award"
          title={t.payoffPlan.noLoansTitle}
          description={t.payoffPlan.noLoansDesc}
          actionLabel={t.commitments.addLabel}
          onAction={() => router.push('/commitments/add')}
        />
      </View>
    );
  }

  return (
    <ScrollView
      {...iosScrollViewObserverProps}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.hero}>
        <View style={[styles.heroTop, { flexDirection: dir.row }]}>
          <View style={[styles.heroIcon, { backgroundColor: capacityColor + '18' }]}>
            <Feather name="zap" size={24} color={capacityColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.payoffPlan.title}</Text>
            <Text style={[styles.heroSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{capacityMessage}</Text>
          </View>
        </View>
        <View style={[styles.capacityPill, { alignSelf: dir.isRTL ? 'flex-start' : 'flex-end', backgroundColor: capacityColor + '18' }]}>
          <Text style={[styles.capacityText, { color: capacityColor }]}>{capacityTitle}</Text>
        </View>
      </Card>

      <Card style={styles.amountsCard}>
        <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.payoffPlan.amountBreakdownTitle}</Text>
        <HighlightMetric
          icon="plus-circle"
          label={t.payoffPlan.monthlyExtra}
          value={formatCurrency(plan.suggestedExtraPayment, currency)}
          description={t.payoffPlan.monthlyExtraDesc}
          color={colors.success}
        />
        <HighlightMetric
          icon="shield"
          label={t.payoffPlan.safeBuffer}
          value={formatCurrency(plan.safeBuffer, currency)}
          description={t.payoffPlan.safeBufferDesc}
          color={colors.foreground}
        />
        <HighlightMetric
          icon="repeat"
          label={t.payoffPlan.freedPayment}
          value={formatCurrency(plan.freedPaymentFromCompleted, currency)}
          description={t.payoffPlan.freedPaymentDesc}
          color={colors.primary}
        />
        <HighlightMetric
          icon="calendar"
          label={t.payoffPlan.baseline}
          value={t.payoffPlan.months(plan.baselineMonths)}
          description={t.payoffPlan.baselineDesc}
          color={colors.commitment}
        />
      </Card>

      {plan.nextTarget ? (
        <Card style={styles.recommendation}>
          <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.payoffPlan.recommended}</Text>
          <View style={[styles.targetRow, { flexDirection: dir.row }]}>
            <View style={[styles.targetIcon, { backgroundColor: colors.commitment + '18' }]}>
              <Feather name="target" size={20} color={colors.commitment} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.targetTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{plan.nextTarget.title}</Text>
              <Text style={[styles.targetSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
                {t.payoffPlan.firstTarget}
              </Text>
              <Text style={[styles.targetAmount, { textAlign: dir.textAlign, color: colors.commitment }]}>
                {t.payoffPlan.remainingOnTarget(formatCurrency(plan.nextTarget.remainingAmount, currency))}
              </Text>
            </View>
          </View>
          <Button
            title={t.payoffPlan.viewCommitment}
            onPress={() => router.push({ pathname: '/commitments/[id]', params: { id: plan.nextTarget!.id } })}
            fullWidth
            style={{ marginTop: 12 }}
          />
        </Card>
      ) : null}

      <Card style={styles.recommendation}>
        <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.payoffPlan.rolloverTitle}</Text>
        <Text style={[styles.note, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
          {plan.freedPaymentFromCompleted > 0 && plan.nextTarget
            ? t.payoffPlan.rolloverCompleted(formatCurrency(plan.freedPaymentFromCompleted, currency), plan.nextTarget.title)
            : plan.nextFinishedDebt
              ? t.payoffPlan.rolloverUpcoming(plan.nextFinishedDebt.title, formatCurrency(plan.nextFinishedDebt.monthlyPayment, currency))
              : t.payoffPlan.rolloverFallback}
        </Text>
      </Card>

      <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.payoffPlan.strategiesTitle}</Text>
      {plan.strategies.map((strategy) => (
        <StrategyCard
          key={strategy.kind}
          strategy={strategy}
          currency={currency}
          isBest={best?.kind === strategy.kind}
        />
      ))}

      <Card style={styles.recommendation} padding={12}>
        <Text style={[styles.note, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.payoffPlan.disclaimer}</Text>
      </Card>
    </ScrollView>
  );
}

function HighlightMetric({
  icon,
  label,
  value,
  description,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  description: string;
  color: string;
}) {
  const colors = useColors();
  const dir = useDir();
  return (
    <View style={[styles.highlightMetric, { flexDirection: dir.row, borderColor: colors.border }]}>
      <View style={[styles.highlightIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.highlightLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.highlightValue, { textAlign: dir.textAlign, color }]}>{value}</Text>
        <Text style={[styles.highlightDesc, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{description}</Text>
      </View>
    </View>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  const dir = useDir();
  return (
    <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.metricLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]} numberOfLines={2}>{label}</Text>
      <Text style={[styles.metricValue, { textAlign: dir.textAlign, color }]}>{value}</Text>
    </View>
  );
}

function strategyText(kind: PayoffStrategyKind, t: ReturnType<typeof useT>): { title: string; desc: string; icon: string } {
  if (kind === 'cashflow') return { title: t.payoffPlan.strategyCashflow, desc: t.payoffPlan.strategyCashflowDesc, icon: 'repeat' };
  if (kind === 'quickWin') return { title: t.payoffPlan.strategyQuickWin, desc: t.payoffPlan.strategyQuickWinDesc, icon: 'clock' };
  return { title: t.payoffPlan.strategySnowball, desc: t.payoffPlan.strategySnowballDesc, icon: 'circle' };
}

function StrategyCard({ strategy, currency, isBest }: { strategy: PayoffStrategy; currency: string; isBest: boolean }) {
  const colors = useColors();
  const dir = useDir();
  const t = useT();
  const text = strategyText(strategy.kind, t);
  const accent = isBest ? colors.success : colors.commitment;

  return (
    <Card style={styles.strategy}>
      <View style={[styles.strategyHeader, { flexDirection: dir.row }]}>
        <View style={[styles.strategyIcon, { backgroundColor: accent + '18' }]}>
          <Feather name={text.icon as any} size={18} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.strategyTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{text.title}</Text>
          <Text style={[styles.strategyDesc, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{text.desc}</Text>
        </View>
        {isBest ? (
          <View style={[styles.bestPill, { backgroundColor: colors.success + '18' }]}>
            <Text style={[styles.bestText, { color: colors.success }]}>{t.payoffPlan.best}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.strategyStats, { flexDirection: dir.row }]}>
        <Metric label={t.payoffPlan.monthsToFree} value={t.payoffPlan.months(strategy.monthsToDebtFree)} color={accent} />
        <Metric label={t.payoffPlan.monthsSaved} value={t.payoffPlan.months(strategy.monthsSaved)} color={colors.success} />
      </View>

      <Text style={[styles.orderTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.payoffPlan.orderTitle}</Text>
      {strategy.order.slice(0, 4).map((debt, index) => (
        <View key={debt.id} style={[styles.orderRow, { flexDirection: dir.row, borderBottomColor: colors.border }]}>
          <Text style={[styles.orderIndex, { color: accent }]}>{index + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.orderName, { textAlign: dir.textAlign, color: colors.foreground }]} numberOfLines={1}>{debt.title}</Text>
            <Text style={[styles.orderSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
              {t.payoffPlan.remainingOnTarget(formatCurrency(debt.remainingAmount, currency))}
            </Text>
          </View>
        </View>
      ))}
      <Text style={[styles.note, { textAlign: dir.textAlign, color: colors.mutedForeground, marginTop: 8 }]}>
        {t.payoffPlan.finalFreed(formatCurrency(strategy.finalMonthlyFreed, currency))}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  hero: { marginBottom: 12 },
  heroTop: { alignItems: 'center', gap: 12, marginBottom: 12 },
  heroIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', marginBottom: 3 },
  heroSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 18 },
  capacityPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  capacityText: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
  amountsCard: { marginBottom: 12 },
  highlightMetric: { alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  highlightIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  highlightLabel: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', marginBottom: 2 },
  highlightValue: { fontSize: 22, fontFamily: 'Cairo_700Bold', marginBottom: 3 },
  highlightDesc: { fontSize: 11, fontFamily: 'Cairo_400Regular', lineHeight: 16 },
  metric: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 82 },
  metricValue: { fontSize: 17, fontFamily: 'Cairo_700Bold', marginTop: 4 },
  metricLabel: { fontSize: 11, fontFamily: 'Cairo_400Regular', lineHeight: 16 },
  recommendation: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', marginBottom: 8 },
  targetRow: { alignItems: 'center', gap: 10 },
  targetIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  targetTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', marginBottom: 2 },
  targetSub: { fontSize: 12, fontFamily: 'Cairo_400Regular' },
  targetAmount: { fontSize: 13, fontFamily: 'Cairo_700Bold', marginTop: 4 },
  note: { fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 19 },
  strategy: { marginBottom: 10 },
  strategyHeader: { alignItems: 'center', gap: 10, marginBottom: 12 },
  strategyIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  strategyTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', marginBottom: 2 },
  strategyDesc: { fontSize: 11, fontFamily: 'Cairo_400Regular', lineHeight: 16 },
  bestPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  bestText: { fontSize: 10, fontFamily: 'Cairo_700Bold' },
  strategyStats: { gap: 8, marginBottom: 12 },
  orderTitle: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', marginBottom: 6 },
  orderRow: { alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  orderIndex: { width: 22, fontSize: 14, fontFamily: 'Cairo_700Bold', textAlign: 'center' },
  orderName: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
  orderSub: { fontSize: 11, fontFamily: 'Cairo_400Regular', marginTop: 2 },
});
