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
import { formatCurrency, getCurrentMonthYear } from '@/utils/format';
import { getUpcomingCommitments, getBudgetUsages, getGoalProgress } from '@/utils/calculations';
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
      {expenses.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.dashboard.recentExpenses}</Text>
          {[...expenses].reverse().slice(0, 3).map((e) => (
            <Card key={e.id} style={styles.listItem} padding={12}>
              <View style={[styles.listRow, { flexDirection: dir.row }]}>
                <Text style={[styles.listAmt, { color: colors.expense }]}>{formatCurrency(e.amount, currency)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{e.title}</Text>
                  <Text style={[styles.listSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{e.category}</Text>
                </View>
              </View>
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
