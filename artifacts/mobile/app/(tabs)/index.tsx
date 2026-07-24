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
import { formatCurrency, formatShortDate, getCurrentMonthYear, parseDateLocal } from '@/utils/format';
import { getUpcomingCommitments, getBudgetUsages, getGoalProgress, getCommitmentsOverview } from '@/utils/calculations';
import { getInsights } from '@/utils/insights';
import { HealthStatusCard } from '@/components/HealthStatusCard';
import { BudgetBar } from '@/components/BudgetBar';
import { QuickActions } from '@/components/QuickActions';
import { InsightCard } from '@/components/InsightCard';
import { Card } from '@/components/ui/Card';
import { GoalCard } from '@/components/GoalCard';
import { BudgetRow } from '@/components/BudgetRow';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dir = useDir();
  const router = useRouter();
  const { userProfile, commitments, commitmentPayments, expenses, goals, goalContributions, budgets, subscriptions, getMonthlyTotals } = useApp();
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
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';
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

      {/* Budget Bar — hero */}
      <BudgetBar
        income={totals.totalIncome}
        committed={totals.totalCommitments}
        spent={totals.totalExpenses}
        currency={currency}
      />

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

      {/* Quick Actions */}
      <QuickActions />

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
                <Text style={[styles.listAmt, { color: colors.commitment }]}>{formatCurrency(c.amount, currency)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{c.title}</Text>
                  <Text style={[styles.listSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.dashboard.dueOn} {c.dueDay}</Text>
                </View>
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
                <Text style={[styles.listAmt, { color: colors.expense }]}>{formatCurrency(e.amount, currency)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{e.title}</Text>
                  <Text style={[styles.listSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{e.category} · {formatShortDate(e.expenseDate)}</Text>
                </View>
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16 },
  greetRow: { alignItems: 'center', gap: 12, marginBottom: 16 },
  avatarWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  greetText: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  totalCommitmentsCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  debtHeader: { alignItems: 'center', gap: 10, marginBottom: 12 },
  debtIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  debtLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 2 },
  debtAmount: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  debtProgressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  debtProgressFill: { position: 'absolute', top: 0, bottom: 0, height: '100%', borderRadius: 4 },
  debtStatsRow: { gap: 10 },
  debtStat: { flex: 1, minWidth: 0 },
  debtStatValue: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  debtStatLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  section: { marginTop: 12, marginBottom: 4 },
  sectionHeader: { alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 10 },
  linkRow: { alignItems: 'center', gap: 4 },
  linkText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  listItem: { marginBottom: 6 },
  listRow: { alignItems: 'center', gap: 10 },
  listTitle: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  listSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  listAmt: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});
