import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Platform, TouchableOpacity, Alert, Switch } from 'react-native';
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
import { Select } from '@/components/ui/Select';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { CurrencyAmountInput } from '@/components/CurrencyAmountInput';
import { BILLING_CYCLES, GOAL_COLOR_PALETTE, BillingCycle } from '@/types';
import { FIELD_LIMITS, validateTitle, validateAmount, validateDate, validateNotes } from '@/utils/validation';
import { toAsciiDigits } from '@/utils/format';
import { iosScrollViewObserverProps } from '@/utils/scrollView';

const SUB_ICONS = [
  'film', 'tv', 'music', 'cloud', 'book', 'shopping-bag',
  'globe', 'monitor', 'headphones', 'gift', 'wifi', 'zap',
];

interface FormErrors { name?: string; amount?: string; date?: string; notes?: string; }

export default function AddSubscriptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const params = useLocalSearchParams<{ id?: string }>();
  const { subscriptions, addSubscription, updateSubscription, deleteSubscription } = useApp();

  const existing = params.id ? subscriptions.find((s) => s.id === params.id) : undefined;
  const isEdit = !!existing;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? '');
  const [cycle, setCycle] = useState<BillingCycle>(existing?.cycle ?? 'monthly');
  const [nextRenewal, setNextRenewal] = useState(existing?.nextRenewalDate ?? todayStr);
  const [icon, setIcon] = useState(existing?.icon ?? SUB_ICONS[0]);
  const [color, setColor] = useState(existing?.color ?? GOAL_COLOR_PALETTE[0]);
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const clearError = (f: keyof FormErrors) => setErrors((e) => ({ ...e, [f]: undefined }));

  const validate = (): boolean => {
    const errs: FormErrors = {
      name: validateTitle(name, t),
      amount: validateAmount(amount, t),
      date: validateDate(nextRenewal, t, true),
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
      amount: parseFloat(toAsciiDigits(amount)),
      cycle,
      nextRenewalDate: nextRenewal.trim(),
      icon,
      color,
      isActive,
      notes: notes.trim() || undefined,
    };
    if (isEdit && params.id) await updateSubscription(params.id, data);
    else await addSubscription(data);
    setLoading(false);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(t.subscriptions.deleteTitle, t.subscriptions.deleteMsg(existing?.name ?? ''), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await deleteSubscription(params.id!);
          router.back();
        },
      },
    ]);
  };

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <ScrollView
      {...iosScrollViewObserverProps}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Input
        label={t.subscriptions.fieldName}
        value={name}
        onChangeText={(v) => { setName(v); clearError('name'); }}
        error={errors.name}
        maxLength={FIELD_LIMITS.title}
      />
      <CurrencyAmountInput
        label={t.subscriptions.fieldAmount}
        value={amount}
        onChangeText={(v) => { setAmount(v); clearError('amount'); }}
        placeholder="0.00"
        error={errors.amount}
      />
      <Select
        label={t.subscriptions.fieldCycle}
        value={cycle}
        options={BILLING_CYCLES.map((c) => ({ label: t.subscriptions.cycleLabels[c] ?? c, value: c }))}
        onValueChange={(v) => setCycle(v as BillingCycle)}
      />
      <DatePickerField
        label={t.subscriptions.fieldNextRenewal}
        value={nextRenewal}
        onChange={(v) => { setNextRenewal(v); clearError('date'); }}
        error={errors.date}
      />

      <Text style={[styles.label, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.subscriptions.fieldIcon}</Text>
      <View style={[styles.iconGrid, { flexDirection: dir.row }]}>
        {SUB_ICONS.map((ic) => (
          <TouchableOpacity
            key={ic}
            onPress={() => { setIcon(ic); Haptics.selectionAsync(); }}
            style={[styles.iconBtn, { backgroundColor: icon === ic ? color + '22' : colors.muted, borderColor: icon === ic ? color : 'transparent' }]}
            activeOpacity={0.8}
          >
            <Feather name={ic as any} size={20} color={icon === ic ? color : colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.subscriptions.fieldColor}</Text>
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

      <View style={[styles.switchRow, { flexDirection: dir.row, borderColor: colors.border, backgroundColor: colors.card }]}>
        <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: colors.primary }} />
        <Text style={[styles.switchLabel, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.subscriptions.fieldActive}</Text>
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
        title={loading ? t.common.saving : isEdit ? t.subscriptions.updateBtn : t.subscriptions.addBtn}
        onPress={handleSave}
        fullWidth
        loading={loading}
        style={{ marginTop: 8 }}
      />
      {isEdit ? (
        <Button
          title={t.subscriptions.deleteBtn}
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
  switchRow: { alignItems: 'center', gap: 12, padding: 14, borderWidth: 1.5, borderRadius: 10, marginBottom: 14 },
  switchLabel: { flex: 1, fontSize: 14, fontFamily: 'Cairo_500Medium' },
});
