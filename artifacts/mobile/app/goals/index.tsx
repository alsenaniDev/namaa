import React from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { EmptyState } from '@/components/ui/EmptyState';
import { GoalCard } from '@/components/GoalCard';
import { getGoalProgress } from '@/utils/calculations';
import { useResponsive } from '@/hooks/useResponsive';
import { iosScrollViewObserverProps } from '@/utils/scrollView';

export default function GoalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const responsive = useResponsive();
  // `dir` ensures any future inline rows/text follow RTL conventions like other list screens.
  void dir;
  const { goals, goalContributions, userProfile } = useApp();
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  // Sort: incomplete first, then by % desc — keeps active goals visible.
  const sorted = [...goals].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return getGoalProgress(b, goalContributions).percent - getGoalProgress(a, goalContributions).percent;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        {...iosScrollViewObserverProps}
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { padding: responsive.screenPadding, paddingBottom: insets.bottom + bottomPad + 90 }, !sorted.length && styles.emptyList]}
        ListEmptyComponent={
          <EmptyState
            icon="target"
            title={t.goals.emptyTitle}
            description={t.goals.emptyDesc}
            actionLabel={t.goals.addLabel}
            onAction={() => router.push('/goals/add')}
          />
        }
        renderItem={({ item }) => (
          <GoalCard
            goal={item}
            contributions={goalContributions}
            currency={currency}
            onPress={() => router.push({ pathname: '/goals/[id]', params: { id: item.id } })}
          />
        )}
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + bottomPad + 20 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/goals/add'); }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {},
  emptyList: { flex: 1 },
  fab: { position: 'absolute', left: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
});
