import React from 'react';
import { ScrollView, View, Text, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency, getCurrentMonthYear } from '@/utils/format';
import { getUpcomingCommitments, getLateCommitments, getFinancialTip } from '@/utils/calculations';
import { SummaryCard } from '@/components/SummaryCard';
import { HealthStatusCard } from '@/components/HealthStatusCard';
import { Card } from '@/components/ui/Card';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dir = useDir();
  const { userProfile, commitments, commitmentPayments, expenses, getMonthlyTotals } = useApp();
  const { language } = useLanguage();
  const t = useT();
  const { month, year } = getCurrentMonthYear();
  const totals = getMonthlyTotals(month, year);
  const currency = userProfile?.preferredCurrency ?? 'SAR';

  const upcoming = getUpcomingCommitments(commitments, commitmentPayments).slice(0, 3);
  const late = getLateCommitments(commitments, commitmentPayments);
  const tip = getFinancialTip(totals, language);

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

      {/* Summary Grid */}
      <View style={[styles.gridRow, { flexDirection: dir.row }]}>
        <SummaryCard label={t.dashboard.totalIncome} amount={formatCurrency(totals.totalIncome, currency)} icon="trending-up" iconColor={colors.income} />
        <SummaryCard label={t.dashboard.totalCommitments} amount={formatCurrency(totals.totalCommitments, currency)} icon="credit-card" iconColor={colors.commitment} />
      </View>
      <View style={[styles.gridRow, { flexDirection: dir.row }]}>
        <SummaryCard label={t.dashboard.totalExpenses} amount={formatCurrency(totals.totalExpenses, currency)} icon="shopping-bag" iconColor={colors.expense} />
        <SummaryCard
          label={t.dashboard.netRemaining}
          amount={formatCurrency(totals.netRemaining, currency)}
          icon="activity"
          iconColor={totals.netRemaining >= 0 ? colors.success : colors.danger}
          trend={totals.netRemaining >= 0 ? 'up' : 'down'}
          sub={totals.netRemaining >= 0 ? t.dashboard.availableToSpend : t.dashboard.overBudget}
        />
      </View>

      {/* Health Status */}
      <HealthStatusCard status={totals.healthStatus} color={totals.healthColor} message={tip} commitmentPercent={totals.commitmentPercent} />

      {/* Remaining after commitments */}
      <Card style={styles.remainCard}>
        <View style={[styles.remainRow, { flexDirection: dir.row }]}>
          {totals.suggestedSaving > 0 ? (
            <View style={[styles.savingBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.savingText, { color: colors.primary }]}>
                {t.dashboard.suggestedSaving}: {formatCurrency(totals.suggestedSaving, currency)}
              </Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={[styles.remainLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.dashboard.remainingAfterCommitments}</Text>
            <Text style={[styles.remainAmount, { textAlign: dir.textAlign, color: totals.remainingAfterCommitments >= 0 ? colors.foreground : colors.danger }]}>
              {formatCurrency(totals.remainingAfterCommitments, currency)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Late Commitments */}
      {late.length > 0 ? (
        <Card style={[styles.lateCard, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '30' }]}>
          <View style={[styles.lateHeader, { flexDirection: dir.row }]}>
            <Feather name="alert-triangle" size={18} color={colors.danger} />
            <Text style={[styles.lateTitle, { textAlign: dir.textAlign, color: colors.danger }]}>{t.dashboard.lateCommitments}</Text>
            <Text style={[styles.lateCount, { color: colors.danger }]}>{late.length}</Text>
          </View>
          {late.slice(0, 2).map((c) => (
            <Text key={c.id} style={[styles.lateItem, { textAlign: dir.textAlign, color: colors.foreground }]}>
              {c.title} — {formatCurrency(c.amount, currency)}
            </Text>
          ))}
        </Card>
      ) : null}

      {/* Upcoming Commitments */}
      {upcoming.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.dashboard.upcomingCommitments}</Text>
          {upcoming.map((c) => (
            <Card key={c.id} style={styles.listItem} padding={12}>
              <View style={[styles.listRow, { flexDirection: dir.row }]}>
                <Text style={[styles.listAmt, { color: colors.commitment }]}>{formatCurrency(c.amount, currency)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{c.title}</Text>
                  <Text style={[styles.listSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.dashboard.dueOn} {c.dueDay}</Text>
                </View>
              </View>
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

      {/* Financial Tip */}
      <Card style={[styles.tipCard, { backgroundColor: colors.primary + '0D', borderColor: colors.primary + '25' }]}>
        <View style={[styles.tipRow, { flexDirection: dir.row }]}>
          <Feather name="info" size={20} color={colors.primary} />
          <Text style={[styles.tipText, { textAlign: dir.textAlign, color: colors.foreground }]}>{tip}</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16 },
  greetRow: { alignItems: 'center', gap: 12, marginBottom: 20 },
  avatarWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  greetText: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  gridRow: { gap: 10, marginBottom: 10 },
  remainCard: { marginTop: 10, marginBottom: 10 },
  remainRow: { alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  remainLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  remainAmount: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  savingBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  savingText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  lateCard: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  lateHeader: { alignItems: 'center', gap: 8, marginBottom: 8 },
  lateTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  lateCount: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  lateItem: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  section: { marginTop: 4, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 10 },
  listItem: { marginBottom: 6 },
  listRow: { alignItems: 'center', gap: 10 },
  listTitle: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  listSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  listAmt: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  tipCard: { padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 10, marginBottom: 10 },
  tipRow: { alignItems: 'flex-start', gap: 10 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 21, fontFamily: 'Inter_400Regular' },
});
