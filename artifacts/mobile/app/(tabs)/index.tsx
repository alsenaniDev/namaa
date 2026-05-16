import React from 'react';
import { ScrollView, View, Text, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency, getCurrentMonthYear } from '@/utils/format';
import { getUpcomingCommitments, getLateCommitments } from '@/utils/calculations';
import { getFinancialTip } from '@/utils/calculations';
import { SummaryCard } from '@/components/SummaryCard';
import { HealthStatusCard } from '@/components/HealthStatusCard';
import { Card } from '@/components/ui/Card';
import * as dir from '@/utils/dir';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
      <View style={styles.greetRow}>
        <View style={[styles.avatarWrap, { backgroundColor: colors.primary + '20', borderRadius: 26 }]}>
          <Feather name="user" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{dayName}، {dateStr}</Text>
          <Text style={[styles.greetText, { color: colors.foreground }]}>{t.dashboard.greeting}، {userProfile?.name ?? ''}</Text>
        </View>
      </View>

      {/* Summary Grid */}
      <View style={styles.gridRow}>
        <SummaryCard
          label={t.dashboard.totalIncome}
          amount={formatCurrency(totals.totalIncome, currency)}
          icon="trending-up"
          iconColor={colors.income}
        />
        <SummaryCard
          label={t.dashboard.totalCommitments}
          amount={formatCurrency(totals.totalCommitments, currency)}
          icon="credit-card"
          iconColor={colors.commitment}
        />
      </View>
      <View style={styles.gridRow}>
        <SummaryCard
          label={t.dashboard.totalExpenses}
          amount={formatCurrency(totals.totalExpenses, currency)}
          icon="shopping-bag"
          iconColor={colors.expense}
        />
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
      <HealthStatusCard
        status={totals.healthStatus}
        color={totals.healthColor}
        message={tip}
        commitmentPercent={totals.commitmentPercent}
      />

      {/* After commitments */}
      <Card style={styles.remainCard}>
        <View style={styles.remainRow}>
          {totals.suggestedSaving > 0 ? (
            <View style={[styles.savingBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.savingText, { color: colors.primary }]}>
                {t.dashboard.suggestedSaving}: {formatCurrency(totals.suggestedSaving, currency)}
              </Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={[styles.remainLabel, { color: colors.mutedForeground }]}>{t.dashboard.remainingAfterCommitments}</Text>
            <Text style={[styles.remainAmount, {
              color: totals.remainingAfterCommitments >= 0 ? colors.foreground : colors.danger,
            }]}>
              {formatCurrency(totals.remainingAfterCommitments, currency)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Late Commitments Warning */}
      {late.length > 0 ? (
        <Card style={[styles.lateCard, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '30' }]}>
          <View style={styles.lateHeader}>
            <Feather name="alert-triangle" size={18} color={colors.danger} />
            <Text style={[styles.lateTitle, { color: colors.danger }]}>{t.dashboard.lateCommitments}</Text>
            <Text style={[styles.lateCount, { color: colors.danger }]}>{late.length}</Text>
          </View>
          {late.slice(0, 2).map((c) => (
            <Text key={c.id} style={[styles.lateItem, { color: colors.foreground }]}>
              {c.title} — {formatCurrency(c.amount, currency)}
            </Text>
          ))}
        </Card>
      ) : null}

      {/* Upcoming Commitments */}
      {upcoming.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.dashboard.upcomingCommitments}</Text>
          {upcoming.map((c) => (
            <Card key={c.id} style={styles.listItem} padding={12}>
              <View style={styles.listRow}>
                <Text style={[styles.listAmt, { color: colors.commitment }]}>{formatCurrency(c.amount, currency)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { color: colors.foreground }]}>{c.title}</Text>
                  <Text style={[styles.listSub, { color: colors.mutedForeground }]}>{t.dashboard.dueOn} {c.dueDay}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {/* Recent Expenses */}
      {expenses.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.dashboard.recentExpenses}</Text>
          {[...expenses].reverse().slice(0, 3).map((e) => (
            <Card key={e.id} style={styles.listItem} padding={12}>
              <View style={styles.listRow}>
                <Text style={[styles.listAmt, { color: colors.expense }]}>{formatCurrency(e.amount, currency)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { color: colors.foreground }]}>{e.title}</Text>
                  <Text style={[styles.listSub, { color: colors.mutedForeground }]}>{e.category}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {/* Financial Tip */}
      <Card style={[styles.tipCard, { backgroundColor: colors.primary + '0D', borderColor: colors.primary + '25' }]}>
        <View style={styles.tipRow}>
          <Feather name="info" size={20} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.foreground }]}>{tip}</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16 },
  greetRow: { flexDirection: dir.row, alignItems: 'center', gap: 12, marginBottom: 20 },
  avatarWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: dir.textAlign, marginBottom: 2 },
  greetText: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: dir.textAlign },
  gridRow: { flexDirection: dir.row, gap: 10, marginBottom: 10 },
  remainCard: { marginTop: 10, marginBottom: 10 },
  remainRow: { flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  remainLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: dir.textAlign, marginBottom: 4 },
  remainAmount: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: dir.textAlign },
  savingBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  savingText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  lateCard: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  lateHeader: { flexDirection: dir.row, alignItems: 'center', gap: 8, marginBottom: 8 },
  lateTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1, textAlign: dir.textAlign },
  lateCount: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  lateItem: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: dir.textAlign, marginBottom: 4 },
  section: { marginTop: 4, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', textAlign: dir.textAlign, marginBottom: 10 },
  listItem: { marginBottom: 6 },
  listRow: { flexDirection: dir.row, alignItems: 'center', gap: 10 },
  listTitle: { fontSize: 14, fontFamily: 'Inter_500Medium', textAlign: dir.textAlign },
  listSub: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: dir.textAlign, marginTop: 2 },
  listAmt: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  tipCard: { padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 10, marginBottom: 10 },
  tipRow: { flexDirection: dir.row, alignItems: 'flex-start', gap: 10 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 21, fontFamily: 'Inter_400Regular', textAlign: dir.textAlign },
});
