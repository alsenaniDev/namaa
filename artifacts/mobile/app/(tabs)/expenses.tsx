import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatShortDate, getCurrentMonthYear } from '@/utils/format';
import { TransactionItem } from '@/components/TransactionItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { Expense, ExpenseCategory } from '@/types';

const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  'مطاعم': 'coffee',
  'قهوة': 'coffee',
  'تسوق': 'shopping-bag',
  'بنزين': 'navigation',
  'سفر': 'map',
  'ترفيه': 'film',
  'صحة': 'heart',
  'تعليم': 'book',
  'أخرى': 'more-horizontal',
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  'مطاعم': '#F97316',
  'قهوة': '#92400E',
  'تسوق': '#8B5CF6',
  'بنزين': '#3B82F6',
  'سفر': '#14B8A6',
  'ترفيه': '#EC4899',
  'صحة': '#EF4444',
  'تعليم': '#10B981',
  'أخرى': '#6B7280',
};

export default function ExpensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { expenses, deleteExpense, getMonthlyTotals, userProfile } = useApp();
  const { month, year } = getCurrentMonthYear();
  const totals = getMonthlyTotals(month, year);
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const monthExpenses = expenses
    .filter((e) => {
      const d = new Date(e.expenseDate);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    })
    .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());

  const handleDelete = (item: Expense) => {
    Alert.alert('حذف المصروف', `هل تريد حذف "${item.title}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          deleteExpense(item.id);
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Card style={styles.summaryCard} padding={14}>
        <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>إجمالي مصاريف هذا الشهر</Text>
        <Text style={[styles.summaryAmount, { color: colors.expense }]}>
          {formatCurrency(totals.totalExpenses, currency)}
        </Text>
        <Text style={[styles.summaryCount, { color: colors.mutedForeground }]}>{monthExpenses.length} مصروف</Text>
      </Card>

      <FlatList
        data={monthExpenses}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!monthExpenses.length}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + bottomPad + 90 },
          !monthExpenses.length && styles.emptyList,
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="shopping-bag"
            title="لا توجد مصاريف هذا الشهر"
            description="سجّل مصاريفك اليومية لمتابعة ميزانيتك"
            actionLabel="إضافة مصروف"
            onAction={() => router.push('/expenses/add')}
          />
        }
        renderItem={({ item }) => {
          const ic = CATEGORY_COLORS[item.category as ExpenseCategory] ?? colors.expense;
          return (
            <TransactionItem
              title={item.title}
              subtitle={formatShortDate(item.expenseDate)}
              amount={formatCurrency(item.amount, currency)}
              amountColor={ic}
              icon={CATEGORY_ICONS[item.category as ExpenseCategory] ?? 'more-horizontal'}
              iconColor={ic}
              badge={item.category}
              badgeColor={ic}
              onPress={() => router.push({ pathname: '/expenses/add', params: { id: item.id } })}
              onDelete={() => handleDelete(item)}
            />
          );
        }}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + bottomPad + 80 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/expenses/add');
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
