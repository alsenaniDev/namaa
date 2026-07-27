import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency, formatShortDate, getCurrentMonthYear, getGregorianDateLocale, parseDateLocal } from '@/utils/format';
import {
  getUpcomingCommitments,
  getBudgetUsages,
  getGoalProgress,
  getCommitmentsOverview,
  getCommitmentMonthlyShare,
  getSalaryAllocationPlan,
  getMonthlySubscriptionTotal,
  SalaryAllocationPlan,
} from '@/utils/calculations';
import { getInsights } from '@/utils/insights';
import { HealthStatusCard } from '@/components/HealthStatusCard';
import { BudgetBar } from '@/components/BudgetBar';
import { QuickActions } from '@/components/QuickActions';
import { InsightCard } from '@/components/InsightCard';
import { Card } from '@/components/ui/Card';
import { GoalCard } from '@/components/GoalCard';
import { BudgetRow } from '@/components/BudgetRow';
import { getSalaryCountdown } from '@/utils/salaryCountdown';
import { ACHIEVEMENT_IDS } from '@/utils/achievements';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dir = useDir();
  const router = useRouter();
  const { userProfile, commitments, commitmentPayments, expenses, goals, goalContributions, budgets, subscriptions, achievements, getMonthlyTotals } = useApp();
  const { language } = useLanguage();
  const t = useT();
  const { month, year } = getCurrentMonthYear();
  const totals = getMonthlyTotals(month, year);
  const currency = userProfile?.preferredCurrency ?? 'SAR';

  const upcoming = getUpcomingCommitments(commitments, commitmentPayments).slice(0, 3);

  const insights = useMemo(
    () => getInsights({
      totals,
      commitments,
      payments: commitmentPayments,
      expenses,
      month,
      year,
      currency,
      lang: language as 'ar' | 'en',
      savingGoal: userProfile?.monthlySavingGoal ?? 0,
      goals,
      goalContributions,
      budgets,
      subscriptions,
    }).slice(0, 3),
    [totals, commitments, commitmentPayments, expenses, month, year, currency, language, userProfile?.monthlySavingGoal, goals, goalContributions, budgets, subscriptions],
  );

  const activeGoals = useMemo(
    () => goals
      .filter((g) => !g.isCompleted)
      .sort((a, b) => getGoalProgress(b, goalContributions).percent - getGoalProgress(a, goalContributions).percent)
      .slice(0, 2),
    [goals, goalContributions],
  );

  const budgetWarnings = useMemo(
    () => getBudgetUsages(budgets, expenses, month, year).filter((u) => u.status !== 'safe').slice(0, 2),
    [budgets, expenses, month, year],
  );

  const commitmentsOverview = useMemo(
    () => getCommitmentsOverview(commitments, commitmentPayments),
    [commitments, commitmentPayments],
  );
  const activeSubscriptionCount = subscriptions.filter((s) => s.isActive).length;
  const subscriptionMonthlyTotal = getMonthlySubscriptionTotal(subscriptions);

  const salaryAllocation = useMemo(
    () => getSalaryAllocationPlan(
      totals,
      userProfile?.monthlySavingGoal ?? 0,
      userProfile?.financialMonthStartDay ?? 1,
    ),
    [totals, userProfile?.monthlySavingGoal, userProfile?.financialMonthStartDay],
  );

  const salaryCountdown = useMemo(
    () => getSalaryCountdown(totals, expenses, userProfile?.financialMonthStartDay ?? 1),
    [totals, expenses, userProfile?.financialMonthStartDay],
  );

  const recentExpenses = useMemo(
    () => [...expenses]
      .sort((a, b) => {
        const bd = parseDateLocal(b.expenseDate)?.getTime() ?? 0;
        const ad = parseDateLocal(a.expenseDate)?.getTime() ?? 0;
        if (bd !== ad) return bd - ad;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 3),
    [expenses],
  );

  const today = new Date();
  const locale = getGregorianDateLocale(language);
  const dayName = today.toLocaleDateString(locale, { weekday: 'long' });
  const dateStr = today.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });

  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: 16, paddingBottom: insets.bottom + bottomPad + 90 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={[styles.greetRow, { flexDirection: dir.row }]}>
        <View style={[styles.avatarWrap, { backgroundColor: colors.primary + '20', borderRadius: 26 }]}>
          <Feather name="user" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dateText, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{dayName}، {dateStr}</Text>
          <Text style={[styles.greetText, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.dashboard.greeting}، {userProfile?.name ?? ''}</Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => router.push('/commitments/overview' as any)}
        style={[styles.totalCommitmentsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={[styles.debtHeader, { flexDirection: dir.row }]}>
          <View style={[styles.debtIconWrap, { backgroundColor: colors.commitment + '18' }]}>
            <Feather name="shield" size={22} color={colors.commitment} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.debtLabel, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{t.dashboard.totalOwedTitle}</Text>
            <Text style={[styles.debtAmount, { color: colors.foreground, textAlign: dir.textAlign }]}>{formatCurrency(commitmentsOverview.totalOwed, currency)}</Text>
          </View>
          <Feather name={dir.chevronDetail as any} size={18} color={colors.mutedForeground} />
        </View>

        <View style={[styles.debtProgressTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.debtProgressFill,
              {
                width: `${commitmentsOverview.progressPercent}%`,
                backgroundColor: colors.commitment,
                ...(dir.isRTL ? { right: 0 } : { left: 0 }),
              },
            ]}
          />
        </View>

        <View style={[styles.debtStatsRow, { flexDirection: dir.row }]}>
          <View style={styles.debtStat}>
            <Text style={[styles.debtStatValue, { color: colors.commitment, textAlign: dir.textAlign }]}>{formatCurrency(commitmentsOverview.monthlyTotal, currency)}</Text>
            <Text style={[styles.debtStatLabel, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{t.dashboard.monthlyOpenCommitments}</Text>
          </View>
          <View style={styles.debtStat}>
            <Text style={[styles.debtStatValue, { color: colors.foreground, textAlign: dir.textAlign }]}>{commitmentsOverview.remainingInstallments}</Text>
            <Text style={[styles.debtStatLabel, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{t.dashboard.remainingInstallments}</Text>
          </View>
          <View style={styles.debtStat}>
            <Text style={[styles.debtStatValue, { color: colors.foreground, textAlign: dir.textAlign }]}>{commitmentsOverview.activeCount}</Text>
            <Text style={[styles.debtStatLabel, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{t.dashboard.activeCommitmentsCount}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <SalaryCountdownCard
        countdown={salaryCountdown}
        currency={currency}
        nextSalaryLabel={salaryCountdown.nextSalaryDate.toLocaleDateString(locale, { month: 'long', day: 'numeric' })}
      />

      {/* Quick Actions */}
      <QuickActions />

      {/* Budget Bar */}
      <BudgetBar
        income={totals.totalIncome}
        committed={totals.totalCommitments}
        spent={totals.totalExpenses}
        currency={currency}
      />

      {totals.totalIncome > 0 ? (
        <SalaryAllocationCard
          plan={salaryAllocation}
          currency={currency}
          nextSalaryLabel={salaryAllocation.nextSalaryDate.toLocaleDateString(locale, { month: 'long', day: 'numeric' })}
        />
      ) : null}

      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => router.push('/payoff-plan' as any)}
        style={[styles.payoffCard, { flexDirection: dir.row, backgroundColor: colors.primary + '10', borderColor: colors.primary + '35' }]}
      >
        <View style={[styles.payoffIcon, { backgroundColor: colors.primary }]}>
          <Feather name="zap" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.payoffTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.dashboard.payoffPlanTitle}</Text>
          <Text style={[styles.payoffSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.dashboard.payoffPlanSubtitle}</Text>
        </View>
        <Feather name={dir.chevronDetail as any} size={16} color={colors.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => router.push('/what-if' as any)}
        style={[styles.payoffCard, { flexDirection: dir.row, backgroundColor: colors.warning + '10', borderColor: colors.warning + '35' }]}
      >
        <View style={[styles.payoffIcon, { backgroundColor: colors.warning }]}>
          <Feather name="help-circle" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.payoffTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.dashboard.whatIfTitle}</Text>
          <Text style={[styles.payoffSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.dashboard.whatIfSubtitle}</Text>
        </View>
        <Feather name={dir.chevronDetail as any} size={16} color={colors.warning} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => router.push('/subscriptions' as any)}
        style={[styles.payoffCard, { flexDirection: dir.row, backgroundColor: colors.commitment + '10', borderColor: colors.commitment + '35' }]}
      >
        <View style={[styles.payoffIcon, { backgroundColor: colors.commitment }]}>
          <Feather name="repeat" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.payoffTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.dashboard.subscriptionsTitle}</Text>
          <Text style={[styles.payoffSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
            {t.dashboard.subscriptionsSubtitle(activeSubscriptionCount, formatCurrency(subscriptionMonthlyTotal, currency))}
          </Text>
        </View>
        <Feather name={dir.chevronDetail as any} size={16} color={colors.commitment} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => router.push('/financial-challenges' as any)}
        style={[styles.payoffCard, { flexDirection: dir.row, backgroundColor: colors.success + '10', borderColor: colors.success + '35' }]}
      >
        <View style={[styles.payoffIcon, { backgroundColor: colors.success }]}>
          <Feather name="flag" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.payoffTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.dashboard.financialChallengesTitle}</Text>
          <Text style={[styles.payoffSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.dashboard.financialChallengesSubtitle}</Text>
        </View>
        <Feather name={dir.chevronDetail as any} size={16} color={colors.success} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => router.push('/achievements' as any)}
        style={[styles.payoffCard, { flexDirection: dir.row, backgroundColor: colors.primary + '10', borderColor: colors.primary + '35' }]}
      >
        <View style={[styles.payoffIcon, { backgroundColor: colors.primary }]}>
          <Feather name="award" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.payoffTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.dashboard.achievementsTitle}</Text>
          <Text style={[styles.payoffSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
            {t.dashboard.achievementsSubtitle(achievements.length, ACHIEVEMENT_IDS.length)}
          </Text>
        </View>
        <Feather name={dir.chevronDetail as any} size={16} color={colors.primary} />
      </TouchableOpacity>

      {/* Health */}
      <HealthStatusCard status={totals.healthStatus} color={totals.healthColor} message="" commitmentPercent={totals.commitmentPercent} />

      {/* Smart Insights */}
      {insights.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.dashboard.insightsTitle}</Text>
          {insights.map((ins) => (
            <InsightCard
              key={ins.id}
              insight={ins}
              onCta={ins.cta ? () => router.push(ins.cta!.route as any) : undefined}
            />
          ))}
        </View>
      ) : null}

      {/* Active Goals */}
      {activeGoals.length > 0 ? (
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection: dir.row }]}>
            <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground, flex: 1 }]}>{t.dashboard.goalsWidgetTitle}</Text>
            <TouchableOpacity onPress={() => router.push('/goals' as any)} activeOpacity={0.7} style={[styles.linkRow, { flexDirection: dir.row }]}>
              <Text style={[styles.linkText, { color: colors.primary }]}>{t.dashboard.goalsViewAll}</Text>
              <Feather name={dir.chevronDetail as any} size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {activeGoals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              contributions={goalContributions}
              currency={currency}
              compact
              onPress={() => router.push({ pathname: '/goals/[id]', params: { id: g.id } })}
            />
          ))}
        </View>
      ) : null}

      {/* Budget Warnings */}
      {budgetWarnings.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.dashboard.budgetWarningsTitle}</Text>
          {budgetWarnings.map((u) => (
            <BudgetRow key={u.category} usage={u} currency={currency} />
          ))}
        </View>
      ) : null}

      {/* Upcoming Commitments */}
      {upcoming.length > 0 ? (
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection: dir.row }]}>
            <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground, flex: 1 }]}>{t.dashboard.upcomingCommitments}</Text>
            <TouchableOpacity onPress={() => router.push('/calendar' as any)} activeOpacity={0.7} style={[styles.linkRow, { flexDirection: dir.row }]}>
              <Text style={[styles.linkText, { color: colors.primary }]}>{t.dashboard.viewCalendar}</Text>
              <Feather name={dir.chevronDetail as any} size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {upcoming.map((c) => (
            <Card key={c.id} style={styles.listItem} padding={12}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push(`/commitments/${c.id}` as any)}
                style={[styles.listRow, { flexDirection: dir.row }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{c.title}</Text>
                  <Text style={[styles.listSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.dashboard.dueOn} {c.dueDay}</Text>
                </View>
                <Text style={[styles.listAmt, { color: colors.commitment }]}>{formatCurrency(getCommitmentMonthlyShare(c), currency)}</Text>
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      ) : null}

      {/* Recent Expenses */}
      {recentExpenses.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.dashboard.recentExpenses}</Text>
          {recentExpenses.map((e) => (
            <Card key={e.id} style={styles.listItem} padding={12}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/expenses/add', params: { id: e.id } })}
                style={[styles.listRow, { flexDirection: dir.row }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{e.title}</Text>
                  <Text style={[styles.listSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{e.category} · {formatShortDate(e.expenseDate)}</Text>
                </View>
                <Text style={[styles.listAmt, { color: colors.expense }]}>{formatCurrency(e.amount, currency)}</Text>
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function SalaryCountdownCard({
  countdown,
  currency,
  nextSalaryLabel,
}: {
  countdown: ReturnType<typeof getSalaryCountdown>;
  currency: string;
  nextSalaryLabel: string;
}) {
  const colors = useColors();
  const dir = useDir();
  const t = useT();
  const statusColor = countdown.isSalaryDay
    ? colors.success
    : countdown.isOverDailyLimit
      ? colors.warning
      : colors.success;

  return (
    <Card style={styles.salaryCountdownCard} padding={14}>
      <View style={[styles.salaryCountdownHeader, { flexDirection: dir.row }]}>
        <View style={[styles.salaryCountdownIcon, { backgroundColor: statusColor + '18' }]}>
          <Feather name={countdown.isSalaryDay ? 'gift' : 'clock'} size={21} color={statusColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.salaryCountdownTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.dashboard.salaryCountdownTitle}</Text>
          <Text style={[styles.salaryCountdownSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
            {countdown.isSalaryDay ? t.dashboard.salaryCountdownToday : t.dashboard.salaryCountdownDays(countdown.daysRemaining)}
          </Text>
        </View>
      </View>

      <View style={[styles.salaryCountdownGrid, { flexDirection: dir.row }]}>
        <CountdownMetric label={t.dashboard.salaryCountdownNextDate} value={nextSalaryLabel} />
        <CountdownMetric label={t.dashboard.salaryCountdownBalance} value={formatCurrency(countdown.currentBalance, currency)} />
        <CountdownMetric label={t.dashboard.salaryCountdownDailyLimit} value={formatCurrency(countdown.dailyLimit, currency)} strong color={colors.primary} />
        <CountdownMetric label={t.dashboard.salaryCountdownTodaySpend} value={formatCurrency(countdown.todayExpenses, currency)} color={countdown.isOverDailyLimit ? colors.warning : colors.success} />
      </View>

      <View style={[styles.salaryCountdownMessage, { backgroundColor: statusColor + '10', borderColor: statusColor + '30' }]}>
        <Feather name={countdown.isOverDailyLimit ? 'alert-triangle' : 'check-circle'} size={16} color={statusColor} />
        <Text style={[styles.salaryCountdownMessageText, { color: statusColor, textAlign: dir.textAlign }]}>
          {countdown.isOverDailyLimit
            ? t.dashboard.salaryCountdownOver(formatCurrency(Math.abs(countdown.dailyDelta), currency))
            : t.dashboard.salaryCountdownSafe}
        </Text>
      </View>
    </Card>
  );
}

function CountdownMetric({
  label,
  value,
  color,
  strong,
}: {
  label: string;
  value: string;
  color?: string;
  strong?: boolean;
}) {
  const colors = useColors();
  const dir = useDir();
  return (
    <View style={[styles.countdownMetric, { backgroundColor: colors.muted }]}>
      <Text style={[styles.countdownMetricLabel, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{label}</Text>
      <Text style={[styles.countdownMetricValue, { color: color ?? colors.foreground, textAlign: dir.textAlign }, strong ? styles.countdownMetricStrong : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function SalaryAllocationCard({
  plan,
  currency,
  nextSalaryLabel,
}: {
  plan: SalaryAllocationPlan;
  currency: string;
  nextSalaryLabel: string;
}) {
  const colors = useColors();
  const dir = useDir();
  const t = useT();
  const distribution = [
    { key: 'commitments', value: plan.essentialCommitments, color: colors.commitment },
    { key: 'saving', value: plan.suggestedSaving, color: colors.success },
    { key: 'extraDebt', value: plan.extraDebtPayment, color: colors.primary },
    { key: 'expenses', value: plan.plannedExpenses, color: colors.expense },
  ].filter((item) => item.value > 0);

  return (
    <Card style={styles.salaryCard} padding={14}>
      <View style={[styles.salaryHeader, { flexDirection: dir.row }]}>
        <View style={[styles.salaryIcon, { backgroundColor: colors.success + '18' }]}>
          <Feather name="calendar" size={20} color={colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.salaryTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.dashboard.salaryAllocationTitle}</Text>
          <Text style={[styles.salarySub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.dashboard.salaryAllocationSubtitle}</Text>
        </View>
      </View>

      <View style={[styles.dailyPanel, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
        <Text style={[styles.dailyLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.dashboard.salaryAllocationDailyLabel}</Text>
        <Text style={[styles.dailyAmount, { textAlign: dir.textAlign, color: colors.primary }]}>{formatCurrency(plan.dailyAvailable, currency)}</Text>
        <Text style={[styles.dailyHint, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
          {t.dashboard.salaryAllocationDailyHint(plan.daysUntilNextSalary, nextSalaryLabel)}
        </Text>
      </View>

      <View style={[styles.allocationBar, { flexDirection: dir.row, backgroundColor: colors.muted }]}>
        {distribution.map((item) => (
          <View
            key={item.key}
            style={{
              width: `${Math.min(100, (item.value / Math.max(1, plan.monthlyIncome)) * 100)}%`,
              backgroundColor: item.color,
            }}
          />
        ))}
      </View>

      <View style={styles.allocationRows}>
        <AllocationRow icon="trending-up" label={t.dashboard.salaryAllocationIncome} amount={plan.monthlyIncome} currency={currency} color={colors.income} />
        <AllocationRow icon="shield" label={t.dashboard.salaryAllocationCommitments} amount={plan.essentialCommitments} currency={currency} color={colors.commitment} />
        <AllocationRow icon="target" label={t.dashboard.salaryAllocationSaving} amount={plan.suggestedSaving} currency={currency} color={colors.success} />
        <AllocationRow icon="zap" label={t.dashboard.salaryAllocationExtraDebt} amount={plan.extraDebtPayment} currency={currency} color={colors.primary} />
        <AllocationRow icon="shopping-bag" label={t.dashboard.salaryAllocationPlannedExpenses} amount={plan.plannedExpenses} currency={currency} color={colors.expense} />
        <AllocationRow icon="minus-circle" label={t.dashboard.salaryAllocationSpent} amount={plan.spentSoFar} currency={currency} color={colors.warning} />
        <AllocationRow
          icon={plan.isOverSpendable ? 'alert-triangle' : 'dollar-sign'}
          label={t.dashboard.salaryAllocationRemaining}
          amount={plan.remainingSpendable}
          currency={currency}
          color={plan.isOverSpendable ? colors.danger : colors.foreground}
        />
      </View>

      {plan.isOverSpendable ? (
        <Text style={[styles.salaryWarning, { textAlign: dir.textAlign, color: colors.danger }]}>
          {t.dashboard.salaryAllocationOverHint(formatCurrency(Math.abs(plan.remainingSpendable), currency))}
        </Text>
      ) : null}
    </Card>
  );
}

function AllocationRow({
  icon,
  label,
  amount,
  currency,
  color,
}: {
  icon: string;
  label: string;
  amount: number;
  currency: string;
  color: string;
}) {
  const colors = useColors();
  const dir = useDir();
  return (
    <View style={[styles.allocationRow, { flexDirection: dir.row, borderBottomColor: colors.border }]}>
      <View style={[styles.allocationIcon, { backgroundColor: color + '16' }]}>
        <Feather name={icon as any} size={14} color={color} />
      </View>
      <Text style={[styles.allocationLabel, { textAlign: dir.textAlign, color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.allocationAmount, { color }]}>{formatCurrency(amount, currency)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16 },
  greetRow: { alignItems: 'center', gap: 12, marginBottom: 16 },
  avatarWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: 12, fontFamily: 'Cairo_400Regular', marginBottom: 2 },
  greetText: { fontSize: 20, fontFamily: 'Cairo_700Bold' },
  salaryCard: { marginBottom: 10 },
  salaryHeader: { alignItems: 'center', gap: 10, marginBottom: 12 },
  salaryIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  salaryTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', marginBottom: 2 },
  salarySub: { fontSize: 11, fontFamily: 'Cairo_400Regular', lineHeight: 16 },
  dailyPanel: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  dailyLabel: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', marginBottom: 2 },
  dailyAmount: { fontSize: 30, fontFamily: 'Cairo_700Bold', marginBottom: 2 },
  dailyHint: { fontSize: 11, fontFamily: 'Cairo_400Regular', lineHeight: 16 },
  allocationBar: { height: 9, borderRadius: 999, overflow: 'hidden', marginBottom: 8 },
  allocationRows: { marginTop: 2 },
  allocationRow: { alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  allocationIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  allocationLabel: { flex: 1, fontSize: 12, fontFamily: 'Cairo_500Medium' },
  allocationAmount: { fontSize: 12, fontFamily: 'Cairo_700Bold', flexShrink: 0 },
  salaryWarning: { fontSize: 11, fontFamily: 'Cairo_500Medium', lineHeight: 16, marginTop: 8 },
  salaryCountdownCard: { marginBottom: 10 },
  salaryCountdownHeader: { alignItems: 'center', gap: 10, marginBottom: 12 },
  salaryCountdownIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  salaryCountdownTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', marginBottom: 2 },
  salaryCountdownSub: { fontSize: 12, fontFamily: 'Cairo_500Medium' },
  salaryCountdownGrid: { flexWrap: 'wrap', gap: 14, marginBottom: 10 },
  countdownMetric: { width: '48%', minHeight: 72, borderRadius: 12, padding: 10, justifyContent: 'center' },
  countdownMetricLabel: { fontSize: 10, fontFamily: 'Cairo_500Medium', marginBottom: 4 },
  countdownMetricValue: { fontSize: 12, fontFamily: 'Cairo_700Bold' },
  countdownMetricStrong: { fontSize: 14 },
  salaryCountdownMessage: { borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  salaryCountdownMessageText: { flex: 1, fontSize: 12, fontFamily: 'Cairo_600SemiBold', lineHeight: 19 },
  totalCommitmentsCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  debtHeader: { alignItems: 'center', gap: 10, marginBottom: 12 },
  debtIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  debtLabel: { fontSize: 12, fontFamily: 'Cairo_500Medium', marginBottom: 2 },
  debtAmount: { fontSize: 24, fontFamily: 'Cairo_700Bold' },
  debtProgressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  debtProgressFill: { position: 'absolute', top: 0, bottom: 0, height: '100%', borderRadius: 4 },
  debtStatsRow: { gap: 10 },
  debtStat: { flex: 1, minWidth: 0 },
  debtStatValue: { fontSize: 13, fontFamily: 'Cairo_700Bold', marginBottom: 2 },
  debtStatLabel: { fontSize: 10, fontFamily: 'Cairo_400Regular' },
  payoffCard: { alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10, gap: 10 },
  payoffIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payoffTitle: { fontSize: 14, fontFamily: 'Cairo_700Bold', marginBottom: 2 },
  payoffSub: { fontSize: 11, fontFamily: 'Cairo_400Regular', lineHeight: 16 },
  section: { marginTop: 12, marginBottom: 4 },
  sectionHeader: { alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', marginBottom: 10 },
  linkRow: { alignItems: 'center', gap: 4 },
  linkText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
  listItem: { marginBottom: 6 },
  listRow: { alignItems: 'center', gap: 10 },
  listTitle: { fontSize: 14, fontFamily: 'Cairo_500Medium' },
  listSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', marginTop: 2 },
  listAmt: { fontSize: 14, fontFamily: 'Cairo_700Bold' },
});
