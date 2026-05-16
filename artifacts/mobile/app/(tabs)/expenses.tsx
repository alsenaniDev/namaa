import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { formatCurrency, formatShortDate, getCurrentMonthYear } from '@/utils/format';
import { TransactionItem } from '@/components/TransactionItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';

const CATEGORY_ICONS: Record<string, string> = {
  'مطاعم': 'coffee', 'قهوة': 'coffee', 'تسوق': 'shopping-bag', 'بنزين': 'navigation',
  'سفر': 'map', 'ترفيه': 'film', 'صحة': 'heart', 'تعليم': 'book', 'أخرى': 'more-horizontal',
};
const CATEGORY_COLORS: Record<string, string> = {
  'مطاعم': '#F97316', 'قهوة': '#92400E', 'تسوق': '#8B5CF6', 'بنزين': '#3B82F6',
  'سفر': '#14B8A6', 'ترفيه': '#EC4899', 'صحة': '#EF4444', 'تعليم': '#10B981', 'أخرى': '#6B7280',
};

export default function ExpensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const { expenses, getMonthlyTotals, userProfile } = useApp();
  const { month, year } = getCurrentMonthYear();
  const totals = getMonthlyTotals(month, year);
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const monthExpenses = expenses
    .filter((e) => { const d = new Date(e.expenseDate); return d.getMonth() + 1 === month && d.getFullYear() === year; })
    .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Card style={styles.summaryCard} padding={14}>
        <Text style={[styles.summaryLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.expenses.totalLabel}</Text>
        <Text style={[styles.summaryAmount, { textAlign: dir.textAlign, color: colors.expense }]}>{formatCurrency(totals.totalExpenses, currency)}</Text>
        <Text style={[styles.summaryCount, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{monthExpenses.length} {t.expenses.countSuffix}</Text>
      </Card>
      <FlatList
        data={monthExpenses}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!monthExpenses.length}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + bottomPad + 90 }, !monthExpenses.length && styles.emptyList]}
        ListEmptyComponent={
          <EmptyState icon="shopping-bag" title={t.expenses.emptyTitle} description={t.expenses.emptyDesc} actionLabel={t.expenses.addLabel} onAction={() => router.push('/expenses/add')} />
        }
        renderItem={({ item }) => {
          const ic = CATEGORY_COLORS[item.category] ?? colors.expense;
          return (
            <TransactionItem
              title={item.title}
              subtitle={formatShortDate(item.expenseDate)}
              amount={formatCurrency(item.amount, currency)}
              amountColor={ic}
              icon={CATEGORY_ICONS[item.category] ?? 'more-horizontal'}
              iconColor={ic}
              badge={item.category}
              badgeColor={ic}
              onPress={() => router.push({ pathname: '/expenses/add', params: { id: item.id } })}
            />
          );
        }}
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + bottomPad + 80 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/expenses/add'); }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: { margin: 16, marginBottom: 8 },
  summaryLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  summaryAmount: { fontSize: 24, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  summaryCount: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  emptyList: { flex: 1 },
  fab: { position: 'absolute', left: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
});
