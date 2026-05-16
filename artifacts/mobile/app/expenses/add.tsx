import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { EXPENSE_CATEGORIES, ExpenseCategory } from '@/types';

export default function AddExpenseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { expenses, addExpense, updateExpense, deleteExpense } = useApp();

  const existing = params.id ? expenses.find((e) => e.id === params.id) : undefined;
  const isEdit = !!existing;

  const todayStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState(existing?.title ?? '');
  const [category, setCategory] = useState<ExpenseCategory>(existing?.category ?? 'أخرى');
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? '');
  const [expenseDate, setExpenseDate] = useState(existing?.expenseDate ?? todayStr);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; amount?: string }>({});

  const validate = () => {
    const errs: { title?: string; amount?: string } = {};
    if (!title.trim()) errs.title = 'الرجاء إدخال العنوان';
    if (!amount || parseFloat(amount) <= 0) errs.amount = 'الرجاء إدخال مبلغ صحيح';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = {
      title: title.trim(),
      category,
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
    Alert.alert('حذف المصروف', `هل تريد حذف "${existing?.title}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
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
        label="عنوان المصروف"
        value={title}
        onChangeText={(v) => { setTitle(v); setErrors((e) => ({ ...e, title: undefined })); }}
        placeholder="مثال: غداء في المطعم"
        error={errors.title}
        autoFocus
      />

      <Input
        label="المبلغ"
        value={amount}
        onChangeText={(v) => { setAmount(v); setErrors((e) => ({ ...e, amount: undefined })); }}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={errors.amount}
      />

      <Select
        label="فئة المصروف"
        value={category}
        options={EXPENSE_CATEGORIES.map((c) => ({ label: c, value: c }))}
        onValueChange={(v) => setCategory(v as ExpenseCategory)}
      />

      <Input
        label="تاريخ المصروف (YYYY-MM-DD)"
        value={expenseDate}
        onChangeText={setExpenseDate}
        placeholder={todayStr}
      />

      <Input
        label="ملاحظات (اختياري)"
        value={notes}
        onChangeText={setNotes}
        placeholder="أي ملاحظات..."
        multiline
        numberOfLines={3}
        style={{ height: 80, textAlignVertical: 'top' }}
      />

      <Button
        title={loading ? 'جاري الحفظ...' : isEdit ? 'تحديث المصروف' : 'إضافة المصروف'}
        onPress={handleSave}
        fullWidth
        loading={loading}
        style={{ marginTop: 8 }}
      />

      {isEdit ? (
        <Button
          title="حذف هذا المصروف"
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
