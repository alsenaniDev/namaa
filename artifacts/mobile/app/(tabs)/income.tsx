import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { formatCurrency, getCurrentMonthYear } from '@/utils/format';
import { TransactionItem } from '@/components/TransactionItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import type { Income } from '@/types';

export default function IncomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { incomes, deleteIncome, getMonthlyTotals, userProfile } = useApp();
  const { month, year } = getCurrentMonthYear();
  const totals = getMonthlyTotals(month, year);
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const handleDelete = (item: Income) => {
    Alert.alert('حذف الدخل', `هل تريد حذف "${item.title}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          deleteIncome(item.id);
        },
      },
    ]);
  };

  const typeColors: Record<string, string> = {
    'راتب': colors.income,
    'عمل إضافي': colors.commitment,
    'مكافأة': colors.warning,
    'تجارة': colors.primary,
    'استثمار': colors.success,
    'أخرى': colors.mutedForeground,
  };

  const typeIcons: Record<string, string> = {
    'راتب': 'briefcase',
    'عمل إضافي': 'clock',
    'مكافأة': 'gift',
    'تجارة': 'shopping-cart',
    'استثمار': 'trending-up',
    'أخرى': 'dollar-sign',
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Summary Header */}
      <Card style={styles.summaryCard} padding={16}>
        <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>إجمالي الدخل الشهري</Text>
        <Text style={[styles.summaryAmount, { color: colors.income }]}>
          {formatCurrency(totals.totalIncome, currency)}
        </Text>
        <Text style={[styles.summaryCount, { color: colors.mutedForeground }]}>{incomes.length} مصدر دخل</Text>
      </Card>

      <FlatList
        data={incomes}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!incomes.length}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + bottomPad + 90 },
          !incomes.length && styles.emptyList,
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="trending-up"
            title="لا يوجد دخل مسجل"
            description="أضف مصادر دخلك الشهرية لبدء تتبع ميزانيتك"
            actionLabel="إضافة دخل"
            onAction={() => router.push('/income/add')}
          />
        }
        renderItem={({ item }) => (
          <TransactionItem
            title={item.title}
            subtitle={item.isRecurring ? `يوم ${item.receivedDay} شهرياً` : 'غير متكرر'}
            amount={formatCurrency(item.amount, currency)}
            amountColor={typeColors[item.type] ?? colors.income}
            icon={typeIcons[item.type] ?? 'dollar-sign'}
            iconColor={typeColors[item.type] ?? colors.income}
            badge={item.type}
            badgeColor={typeColors[item.type] ?? colors.income}
            onPress={() => router.push({ pathname: '/income/add', params: { id: item.id } })}
            onDelete={() => handleDelete(item)}
          />
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + bottomPad + 80 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/income/add');
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
  summaryAmount: { fontSize: 24, fontFamily: 'Inter_700Bold', textAlign: 'right', marginBottom: 2 },
  summaryCount: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'right' },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  emptyList: { flex: 1 },
  fab: { position: 'absolute', left: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
});
