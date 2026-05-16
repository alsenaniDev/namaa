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
import { COMMITMENT_CATEGORIES } from '@/types';
import * as dir from '@/utils/dir';

export default function AddCommitmentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const params = useLocalSearchParams<{ id?: string }>();
  const { commitments, addCommitment, updateCommitment, deleteCommitment, customTypes } = useApp();

  const existing = params.id ? commitments.find((c) => c.id === params.id) : undefined;
  const isEdit = !!existing;

  const allCategories = [...COMMITMENT_CATEGORIES, ...customTypes.commitmentCategories];

  const [title, setTitle] = useState(existing?.title ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'أخرى');
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? '');
  const [dueDay, setDueDay] = useState(existing?.dueDay?.toString() ?? '1');
  const [isRecurring, setIsRecurring] = useState(existing?.isRecurring ?? true);
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [startDate, setStartDate] = useState(existing?.startDate ?? '');
  const [endDate, setEndDate] = useState(existing?.endDate ?? '');
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
      category: category as any,
      amount: parseFloat(amount),
      dueDay: parseInt(dueDay) || 1,
      isRecurring,
      isActive,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      notes: notes.trim() || undefined,
    };
    if (isEdit && params.id) {
      await updateCommitment(params.id, data);
    } else {
      await addCommitment(data);
    }
    setLoading(false);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(t.commitments.deleteTitle, t.commitments.deleteMsg(existing?.title ?? ''), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await deleteCommitment(params.id!);
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
        label={t.forms.commitmentTitle}
        value={title}
        onChangeText={(v) => { setTitle(v); setErrors((e) => ({ ...e, title: undefined })); }}
        placeholder={t.forms.commitmentTitle}
        error={errors.title}
        autoFocus
      />

      <Input
        label={t.forms.commitmentAmountLabel}
        value={amount}
        onChangeText={(v) => { setAmount(v); setErrors((e) => ({ ...e, amount: undefined })); }}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={errors.amount}
      />

      <Select
        label={t.forms.commitmentCategoryLabel}
        value={category}
        options={allCategories.map((c) => ({ label: c, value: c }))}
        onValueChange={(v) => setCategory(v as typeof category)}
      />

      <Input
        label={t.forms.dueDayLabel}
        value={dueDay}
        onChangeText={setDueDay}
        placeholder="1"
        keyboardType="number-pad"
      />

      <View style={[styles.switchRow, { borderColor: colors.border }]}>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.switchLabel, { color: colors.foreground }]}>{t.commitments.recurringLabel}</Text>
          <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>
            {isRecurring ? t.commitments.recurringYes : t.commitments.recurringNo}
          </Text>
        </View>
      </View>

      <View style={[styles.switchRow, { borderColor: colors.border }]}>
        <Switch
          value={isActive}
          onValueChange={setIsActive}
          trackColor={{ false: colors.border, true: colors.success }}
          thumbColor="#fff"
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.switchLabel, { color: colors.foreground }]}>{t.commitments.activeLabel}</Text>
          <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>
            {isActive ? t.commitments.activeYes : t.commitments.activeNo}
          </Text>
        </View>
      </View>

      <Input
        label={t.forms.startDateLabel}
        value={startDate}
        onChangeText={setStartDate}
        placeholder="2024-01-01"
      />

      <Input
        label={t.forms.endDateLabel}
        value={endDate}
        onChangeText={setEndDate}
        placeholder="2026-12-31"
      />

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
        title={loading ? t.common.saving : isEdit ? t.commitments.updateBtn : t.commitments.addBtn}
        onPress={handleSave}
        fullWidth
        loading={loading}
        style={{ marginTop: 8 }}
      />

      {isEdit ? (
        <Button
          title={t.commitments.deleteBtn}
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
