import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useT } from '@/hooks/useT';

export function QuickActions() {
  const colors = useColors();
  const dir = useDir();
  const t = useT();
  const router = useRouter();

  const actions = [
    { icon: 'trending-up', label: t.dashboard.actionAddIncome, color: colors.income, route: '/income/add' },
    { icon: 'credit-card', label: t.dashboard.actionAddCommitment, color: colors.commitment, route: '/commitments/add' },
    { icon: 'shopping-bag', label: t.dashboard.actionAddExpense, color: colors.expense, route: '/expenses/add' },
    { icon: 'calendar', label: t.dashboard.actionCalendar, color: colors.primary, route: '/calendar' },
  ];

  return (
    <View style={[styles.row, { flexDirection: dir.row }]}>
      {actions.map((a) => (
        <TouchableOpacity
          key={a.route}
          activeOpacity={0.7}
          onPress={() => router.push(a.route as any)}
          style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: a.color + '18' }]}>
            <Feather name={a.icon as any} size={18} color={a.color} />
          </View>
          <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, marginBottom: 12 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1, gap: 6 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontFamily: 'Cairo_500Medium', textAlign: 'center' },
});
