import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Switch, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { INCOME_TYPES } from '@/types';

export default function AddIncomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { incomes, addIncome, updateIncome, deleteIncome, customTypes } = useApp();

  const existing = params.id ? incomes.find((i) => i.id === params.id) : undefined;
  const isEdit = !!existing;

  // Merge built-in + custom types
  const allTypes = [...INCOME_TYPES, ...customTypes.incomeTypes];

  const [title, setTitle] = useState(existing?.title ?? '');
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? '');
  const [type, setType] = useState(existing?.type ?? 'راتب');
  const [isRecurring, setIsRecurring] = useState(existing?.isRecurring ?? true);
  const [receivedDay, setReceivedDay] = useState(existing?.receivedDay?.toString() ?? '1');
  const [receivedDate, setReceivedDate] = useState(existing?.receivedDate ?? new Date().toISOString().split('T')[0]);
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
      amount: parseFloat(amount),
      type: type as any,
      isRecurring,
      receivedDay: parseInt(receivedDay) || 1,
      receivedDate: isRecurring ? undefined : receivedDate,
      notes: notes.trim() || undefined,
    };
    if (isEdit && params.id) {
      await updateIncome(params.id, data);
    } else {
      await addIncome(data);
    }
    setLoading(false);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('حذف الدخل', `هل تريد حذف "${existing?.title}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await deleteIncome(params.id!);
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
        label="عنوان مصدر الدخل"
        value={title}
        onChangeText={(v) => { setTitle(v); setErrors((e) => ({ ...e, title: undefined })); }}
        placeholder="مثال: راتب شركة الأمل"
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
        label="نوع الدخل"
        value={type}
        options={allTypes.map((t) => ({ label: t, value: t }))}
        onValueChange={setType}
      />

      <View style={[styles.switchRow, { borderColor: colors.border }]}>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={[styles.switchLabel, { color: colors.foreground }]}>دخل متكرر شهرياً</Text>
          <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>
            {isRecurring ? 'يتكرر كل شهر تلقائياً' : 'دخل لمرة واحدة'}
          </Text>
        </View>
      </View>

      {isRecurring ? (
        <Input
          label="يوم الاستلام من الشهر"
          value={receivedDay}
          onChangeText={setReceivedDay}
          placeholder="1"
          keyboardType="number-pad"
        />
      ) : (
        <Input
          label="تاريخ الاستلام (YYYY-MM-DD)"
          value={receivedDate}
          onChangeText={setReceivedDate}
          placeholder={new Date().toISOString().split('T')[0]}
        />
      )}

      <Input
        label="ملاحظات (اختياري)"
        value={notes}
        onChangeText={setNotes}
        placeholder="أي ملاحظات إضافية..."
        multiline
        numberOfLines={3}
        style={{ height: 80, textAlignVertical: 'top' }}
      />

      <Button
        title={loading ? 'جاري الحفظ...' : isEdit ? 'تحديث الدخل' : 'إضافة الدخل'}
        onPress={handleSave}
        fullWidth
        loading={loading}
        style={{ marginTop: 8 }}
      />

      {isEdit ? (
        <Button
          title="حذف هذا الدخل"
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
  switchRow: { flexDirection: 'row-reverse', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 14 },
  switchLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', textAlign: 'right', marginBottom: 2 },
  switchSub: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'right' },
});
