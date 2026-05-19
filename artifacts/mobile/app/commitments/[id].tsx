import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { formatCurrency, formatDate, getCurrentMonthYear } from '@/utils/format';
import { getCommitmentProgress } from '@/utils/calculations';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function CommitmentDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const params = useLocalSearchParams<{ id: string }>();
  const { commitments, commitmentPayments, lenders, userProfile, markCommitmentPaid, markCommitmentUnpaid } = useApp();

  const commitment = commitments.find((c) => c.id === params.id);
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  if (!commitment) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>—</Text>
      </View>
    );
  }

  const lender = commitment.lenderId ? lenders.find((l) => l.id === commitment.lenderId) : undefined;
  const accent = lender?.color ?? colors.commitment;
  const progress = getCommitmentProgress(commitment, commitmentPayments);

  const { month, year } = getCurrentMonthYear();
  const thisMonthPayment = commitmentPayments.find(
    (p) => p.commitmentId === commitment.id && p.month === month && p.year === year,
  );
  const isPaidThisMonth = thisMonthPayment?.status === 'paid';

  const history = commitmentPayments
    .filter((p) => p.commitmentId === commitment.id)
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });

  const togglePaid = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPaidThisMonth) markCommitmentUnpaid(commitment.id, month, year);
    else markCommitmentPaid(commitment.id, month, year, commitment.amount);
  };

  const kindLabel =
    commitment.kind === 'finite_loan' ? t.commitments.kindFiniteLoan
    : commitment.kind === 'one_time' ? t.commitments.kindOneTime
    : t.commitments.kindRecurringBill;

  return (
    <>
      <Stack.Screen
        options={{
          title: commitment.title,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/commitments/add', params: { id: commitment.id } })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ paddingHorizontal: 12 }}
            >
              <Feather name="edit-2" size={20} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Card style={styles.headerCard}>
          <Text style={[styles.title, { textAlign: dir.textAlign, color: colors.foreground }]}>{commitment.title}</Text>
          <View style={[styles.headerMeta, { flexDirection: dir.row }]}>
            <View style={[styles.pill, { backgroundColor: accent + '18' }]}>
              <Text style={[styles.pillText, { color: accent }]}>{commitment.category}</Text>
            </View>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{kindLabel}</Text>
          </View>
          <View style={[styles.amountRow, { flexDirection: dir.row }]}>
            <View>
              <Text style={[styles.amountLabel, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{t.forms.commitmentAmountLabel}</Text>
              <Text style={[styles.amountValue, { color: colors.commitment, textAlign: dir.textAlign }]}>
                {formatCurrency(commitment.amount, currency)}
              </Text>
            </View>
            <View>
              <Text style={[styles.amountLabel, { color: colors.mutedForeground, textAlign: dir.isRTL ? 'left' : 'right' }]}>{t.dashboard.dueOn}</Text>
              <Text style={[styles.dueValue, { color: colors.foreground, textAlign: dir.isRTL ? 'left' : 'right' }]}>{commitment.dueDay}</Text>
            </View>
          </View>
        </Card>

        {/* Lender */}
        {lender ? (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/lenders/[id]', params: { id: lender.id } })}
            activeOpacity={0.78}
            style={[styles.lenderCard, { flexDirection: dir.row, backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
          >
            <View style={[styles.lenderAvatar, { backgroundColor: lender.color + '22' }]}>
              <Text style={[styles.lenderAvatarText, { color: lender.color }]}>{lender.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lenderName, { textAlign: dir.textAlign, color: colors.foreground }]} numberOfLines={1}>{lender.name}</Text>
              <Text style={[styles.lenderType, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.lenders.typeLabels[lender.type]}</Text>
            </View>
            <Feather name={dir.chevronDetail as any} size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}

        {/* Progress for finite loans */}
        {progress.isFinite ? (
          <>
            <Text style={[styles.sectionLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.commitments.progressTitle}</Text>
            <Card style={styles.card}>
              <View style={[styles.progressHeader, { flexDirection: dir.row }]}>
                <Text style={[styles.progressPercent, { color: accent }]}>{Math.round(progress.progressPercent)}%</Text>
                <Text style={[styles.progressInstallments, { color: colors.mutedForeground }]}>
                  {t.commitments.installmentsPaid(progress.paidInstallmentCount, progress.installmentCount)}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
                <View style={[styles.progressFill, { width: `${progress.progressPercent}%`, backgroundColor: accent }]} />
              </View>
              <View style={[styles.progressBreakdown, { flexDirection: dir.row }]}>
                <View>
                  <Text style={[styles.breakdownLabel, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{t.commitments.paidLabel}</Text>
                  <Text style={[styles.breakdownValue, { color: colors.success, textAlign: dir.textAlign }]}>{formatCurrency(progress.paidAmount, currency)}</Text>
                </View>
                <View>
                  <Text style={[styles.breakdownLabel, { color: colors.mutedForeground, textAlign: dir.isRTL ? 'left' : 'right' }]}>{t.commitments.remainingLabel}</Text>
                  <Text style={[styles.breakdownValue, { color: colors.warning, textAlign: dir.isRTL ? 'left' : 'right' }]}>{formatCurrency(progress.remainingAmount, currency)}</Text>
                </View>
              </View>
              <Text style={[styles.totalLine, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>
                {t.commitments.ofTotal(formatCurrency(progress.totalAmount, currency))}
              </Text>
            </Card>
          </>
        ) : null}

        {/* This month action */}
        <View style={{ marginTop: 14 }}>
          <Button
            title={isPaidThisMonth ? t.commitments.markUnpaid : t.commitments.markPaid}
            onPress={togglePaid}
            variant={isPaidThisMonth ? 'outline' : 'primary'}
            fullWidth
          />
        </View>

        {/* Payment history */}
        <Text style={[styles.sectionLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.commitments.paymentHistory}</Text>
        {history.length === 0 ? (
          <Card style={styles.card}>
            <Text style={[styles.emptyText, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.commitments.noPayments}</Text>
          </Card>
        ) : (
          <Card style={styles.card} padding={0}>
            {history.map((p, idx) => (
              <View
                key={p.id}
                style={[
                  styles.historyRow,
                  { flexDirection: dir.row, borderBottomColor: colors.border },
                  idx === history.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={[styles.historyIcon, { backgroundColor: colors.success + '18' }]}>
                  <Feather name="check" size={14} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyMonth, { textAlign: dir.textAlign, color: colors.foreground }]}>
                    {p.month}/{p.year}
                  </Text>
                  {p.paidDate ? (
                    <Text style={[styles.historyDate, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
                      {formatDate(p.paidDate)}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.historyAmount, { color: colors.foreground }]}>{formatCurrency(p.amount, currency)}</Text>
              </View>
            ))}
          </Card>
        )}

        {commitment.notes ? (
          <Card style={[styles.card, { marginTop: 14 }]} padding={14}>
            <Text style={[styles.notesText, { textAlign: dir.textAlign, color: colors.foreground }]}>{commitment.notes}</Text>
          </Card>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  headerCard: { marginBottom: 12 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 10 },
  headerMeta: { alignItems: 'center', gap: 8, marginBottom: 14 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  pillText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  metaText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  amountRow: { justifyContent: 'space-between', alignItems: 'flex-end' },
  amountLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  amountValue: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  dueValue: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  lenderCard: { alignItems: 'center', padding: 12, borderWidth: 1, gap: 12, marginBottom: 4 },
  lenderAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  lenderAvatarText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  lenderName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  lenderType: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { marginBottom: 8 },
  progressHeader: { justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  progressPercent: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  progressInstallments: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  progressBar: { height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 14 },
  progressFill: { height: '100%', borderRadius: 5 },
  progressBreakdown: { justifyContent: 'space-between', marginBottom: 8 },
  breakdownLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 3 },
  breakdownValue: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  totalLine: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', paddingVertical: 8 },
  historyRow: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  historyIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  historyMonth: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  historyDate: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  historyAmount: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  notesText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
});
