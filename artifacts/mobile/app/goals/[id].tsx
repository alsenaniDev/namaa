import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Platform, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { CurrencyAmountInput } from '@/components/CurrencyAmountInput';
import { getGoalProgress } from '@/utils/calculations';
import { formatCurrency, formatShortDate, toAsciiDigits } from '@/utils/format';
import { validateAmount, validateDate } from '@/utils/validation';
import { iosScrollViewObserverProps } from '@/utils/scrollView';

export default function GoalDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const params = useLocalSearchParams<{ id: string }>();
  const { goals, goalContributions, userProfile, addGoalContribution, deleteGoalContribution, updateGoal } = useApp();
  const goal = goals.find((g) => g.id === params.id);
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr);
  const [errAmt, setErrAmt] = useState<string | undefined>();
  const [errDate, setErrDate] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  if (!goal) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState icon="alert-circle" title={t.common.notFound} description="" />
      </View>
    );
  }

  const prog = getGoalProgress(goal, goalContributions);
  const myContribs = goalContributions
    .filter((c) => c.goalId === goal.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleAddContribution = async () => {
    const ea = validateAmount(amount, t);
    const ed = validateDate(date, t, true);
    setErrAmt(ea);
    setErrDate(ed);
    if (ea || ed) return;
    setSaving(true);
    await addGoalContribution({
      goalId: goal.id,
      amount: parseFloat(toAsciiDigits(amount)),
      date,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAmount('');
    setDate(todayStr);
    setSaving(false);
  };

  const handleDeleteContrib = (id: string) => {
    Alert.alert(t.goals.deleteContribTitle, t.goals.deleteContribMsg, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: () => deleteGoalContribution(id) },
    ]);
  };

  const toggleCompleted = async () => {
    await updateGoal(goal.id, { isCompleted: !goal.isCompleted });
    Haptics.selectionAsync();
  };

  return (
    <ScrollView
      {...iosScrollViewObserverProps}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Card style={[styles.hero, { borderColor: goal.color + '55', backgroundColor: goal.color + '10' }]} padding={18}>
        <View style={[styles.heroRow, { flexDirection: dir.row }]}>
          <View style={[styles.heroIcon, { backgroundColor: goal.color + '22', borderColor: goal.color + '55' }]}>
            <Feather name={goal.icon as any} size={26} color={goal.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{goal.name}</Text>
            {goal.targetDate ? (
              <Text style={[styles.heroSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
                {formatShortDate(goal.targetDate)}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/goals/add', params: { id: goal.id } })}
            style={[styles.editBtn, { backgroundColor: colors.card }]}
          >
            <Feather name="edit-2" size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={[styles.statsRow, { flexDirection: dir.row }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statValue, { textAlign: dir.textAlign, color: goal.color }]}>
              {formatCurrency(prog.saved, currency)}
            </Text>
            <Text style={[styles.statLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.goals.savedLabel}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statValue, { textAlign: dir.textAlign, color: colors.foreground }]}>
              {formatCurrency(prog.remaining, currency)}
            </Text>
            <Text style={[styles.statLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.goals.remainingLabel}</Text>
          </View>
          <View>
            <Text style={[styles.statValue, { textAlign: dir.textAlign, color: goal.color }]}>{Math.round(prog.percent)}٪</Text>
            <Text style={[styles.statLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.goals.progressLabel}</Text>
          </View>
        </View>

        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.min(100, prog.percent)}%` as any,
                backgroundColor: goal.color,
                ...(dir.isRTL ? { position: 'absolute', right: 0, top: 0, bottom: 0 } : {}),
              },
            ]}
          />
        </View>

        {prog.suggestedMonthly !== null && prog.suggestedMonthly > 0 && !prog.isCompleted ? (
          <Text style={[styles.suggest, { textAlign: dir.textAlign, color: colors.foreground }]}>
            {t.goals.suggestedMonthly(formatCurrency(prog.suggestedMonthly, currency))}
          </Text>
        ) : null}

        <Button
          title={goal.isCompleted ? t.goals.markIncomplete : t.goals.markCompleted}
          onPress={toggleCompleted}
          variant={goal.isCompleted ? 'outline' : 'primary'}
          fullWidth
          style={{ marginTop: 12 }}
        />
      </Card>

      <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.goals.addContribution}</Text>
      <Card padding={14} style={{ marginBottom: 16 }}>
        <CurrencyAmountInput
          label={t.goals.contributionAmount}
          value={amount}
          onChangeText={(v) => { setAmount(v); setErrAmt(undefined); }}
          placeholder="0.00"
          error={errAmt}
        />
        <DatePickerField
          label={t.goals.contributionDate}
          value={date}
          onChange={(v) => { setDate(v); setErrDate(undefined); }}
          error={errDate}
        />
        <Button title={saving ? t.common.saving : t.goals.contributionAdd} onPress={handleAddContribution} fullWidth loading={saving} />
      </Card>

      <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.goals.sectionContributions}</Text>
      {myContribs.length === 0 ? (
        <Card padding={20}>
          <Text style={[styles.emptyText, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.goals.noContributions}</Text>
        </Card>
      ) : (
        myContribs.map((c) => (
          <Card key={c.id} padding={12} style={{ marginBottom: 8 }}>
            <View style={[styles.contribRow, { flexDirection: dir.row }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.contribAmt, { textAlign: dir.textAlign, color: goal.color }]}>
                  + {formatCurrency(c.amount, currency)}
                </Text>
                <Text style={[styles.contribDate, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
                  {formatShortDate(c.date)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteContrib(c.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="trash-2" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  hero: { marginBottom: 20, borderWidth: 1.5 },
  heroRow: { alignItems: 'center', gap: 12, marginBottom: 16 },
  heroIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  heroTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', marginBottom: 2 },
  heroSub: { fontSize: 12, fontFamily: 'Cairo_400Regular' },
  editBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statsRow: { gap: 8, marginBottom: 12 },
  statValue: { fontSize: 16, fontFamily: 'Cairo_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Cairo_400Regular', marginTop: 2 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 4 },
  fill: { height: 10, borderRadius: 5 },
  suggest: { fontSize: 12, fontFamily: 'Cairo_500Medium', marginTop: 10 },
  sectionTitle: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', marginBottom: 8, marginTop: 4 },
  emptyText: { fontSize: 13, fontFamily: 'Cairo_400Regular' },
  contribRow: { alignItems: 'center', gap: 10 },
  contribAmt: { fontSize: 14, fontFamily: 'Cairo_700Bold' },
  contribDate: { fontSize: 11, fontFamily: 'Cairo_400Regular', marginTop: 2 },
});
