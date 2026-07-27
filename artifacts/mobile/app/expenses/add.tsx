import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { CurrencyAmountInput } from '@/components/CurrencyAmountInput';
import { EXPENSE_CATEGORIES } from '@/types';
import { FIELD_LIMITS, validateAmount, validateDate, validateNotes, validateTitle } from '@/utils/validation';

interface FormErrors {
  title?: string;
  amount?: string;
  expenseDate?: string;
  notes?: string;
}

export default function AddExpenseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const params = useLocalSearchParams<{ id?: string }>();
  const { expenses, addExpense, updateExpense, deleteExpense, customTypes } = useApp();

  const existing = params.id ? expenses.find((e) => e.id === params.id) : undefined;
  const isEdit = !!existing;
  const todayStr = new Date().toISOString().split('T')[0];

  const allCategories = [...EXPENSE_CATEGORIES, ...customTypes.expenseCategories];

  const [title, setTitle] = useState(existing?.title ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'أخرى');
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? '');
  const [expenseDate, setExpenseDate] = useState(existing?.expenseDate ?? todayStr);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const clearError = (field: keyof FormErrors) =>
    setErrors((e) => ({ ...e, [field]: undefined }));

  const validate = (): boolean => {
    const errs: FormErrors = {
      title: validateTitle(title, t),
      amount: validateAmount(amount, t),
      expenseDate: validateDate(expenseDate, t, true),
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
      title: title.trim(),
      category: category as any,
      amount: parseFloat(amount),
      expenseDate: expenseDate || todayStr,
      notes: notes.trim() || undefined,
    };
    if (isEdit && params.id) {
      await updateExpense(params.id, data);
    } else {
      await addExpense(data);
    }
    setLoading(false);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(t.expenses.deleteTitle, t.expenses.deleteMsg(existing?.title ?? ''), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await deleteExpense(params.id!);
          router.back();
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
        label={t.forms.titleLabel}
        value={title}
        onChangeText={(v) => { setTitle(v); clearError('title'); }}
        placeholder={t.forms.titleExpensePlaceholder}
        error={errors.title}
        maxLength={FIELD_LIMITS.title}
      />

      <CurrencyAmountInput
        label={t.forms.amountLabel}
        value={amount}
        onChangeText={(v) => { setAmount(v); clearError('amount'); }}
        placeholder="0.00"
        error={errors.amount}
        maxLength={16}
      />

      <Select
        label={t.forms.categoryLabel}
        value={category}
        options={allCategories.map((c) => ({ label: c, value: c }))}
        onValueChange={(v) => setCategory(v as typeof category)}
      />

      <DatePickerField
        label={t.forms.receivedDateLabel}
        value={expenseDate}
        onChange={(v) => { setExpenseDate(v); clearError('expenseDate'); }}
        error={errors.expenseDate}
      />

      <Input
        label={t.forms.notesLabel}
        value={notes}
        onChangeText={(v) => { setNotes(v); clearError('notes'); }}
        placeholder=""
        multiline
        numberOfLines={3}
        maxLength={FIELD_LIMITS.notes}
        error={errors.notes}
        style={{ height: 80, textAlignVertical: 'top' }}
      />

      <Button
        title={loading ? t.common.saving : isEdit ? t.expenses.updateBtn : t.expenses.addBtn}
        onPress={handleSave}
        fullWidth
        loading={loading}
        style={{ marginTop: 8 }}
      />

      {isEdit ? (
        <Button
          title={t.expenses.deleteBtn}
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
});
