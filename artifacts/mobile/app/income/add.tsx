import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Switch, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { INCOME_TYPES } from '@/types';
import * as dir from '@/utils/dir';

export default function AddIncomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
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
  const [errors, setErrors] = useState<{ title?: string; amount?: string }>({});

  const validate = () => {
    const errs: { title?: string; amount?: string } = {};
    if (!title.trim()) errs.title = t.forms.errorTitle;
    if (!amount || parseFloat(amount) <= 0) errs.amount = t.forms.errorAmount;
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
    Alert.alert(t.income.deleteTitle, t.income.deleteMsg(existing?.title ?? ''), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive',
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
        label={t.forms.titleLabel}
        value={title}
        onChangeText={(v) => { setTitle(v); setErrors((e) => ({ ...e, title: undefined })); }}
        placeholder={t.forms.titleLabel}
        error={errors.title}
        autoFocus
      />

      <Input
        label={t.forms.amountLabel}
        value={amount}
        onChangeText={(v) => { setAmount(v); setErrors((e) => ({ ...e, amount: undefined })); }}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={errors.amount}
      />

      <Select
        label={t.forms.typeLabel}
        value={type}
        options={allTypes.map((t) => ({ label: t, value: t }))}
        onValueChange={(v) => setType(v as typeof type)}
      />

      <View style={[styles.switchRow, { borderColor: colors.border }]}>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.switchLabel, { color: colors.foreground }]}>{t.forms.monthlyRecurring}</Text>
          <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>
            {isRecurring ? t.commitments.recurringYes : t.commitments.recurringNo}
          </Text>
        </View>
      </View>

      {isRecurring ? (
        <Input
          label={t.forms.recurringDayLabel}
          value={receivedDay}
          onChangeText={setReceivedDay}
          placeholder="1"
          keyboardType="number-pad"
        />
      ) : (
        <Input
          label={t.forms.receivedDateLabel}
          value={receivedDate}
          onChangeText={setReceivedDate}
          placeholder="YYYY-MM-DD"
        />
      )}

      <Input
        label={t.forms.notesLabel}
        value={notes}
        onChangeText={setNotes}
        placeholder=""
        multiline
        numberOfLines={3}
        style={{ height: 80, textAlignVertical: 'top' }}
      />

      <Button
        title={loading ? t.common.saving : isEdit ? t.income.updateBtn : t.income.addBtn}
        onPress={handleSave}
        fullWidth
        loading={loading}
        style={{ marginTop: 8 }}
      />

      {isEdit ? (
        <Button
          title={t.income.deleteBtn}
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
  switchRow: { flexDirection: dir.row, alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 14 },
  switchLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', textAlign: dir.textAlign, marginBottom: 2 },
  switchSub: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: dir.textAlign },
});
