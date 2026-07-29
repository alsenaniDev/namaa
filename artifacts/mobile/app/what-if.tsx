import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { formatCurrency, getCurrentMonthYear, toAsciiDigits } from '@/utils/format';
import {
  getSubscriptionMonthlyEquivalent,
  getCommitmentMonthlyShare,
  isCommitmentInMonthlyBudget,
  getWhatIfSimulation,
  getCustomWhatIfSimulation,
  WhatIfScenarioKind,
  WhatIfSimulationResult,
} from '@/utils/calculations';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { iosScrollViewObserverProps } from '@/utils/scrollView';

const SCENARIOS: { kind: WhatIfScenarioKind; icon: string; defaultAmount: string }[] = [
  { kind: 'extraDebtPayment', icon: 'zap', defaultAmount: '500' },
  { kind: 'cancelSubscription', icon: 'x-circle', defaultAmount: '99' },
  { kind: 'incomeIncrease', icon: 'trending-up', defaultAmount: '1000' },
  { kind: 'newInstallment', icon: 'shopping-cart', defaultAmount: '850' },
  { kind: 'incomeDecrease', icon: 'trending-down', defaultAmount: '1000' },
  { kind: 'payoffCommitment', icon: 'check-circle', defaultAmount: '850' },
  { kind: 'customPlan', icon: 'layers', defaultAmount: '0' },
];

