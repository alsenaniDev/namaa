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
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { CurrencyAmountInput } from '@/components/CurrencyAmountInput';
import { GOAL_COLOR_PALETTE, GOAL_ICONS } from '@/types';
import { FIELD_LIMITS, validateTitle, validateAmount, validateDate, validateNotes } from '@/utils/validation';
import { toAsciiDigits } from '@/utils/format';

interface FormErrors { name?: string; target?: string; current?: string; date?: string; notes?: string; }

export default function AddGoalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const params = useLocalSearchParams<{ id?: string }>();
  const { goals, addGoal, updateGoal, deleteGoal } = useApp();

  const existing = params.id ? goals.find((g) => g.id === params.id) : undefined;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name ?? '');
  const [target, setTarget] = useState(existing?.targetAmount?.toString() ?? '');
  const [current, setCurrent] = useState(existing?.currentAmount?.toString() ?? '');
  const [targetDate, setTargetDate] = useState(existing?.targetDate ?? '');
  const [color, setColor] = useState(existing?.color ?? GOAL_COLOR_PALETTE[0]);
  const [icon, setIcon] = useState(existing?.icon ?? GOAL_ICONS[0]);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const clearError = (f: keyof FormErrors) => setErrors((e) => ({ ...e, [f]: undefined }));

  const validate = (): boolean => {
    const errs: FormErrors = {
      name: validateTitle(name, t),
      target: validateAmount(target, t),
      current: current.trim() ? validateAmount(current, t) : undefined,
      date: targetDate.trim() ? validateDate(targetDate, t) : undefined,
      notes: validateNotes(notes, t),
    };
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = {
      name: name.trim(),
      targetAmount: parseFloat(toAsciiDigits(target)),
      currentAmount: current.trim() ? parseFloat(toAsciiDigits(current)) : (existing?.currentAmount ?? 0),
      targetDate: targetDate.trim() || undefined,
      color,
      icon,
      isCompleted: existing?.isCompleted ?? false,
      notes: notes.trim() || undefined,
    };
    if (isEdit && params.id) await updateGoal(params.id, data);
    else await addGoal(data);
    setLoading(false);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(t.goals.deleteTitle, t.goals.deleteMsg(existing?.name ?? ''), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await deleteGoal(params.id!);
          router.dismissAll();
          router.replace('/goals');
        },
      },
    ]);
  };

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Input
        label={t.goals.fieldName}
        value={name}
        onChangeText={(v) => { setName(v); clearError('name'); }}
        error={errors.name}
        maxLength={FIELD_LIMITS.title}
      />
      <CurrencyAmountInput
        label={t.goals.fieldTarget}
        value={target}
        onChangeText={(v) => { setTarget(v); clearError('target'); }}
        placeholder="0.00"
        error={errors.target}
      />
      <CurrencyAmountInput
        label={t.goals.fieldCurrent}
        value={current}
        onChangeText={(v) => { setCurrent(v); clearError('current'); }}
        placeholder="0.00"
        error={errors.current}
      />
      <DatePickerField
        label={t.goals.fieldTargetDate}
        value={targetDate}
        onChange={(v) => { setTargetDate(v); clearError('date'); }}
        error={errors.date}
        allowClear
      />

      <Text style={[styles.label, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.goals.fieldIcon}</Text>
      <View style={[styles.iconGrid, { flexDirection: dir.row }]}>
        {GOAL_ICONS.map((ic) => (
          <TouchableOpacity
            key={ic}
            onPress={() => { setIcon(ic); Haptics.selectionAsync(); }}
            style={[
              styles.iconBtn,
              {
                backgroundColor: icon === ic ? color + '22' : colors.muted,
                borderColor: icon === ic ? color : 'transparent',
              },
            ]}
            activeOpacity={0.8}
          >
            <Feather name={ic as any} size={20} color={icon === ic ? color : colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.goals.fieldColor}</Text>
      <View style={[styles.colorRow, { flexDirection: dir.row }]}>
        {GOAL_COLOR_PALETTE.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => { setColor(c); Haptics.selectionAsync(); }}
            style={[styles.colorSwatch, { backgroundColor: c, borderColor: color === c ? colors.foreground : 'transparent' }]}
            activeOpacity={0.8}
          />
        ))}
      </View>

      <Input
        label={t.forms.notesLabel}
        value={notes}
        onChangeText={(v) => { setNotes(v); clearError('notes'); }}
        multiline
        numberOfLines={3}
        maxLength={FIELD_LIMITS.notes}
        error={errors.notes}
        style={{ height: 80, textAlignVertical: 'top' }}
      />

      <Button
        title={loading ? t.common.saving : isEdit ? t.goals.updateBtn : t.goals.addBtn}
        onPress={handleSave}
        fullWidth
        loading={loading}
        style={{ marginTop: 8 }}
      />
      {isEdit ? (
        <Button
          title={t.goals.deleteBtn}
          onPress={handleDelete}
          variant="destructive"
          fullWidth
          style={{ marginTop: 10 }}
          disabled={loading}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  label: { fontSize: 14, fontFamily: 'Cairo_500Medium', marginBottom: 8 },
  iconGrid: { flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  iconBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  colorRow: { flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2.5 },
});
