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
import { formatCurrency } from '@/utils/format';
import { getLenderStats } from '@/utils/calculations';
import { EmptyState } from '@/components/ui/EmptyState';
import { LenderAvatar } from '@/components/LenderAvatar';
import type { Lender } from '@/types';

export default function LendersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const { lenders, commitments, commitmentPayments, userProfile } = useApp();
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const sorted = [...lenders].sort((a, b) => {
    const sa = getLenderStats(a.id, commitments, commitmentPayments).monthlyTotal;
    const sb = getLenderStats(b.id, commitments, commitmentPayments).monthlyTotal;
    return sb - sa;
  });

  const renderItem = ({ item }: { item: Lender }) => {
    const stats = getLenderStats(item.id, commitments, commitmentPayments);
    const typeLabel = t.lenders.typeLabels[item.type] ?? item.type;

    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/lenders/[id]', params: { id: item.id } })}
        activeOpacity={0.78}
        style={[styles.card, { flexDirection: dir.row, backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}
      >
        <LenderAvatar lender={item} size={46} fontSize={18} />
        <View style={styles.body}>
          <Text numberOfLines={1} style={[styles.name, { textAlign: dir.textAlign, color: colors.foreground }]}>{item.name}</Text>
          <View style={[styles.metaRow, { flexDirection: dir.row }]}>
            <View style={[styles.typePill, { backgroundColor: item.color + '18' }]}>
              <Text style={[styles.typeText, { color: item.color }]}>{typeLabel}</Text>
            </View>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {stats.activeCommitmentCount} {t.commitments.countSuffix}
            </Text>
          </View>
        </View>
        <View style={[styles.right, { alignItems: dir.isRTL ? 'flex-start' : 'flex-end' }]}>
          <Text style={[styles.amount, { color: colors.commitment }]}>{formatCurrency(stats.monthlyTotal, currency)}</Text>
          <Text style={[styles.amountSub, { color: colors.mutedForeground }]}>{t.lenders.statMonthly}</Text>
        </View>
        <Feather name={dir.chevronDetail as any} size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + bottomPad + 90 }, !sorted.length && styles.emptyList]}
        ListEmptyComponent={
          <EmptyState
            icon="briefcase"
            title={t.lenders.emptyTitle}
            description={t.lenders.emptyDesc}
            actionLabel={t.lenders.addLabel}
            onAction={() => router.push('/lenders/add')}
          />
        }
        renderItem={renderItem}
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + bottomPad + 20 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/lenders/add'); }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  emptyList: { flex: 1 },
  card: { alignItems: 'center', padding: 14, borderWidth: 1, gap: 12, marginBottom: 8 },
  body: { flex: 1 },
  name: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', marginBottom: 4 },
  metaRow: { alignItems: 'center', gap: 8 },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  typeText: { fontSize: 11, fontFamily: 'Cairo_500Medium' },
  metaText: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  right: { flexShrink: 0 },
  amount: { fontSize: 14, fontFamily: 'Cairo_700Bold' },
  amountSub: { fontSize: 10, fontFamily: 'Cairo_400Regular', marginTop: 2 },
  fab: { position: 'absolute', left: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
});
