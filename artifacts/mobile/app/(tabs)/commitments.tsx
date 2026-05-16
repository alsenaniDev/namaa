import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { formatCurrency, getCurrentMonthYear } from '@/utils/format';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { Commitment } from '@/types';

export default function CommitmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { commitments, commitmentPayments, deleteCommitment, markCommitmentPaid, markCommitmentUnpaid, getMonthlyTotals, userProfile } = useApp();
  const { month, year } = getCurrentMonthYear();
  const totals = getMonthlyTotals(month, year);
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const getPayment = (commitmentId: string) =>
    commitmentPayments.find((p) => p.commitmentId === commitmentId && p.month === month && p.year === year);

  const handleTogglePaid = (item: Commitment) => {
    const payment = getPayment(item.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (payment?.status === 'paid') {
      markCommitmentUnpaid(item.id, month, year);
    } else {
      markCommitmentPaid(item.id, month, year, item.amount);
    }
  };

  const handleDelete = (item: Commitment) => {
    Alert.alert('حذف الالتزام', `هل تريد حذف "${item.title}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          deleteCommitment(item.id);
        },
      },
    ]);
  };

  const today = new Date().getDate();
  const paidCount = commitments.filter((c) => getPayment(c.id)?.status === 'paid').length;
  const lateCount = commitments.filter((c) => c.isActive && !getPayment(c.id) && c.dueDay < today).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Summary Header */}
      <Card style={styles.summaryCard} padding={14}>
        <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>إجمالي الالتزامات الشهرية</Text>
        <Text style={[styles.summaryAmount, { color: colors.commitment }]}>
          {formatCurrency(totals.totalCommitments, currency)}
        </Text>
        <View style={styles.statsRow}>
          <View style={[styles.statBadge, { backgroundColor: colors.danger + '18' }]}>
            <Text style={[styles.statText, { color: colors.danger }]}>{lateCount} متأخر</Text>
          </View>
          <View style={[styles.statBadge, { backgroundColor: colors.success + '18' }]}>
            <Text style={[styles.statText, { color: colors.success }]}>{paidCount} مدفوع</Text>
          </View>
          <Text style={[styles.statTotal, { color: colors.mutedForeground }]}>{commitments.length} التزام</Text>
        </View>
      </Card>

      <FlatList
        data={commitments.filter((c) => c.isActive)}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!commitments.length}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + bottomPad + 90 },
          !commitments.length && styles.emptyList,
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="credit-card"
            title="لا توجد التزامات"
            description="أضف التزاماتك الشهرية من قروض وإيجار وفواتير"
            actionLabel="إضافة التزام"
            onAction={() => router.push('/commitments/add')}
          />
        }
        renderItem={({ item }) => {
          const payment = getPayment(item.id);
          const isPaid = payment?.status === 'paid';
          const isLate = !isPaid && item.dueDay < today;
          const statusColor = isPaid ? colors.success : isLate ? colors.danger : colors.warning;
          const statusLabel = isPaid ? 'مدفوع' : isLate ? 'متأخر' : `يوم ${item.dueDay}`;

          return (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/commitments/add', params: { id: item.id } })}
              activeOpacity={0.75}
              style={[
                styles.commitItem,
                {
                  backgroundColor: colors.card,
                  borderColor: isPaid ? colors.success + '30' : isLate ? colors.danger + '30' : colors.border,
                  borderRadius: colors.radius - 2,
                },
              ]}
            >
              <View style={styles.commitRow}>
                {/* Toggle paid button */}
                <TouchableOpacity
                  onPress={() => handleTogglePaid(item)}
                  style={[styles.checkBtn, { borderColor: statusColor, backgroundColor: isPaid ? statusColor + '20' : 'transparent' }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isPaid ? <Feather name="check" size={16} color={statusColor} /> : null}
                </TouchableOpacity>

                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <View style={styles.titleRow}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.commitTitle, { color: colors.foreground }]}>{item.title}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
                    <Text style={[styles.category, { color: colors.mutedForeground }]}>{item.category}</Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.commitAmount, { color: colors.commitment }]}>{formatCurrency(item.amount, currency)}</Text>
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginTop: 4 }}
                  >
                    <Feather name="trash-2" size={14} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + bottomPad + 80 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/commitments/add');
        }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: { margin: 16, marginBottom: 8 },
  summaryLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'right', marginBottom: 4 },
  summaryAmount: { fontSize: 24, fontFamily: 'Inter_700Bold', textAlign: 'right', marginBottom: 8 },
  statsRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  statBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  statTotal: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  emptyList: { flex: 1 },
  commitItem: { borderWidth: 1, marginBottom: 8, padding: 12 },
  commitRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  checkBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  commitTitle: { fontSize: 14, fontFamily: 'Inter_500Medium', flex: 1, textAlign: 'right' },
  metaRow: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center' },
  statusLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  category: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  commitAmount: { fontSize: 15, fontFamily: 'Inter_700Bold', textAlign: 'left' },
  fab: { position: 'absolute', left: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
});