export default function WhatIfScreen() {
  const colors = useColors();
  const dir = useDir();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { userProfile, commitments, commitmentPayments, subscriptions, getMonthlyTotals } = useApp();
  const { month, year } = getCurrentMonthYear();
  const totals = getMonthlyTotals(month, year);
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [scenario, setScenario] = useState<WhatIfScenarioKind>('newInstallment');
  const [amount, setAmount] = useState('850');
  const [customIncomeIncrease, setCustomIncomeIncrease] = useState('');
  const [customIncomeDecrease, setCustomIncomeDecrease] = useState('');
  const [customNewInstallment, setCustomNewInstallment] = useState('');
  const [customNewInstallmentShareCount, setCustomNewInstallmentShareCount] = useState('1');
  const [customExtraDebtPayment, setCustomExtraDebtPayment] = useState('');
  const [selectedCommitmentIds, setSelectedCommitmentIds] = useState<string[]>([]);
  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState<string[]>([]);
  const activeCommitments = useMemo(
    () => commitments
      .filter((commitment) => isCommitmentInMonthlyBudget(commitment, commitmentPayments))
      .sort((a, b) => b.amount - a.amount),
    [commitments, commitmentPayments],
  );
  const activeSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => subscription.isActive).sort((a, b) => getSubscriptionMonthlyEquivalent(b) - getSubscriptionMonthlyEquivalent(a)),
    [subscriptions],
  );
  const selectedCommitmentAmount = useMemo(
    () => activeCommitments
      .filter((commitment) => selectedCommitmentIds.includes(commitment.id))
      .reduce((sum, commitment) => sum + getCommitmentMonthlyShare(commitment), 0),
    [activeCommitments, selectedCommitmentIds],
  );
  const selectedSubscriptionAmount = useMemo(
    () => activeSubscriptions
      .filter((subscription) => selectedSubscriptionIds.includes(subscription.id))
      .reduce((sum, subscription) => sum + getSubscriptionMonthlyEquivalent(subscription), 0),
    [activeSubscriptions, selectedSubscriptionIds],
  );
  const numericAmount =
    scenario === 'payoffCommitment' ? selectedCommitmentAmount :
      scenario === 'cancelSubscription' ? selectedSubscriptionAmount :
        Number(amount) || 0;
  const customNewInstallmentAmount = parseMoney(customNewInstallment);
  const customShareCount = Math.max(1, parseInt(toAsciiDigits(customNewInstallmentShareCount), 10) || 1);
  const selectedMonthlyImpactAmount = scenario === 'customPlan'
    ? selectedCommitmentAmount + selectedSubscriptionAmount + (customNewInstallmentAmount / customShareCount) + parseMoney(customExtraDebtPayment)
    : numericAmount;

  const result = useMemo(
    () => scenario === 'customPlan'
      ? getCustomWhatIfSimulation(
        totals,
        {
          incomeIncrease: parseMoney(customIncomeIncrease),
          incomeDecrease: parseMoney(customIncomeDecrease),
          newInstallment: customNewInstallmentAmount,
          newInstallmentShareCount: customShareCount,
          paidOffCommitments: selectedCommitmentAmount,
          canceledSubscriptions: selectedSubscriptionAmount,
          extraDebtPayment: parseMoney(customExtraDebtPayment),
        },
        userProfile?.monthlySavingGoal ?? 0,
        userProfile?.financialMonthStartDay ?? 1,
      )
      : getWhatIfSimulation(
        totals,
        scenario,
        numericAmount,
        userProfile?.monthlySavingGoal ?? 0,
        userProfile?.financialMonthStartDay ?? 1,
      ),
    [
      totals,
      scenario,
      numericAmount,
      userProfile?.monthlySavingGoal,
      userProfile?.financialMonthStartDay,
      customIncomeIncrease,
      customIncomeDecrease,
      customNewInstallmentAmount,
      customShareCount,
      selectedCommitmentAmount,
      selectedSubscriptionAmount,
      customExtraDebtPayment,
    ],
  );

  const selected = scenarioText(scenario, t);
  const selectedImpactLabel =
    scenario === 'payoffCommitment' && selectedCommitmentIds.length > 0
      ? t.whatIf.selectedCommitmentsImpact(selectedCommitmentIds.length)
      : scenario === 'cancelSubscription' && selectedSubscriptionIds.length > 0
        ? t.whatIf.selectedSubscriptionsImpact(selectedSubscriptionIds.length)
        : scenario === 'customPlan'
          ? t.whatIf.customImpactLabel
          : selected.impactLabel;
  const usesCommitmentSelection = scenario === 'payoffCommitment' || scenario === 'customPlan';
  const usesSubscriptionSelection = scenario === 'cancelSubscription' || scenario === 'customPlan';

  return (
    <ScrollView
      {...iosScrollViewObserverProps}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.hero}>
        <View style={[styles.heroTop, { flexDirection: dir.row }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary + '18' }]}>
            <Feather name="help-circle" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.whatIf.title}</Text>
            <Text style={[styles.heroSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.whatIf.subtitle}</Text>
          </View>
        </View>
        <Text style={[styles.heroNote, { textAlign: dir.textAlign, color: colors.primary }]}>{t.whatIf.safeMode}</Text>
      </Card>

      <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.whatIf.chooseScenario}</Text>
      <View style={styles.scenarioGrid}>
        {SCENARIOS.map((item) => {
          const text = scenarioText(item.kind, t);
          const active = item.kind === scenario;
          return (
            <TouchableOpacity
              key={item.kind}
              activeOpacity={0.78}
              onPress={() => {
                setScenario(item.kind);
                if (item.kind !== 'payoffCommitment' && item.kind !== 'cancelSubscription' && item.kind !== 'customPlan') {
                  setAmount(item.defaultAmount);
                }
              }}
              style={[
                styles.scenarioChip,
                {
                  flexDirection: dir.row,
                  backgroundColor: active ? colors.primary + '12' : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={[styles.scenarioIcon, { backgroundColor: (active ? colors.primary : colors.mutedForeground) + '16' }]}>
                <Feather name={item.icon as any} size={16} color={active ? colors.primary : colors.mutedForeground} />
              </View>
              <Text style={[styles.scenarioLabel, { textAlign: dir.textAlign, color: active ? colors.primary : colors.foreground }]}>{text.shortTitle}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Card style={styles.inputCard}>
        <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{selected.question}</Text>
        {scenario === 'customPlan' ? (
          <View style={styles.customFields}>
            <View style={[styles.dualInputs, { flexDirection: dir.row }]}>
              <View style={styles.dualInput}>
                <Input label={t.whatIf.customIncomeIncreaseLabel} value={customIncomeIncrease} onChangeText={setCustomIncomeIncrease} keyboardType="decimal-pad" placeholder="0" />
              </View>
              <View style={styles.dualInput}>
                <Input label={t.whatIf.customIncomeDecreaseLabel} value={customIncomeDecrease} onChangeText={setCustomIncomeDecrease} keyboardType="decimal-pad" placeholder="0" />
              </View>
            </View>
            <Input label={t.whatIf.customNewLoanLabel} value={customNewInstallment} onChangeText={setCustomNewInstallment} keyboardType="decimal-pad" placeholder="0" />
            <Input label={t.whatIf.customSplitCountLabel} value={customNewInstallmentShareCount} onChangeText={setCustomNewInstallmentShareCount} keyboardType="number-pad" placeholder="1" />
            {customNewInstallmentAmount > 0 ? (
              <View style={[styles.selectedTotal, { flexDirection: dir.row, backgroundColor: colors.commitment + '10', borderColor: colors.commitment + '30' }]}>
                <Text style={[styles.selectedTotalLabel, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.whatIf.customNewLoanShare}</Text>
                <Text style={[styles.selectedTotalAmount, { color: colors.commitment }]}>{formatCurrency(customNewInstallmentAmount / customShareCount, currency)}</Text>
              </View>
            ) : null}
            <Text style={[styles.subSectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.whatIf.customPayoffTitle}</Text>
            <SelectableList
              items={activeCommitments.map((commitment) => ({
                id: commitment.id,
                title: commitment.title,
                subtitle: commitment.category,
                amount: getCommitmentMonthlyShare(commitment),
              }))}
              selectedIds={selectedCommitmentIds}
              onToggle={(id) => setSelectedCommitmentIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id])}
              emptyText={t.whatIf.noCommitments}
              currency={currency}
            />
            <Text style={[styles.subSectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.whatIf.customSubscriptionsTitle}</Text>
            <SelectableList
              items={activeSubscriptions.map((subscription) => ({
                id: subscription.id,
                title: subscription.name,
                subtitle: t.whatIf.monthlyEquivalent,
                amount: getSubscriptionMonthlyEquivalent(subscription),
              }))}
              selectedIds={selectedSubscriptionIds}
              onToggle={(id) => setSelectedSubscriptionIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id])}
              emptyText={t.whatIf.noSubscriptions}
              currency={currency}
            />
            <Input label={t.whatIf.customExtraPayoffLabel} value={customExtraDebtPayment} onChangeText={setCustomExtraDebtPayment} keyboardType="decimal-pad" placeholder="0" />
          </View>
        ) : usesCommitmentSelection ? (
          <SelectableList
            items={activeCommitments.map((commitment) => ({
              id: commitment.id,
              title: commitment.title,
              subtitle: commitment.category,
              amount: getCommitmentMonthlyShare(commitment),
            }))}
            selectedIds={selectedCommitmentIds}
            onToggle={(id) => setSelectedCommitmentIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id])}
            emptyText={t.whatIf.noCommitments}
            currency={currency}
          />
        ) : usesSubscriptionSelection ? (
          <SelectableList
            items={activeSubscriptions.map((subscription) => ({
              id: subscription.id,
              title: subscription.name,
              subtitle: t.whatIf.monthlyEquivalent,
              amount: getSubscriptionMonthlyEquivalent(subscription),
            }))}
            selectedIds={selectedSubscriptionIds}
            onToggle={(id) => setSelectedSubscriptionIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id])}
            emptyText={t.whatIf.noSubscriptions}
            currency={currency}
          />
        ) : (
          <Input
            label={t.whatIf.amountLabel}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        )}
        <Text style={[styles.inputHint, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{selected.amountHint}</Text>
        {(usesCommitmentSelection || usesSubscriptionSelection) ? (
          <View style={[styles.selectedTotal, { flexDirection: dir.row, backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <Text style={[styles.selectedTotalLabel, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.whatIf.selectedMonthlyImpact}</Text>
            <Text style={[styles.selectedTotalAmount, { color: colors.primary }]}>{formatCurrency(selectedMonthlyImpactAmount, currency)}</Text>
          </View>
        ) : null}
      </Card>

      <Card style={styles.resultCard}>
        <View style={[styles.resultHeader, { flexDirection: dir.row }]}>
          <View style={[styles.resultIcon, { backgroundColor: result.dailyBudgetDelta >= 0 ? colors.success + '18' : colors.danger + '18' }]}>
            <Feather name={result.dailyBudgetDelta >= 0 ? 'arrow-up-circle' : 'arrow-down-circle'} size={20} color={result.dailyBudgetDelta >= 0 ? colors.success : colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.resultTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.whatIf.resultTitle}</Text>
            <Text style={[styles.resultSummary, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
              {scenario === 'customPlan'
                ? t.whatIf.customSummary(
                  t.whatIf.percent(result.beforeCommitmentPercent),
                  t.whatIf.percent(result.afterCommitmentPercent),
                  formatCurrency(result.beforeDailyBudget, currency),
                  formatCurrency(result.afterDailyBudget, currency),
                  formatCurrency(result.afterAllocation.remainingSpendable, currency),
                )
                : resultSummary(result, selectedImpactLabel, currency, t)}
            </Text>
          </View>
        </View>

        <View style={[styles.compareGrid, { flexDirection: dir.row }]}>
          <CompareMetric
            label={t.whatIf.commitmentRatio}
            before={t.whatIf.percent(result.beforeCommitmentPercent)}
            after={t.whatIf.percent(result.afterCommitmentPercent)}
            color={result.commitmentPercentDelta > 0 ? colors.danger : colors.success}
          />
          <CompareMetric
            label={t.whatIf.dailyBudget}
            before={formatCurrency(result.beforeDailyBudget, currency)}
            after={formatCurrency(result.afterDailyBudget, currency)}
            color={result.dailyBudgetDelta < 0 ? colors.danger : colors.success}
          />
        </View>

        <View style={styles.detailRows}>
          <DetailRow label={t.whatIf.currentIncome} value={formatCurrency(result.beforeTotals.totalIncome, currency)} color={colors.mutedForeground} />
          <DetailRow label={t.whatIf.currentCommitments} value={formatCurrency(result.beforeTotals.totalCommitments, currency)} color={colors.mutedForeground} />
          <DetailRow label={t.whatIf.income} value={formatCurrency(result.afterTotals.totalIncome, currency)} color={colors.income} />
          <DetailRow label={t.whatIf.commitments} value={formatCurrency(result.afterTotals.totalCommitments, currency)} color={colors.commitment} />
          <DetailRow label={t.whatIf.extraPayoff} value={formatCurrency(result.extraDebtPaymentAfter, currency)} color={colors.primary} />
          <DetailRow label={t.whatIf.spendableRemaining} value={formatCurrency(result.afterAllocation.remainingSpendable, currency)} color={result.afterAllocation.remainingSpendable < 0 ? colors.danger : colors.foreground} />
        </View>
      </Card>

      <Card style={styles.tipCard} padding={12}>
        <Text style={[styles.tipText, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.whatIf.disclaimer}</Text>
      </Card>
    </ScrollView>
  );
}

function SelectableList({
  items,
  selectedIds,
  onToggle,
  emptyText,
  currency,
}: {
  items: { id: string; title: string; subtitle: string; amount: number }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyText: string;
  currency: string;
}) {
  const colors = useColors();
  const dir = useDir();
  if (items.length === 0) {
    return <Text style={[styles.emptySelection, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{emptyText}</Text>;
  }
  return (
    <View style={styles.selectionList}>
      {items.map((item) => {
        const selected = selectedIds.includes(item.id);
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.75}
            onPress={() => onToggle(item.id)}
            style={[
              styles.selectionRow,
              {
                flexDirection: dir.row,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primary + '10' : colors.card,
              },
            ]}
          >
            <View style={[styles.selectionCheck, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : 'transparent' }]}>
              {selected ? <Feather name="check" size={13} color="#fff" /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.selectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.selectionSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{item.subtitle}</Text>
            </View>
            <Text style={[styles.selectionAmount, { color: colors.commitment }]}>{formatCurrency(item.amount, currency)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function scenarioText(kind: WhatIfScenarioKind, t: ReturnType<typeof useT>) {
  return t.whatIf.scenarios[kind];
}

function parseMoney(value: string): number {
  const normalized = toAsciiDigits(value).replace(/[^\d.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resultSummary(
  result: WhatIfSimulationResult,
  impactLabel: string,
  currency: string,
  t: ReturnType<typeof useT>,
) {
  return t.whatIf.summary(
    impactLabel,
    formatCurrency(result.amount, currency),
    t.whatIf.percent(result.beforeCommitmentPercent),
    t.whatIf.percent(result.afterCommitmentPercent),
    formatCurrency(result.beforeDailyBudget, currency),
    formatCurrency(result.afterDailyBudget, currency),
  );
}

function CompareMetric({
  label,
  before,
  after,
  color,
}: {
  label: string;
  before: string;
  after: string;
  color: string;
}) {
  const colors = useColors();
  const dir = useDir();
  const t = useT();
  return (
    <View style={[styles.compareMetric, { borderColor: colors.border }]}>
      <Text style={[styles.compareLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.compareBefore, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.whatIf.before}: {before}</Text>
      <Text style={[styles.compareAfter, { textAlign: dir.textAlign, color }]}>{t.whatIf.after}: {after}</Text>
    </View>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  const dir = useDir();
  return (
    <View style={[styles.detailRow, { flexDirection: dir.row, borderBottomColor: colors.border }]}>
      <Text style={[styles.detailLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  hero: { marginBottom: 14 },
  heroTop: { alignItems: 'center', gap: 12, marginBottom: 10 },
  heroIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', marginBottom: 3 },
  heroSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 18 },
  heroNote: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', lineHeight: 18 },
  sectionTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', marginBottom: 10 },
  scenarioGrid: { gap: 8, marginBottom: 12 },
  scenarioChip: { alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10 },
  scenarioIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  scenarioLabel: { flex: 1, fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
  inputCard: { marginBottom: 12 },
  customFields: { gap: 2 },
  dualInputs: { gap: 10 },
  dualInput: { flex: 1, minWidth: 0 },
  subSectionTitle: { fontSize: 13, fontFamily: 'Cairo_700Bold', marginTop: 8, marginBottom: 8 },
  inputHint: { fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 18 },
  selectionList: { gap: 8, marginBottom: 10 },
  selectionRow: { alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 12, padding: 10 },
  selectionCheck: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  selectionTitle: { fontSize: 13, fontFamily: 'Cairo_700Bold', marginBottom: 2 },
  selectionSub: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  selectionAmount: { fontSize: 12, fontFamily: 'Cairo_700Bold', flexShrink: 0 },
  emptySelection: { fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 18, marginBottom: 10 },
  selectedTotal: { alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 10 },
  selectedTotalLabel: { flex: 1, fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
  selectedTotalAmount: { fontSize: 13, fontFamily: 'Cairo_700Bold', flexShrink: 0 },
  resultCard: { marginBottom: 12 },
  resultHeader: { alignItems: 'center', gap: 10, marginBottom: 12 },
  resultIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  resultTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', marginBottom: 3 },
  resultSummary: { fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 18 },
  compareGrid: { gap: 8, marginBottom: 10 },
  compareMetric: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 12, padding: 10 },
  compareLabel: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', marginBottom: 6 },
  compareBefore: { fontSize: 11, fontFamily: 'Cairo_400Regular', marginBottom: 3 },
  compareAfter: { fontSize: 14, fontFamily: 'Cairo_700Bold' },
  detailRows: { marginTop: 2 },
  detailRow: { alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  detailLabel: { flex: 1, fontSize: 12, fontFamily: 'Cairo_400Regular' },
  detailValue: { fontSize: 12, fontFamily: 'Cairo_700Bold', flexShrink: 0 },
  tipCard: { marginBottom: 4 },
  tipText: { fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 18 },
});
