import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Switch, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { CurrencyAmountInput } from '@/components/CurrencyAmountInput';
import { INCOME_TYPES } from '@/types';
import { FIELD_LIMITS, validateAmount, validateDate, validateDay, validateNotes, validateTitle } from '@/utils/validation';
import { iosScrollViewObserverProps } from '@/utils/scrollView';

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const day = String(i + 1);
  return { label: day, value: day };
});

interface FormErrors {
  title?: string;
  amount?: string;
  receivedDay?: string;
  receivedDate?: string;
  notes?: string;
}

export default function AddIncomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const params = useLocalSearchParams<{ id?: string }>();
  const { incomes, addIncome, updateIncome, deleteIncome, customTypes } = useApp();

  const existing = params.id ? incomes.find((i) => i.id === params.id) : undefined;
  const isEdit = !!existing;
  const allTypes = [...INCOME_TYPES, ...customTypes.incomeTypes];

  const [title, setTitle] = useState(existing?.title ?? '');
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? '');
  const [type, setType] = useState(existing?.type ?? 'راتب');
  const [isRecurring, setIsRecurring] = useState(existing?.isRecurring ?? true);
  const [receivedDay, setReceivedDay] = useState(existing?.receivedDay?.toString() ?? '1');
  const [receivedDate, setReceivedDate] = useState(existing?.receivedDate ?? new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const clearError = (field: keyof FormErrors) =>
    setErrors((e) => ({ ...e, [field]: undefined }));

  const validate = (): boolean => {
    const errs: FormErrors = {
      title: validateTitle(title, t),
      amount: validateAmount(amount, t),
      notes: validateNotes(notes, t),
      receivedDay: isRecurring ? validateDay(receivedDay, t, true) : undefined,
      receivedDate: !isRecurring ? validateDate(receivedDate, t, true) : undefined,
    };
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = {
      title: title.trim(),
      amount: parseFloat(amount),
      type: type as any,
      isRecurring,
      receivedDay: parseInt(receivedDay, 10) || 1,
      receivedDate: isRecurring ? undefined : receivedDate,
      notes: notes.trim() || undefined,
    };
    if (isEdit && params.id) await updateIncome(params.id, data);
    else await addIncome(data);
    setLoading(false);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(t.income.deleteTitle, t.income.deleteMsg(existing?.title ?? ''), [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: async () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); await deleteIncome(params.id!); router.back(); } },
    ]);
  };

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <ScrollView {...iosScrollViewObserverProps} style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Input label={t.forms.titleLabel} value={title} onChangeText={(v) => { setTitle(v); clearError('title'); }} placeholder={t.forms.titleIncomePlaceholder} error={errors.title} maxLength={FIELD_LIMITS.title} />
      <CurrencyAmountInput label={t.forms.amountLabel} value={amount} onChangeText={(v) => { setAmount(v); clearError('amount'); }} placeholder="0.00" error={errors.amount} maxLength={16} />
      <Select label={t.forms.typeLabel} value={type} options={allTypes.map((t) => ({ label: t, value: t }))} onValueChange={(v) => setType(v as typeof type)} />

      <View style={[styles.switchRow, { flexDirection: dir.row, borderColor: colors.border }]}>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.switchLabel, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.forms.monthlyRecurring}</Text>
          <Text style={[styles.switchSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{isRecurring ? t.commitments.recurringYes : t.commitments.recurringNo}</Text>
        </View>
        <Switch value={isRecurring} onValueChange={setIsRecurring} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
      </View>

      {isRecurring
        ? (
          <Select
            label={t.forms.recurringDayLabel}
            value={receivedDay}
            options={DAY_OPTIONS}
            onValueChange={(v) => { setReceivedDay(v); clearError('receivedDay'); }}
          />
        )
        : (
          <DatePickerField
            label={t.forms.receivedDateLabel}
            value={receivedDate}
            onChange={(v) => { setReceivedDate(v); clearError('receivedDate'); }}
            error={errors.receivedDate}
          />
        )
      }

      <Input label={t.forms.notesLabel} value={notes} onChangeText={(v) => { setNotes(v); clearError('notes'); }} placeholder="" multiline numberOfLines={3} maxLength={FIELD_LIMITS.notes} error={errors.notes} style={{ height: 80, textAlignVertical: 'top' }} />
      <Button title={loading ? t.common.saving : isEdit ? t.income.updateBtn : t.income.addBtn} onPress={handleSave} fullWidth loading={loading} style={{ marginTop: 8 }} />
      {isEdit ? <Button title={t.income.deleteBtn} onPress={handleDelete} variant="destructive" fullWidth style={{ marginTop: 10 }} disabled={loading} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  switchRow: { alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 14 },
  switchLabel: { fontSize: 14, fontFamily: 'Cairo_500Medium', marginBottom: 2 },
  switchSub: { fontSize: 12, fontFamily: 'Cairo_400Regular' },
});
