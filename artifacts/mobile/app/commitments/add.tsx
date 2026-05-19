import React, { useState, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, Switch, Alert, Platform, TouchableOpacity } from 'react-native';
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
import { COMMITMENT_CATEGORIES, CommitmentKind } from '@/types';
import { FIELD_LIMITS, validateAmount, validateDate, validateDay, validateNotes, validateTitle } from '@/utils/validation';
import { toAsciiDigits, formatCurrency } from '@/utils/format';

interface FormErrors {
  title?: string;
  amount?: string;
  dueDay?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  totalAmount?: string;
  installmentCount?: string;
  paidSoFar?: string;
}

const NO_LENDER = '__none__';

export default function AddCommitmentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const params = useLocalSearchParams<{ id?: string }>();
  const { commitments, commitmentPayments, lenders, addCommitment, updateCommitment, deleteCommitment, customTypes, userProfile, seedPastInstallments } = useApp();
  const currency = userProfile?.preferredCurrency ?? 'SAR';

  const existing = params.id ? commitments.find((c) => c.id === params.id) : undefined;
  const isEdit = !!existing;
  const allCategories = [...COMMITMENT_CATEGORIES, ...customTypes.commitmentCategories];

  const [title, setTitle] = useState(existing?.title ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'أخرى');
  const [kind, setKind] = useState<CommitmentKind>(existing?.kind ?? 'recurring_bill');
  const [lenderId, setLenderId] = useState<string>(existing?.lenderId ?? NO_LENDER);
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? '');
  const [totalAmount, setTotalAmount] = useState(existing?.totalAmount?.toString() ?? '');
  const [installmentCount, setInstallmentCount] = useState(existing?.installmentCount?.toString() ?? '');
  // For new finite loans: the number of past installments to seed as paid.
  // For edits: the target total paid count — we seed (pNum - existingPaid)
  // more historical installments via seedPastInstallments (idempotent).
  // Pre-filled in edit mode with the current paid count so the user sees what's
  // there and can simply bump the number up to backfill more.
  const existingPaidCount = useMemo(
    () => existing ? commitmentPayments.filter((p) => p.commitmentId === existing.id && p.status === 'paid').length : 0,
    [existing, commitmentPayments],
  );
  const [paidSoFar, setPaidSoFar] = useState(existing ? existingPaidCount.toString() : '');
  const [dueDay, setDueDay] = useState(existing?.dueDay?.toString() ?? '1');
  const [isRecurring, setIsRecurring] = useState(existing?.isRecurring ?? true);
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [startDate, setStartDate] = useState(existing?.startDate ?? '');
  const [endDate, setEndDate] = useState(existing?.endDate ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const isFinite = kind === 'finite_loan';

  // ── Installment balance helper ────────────────────────────────────────────
  // Lets the user fill any two of (monthly amount, total, count) and compute
  // the third. Also surfaces mismatch warnings so values like 200 × 50 ≠ 100000
  // are caught before save.
  const aNum = parseFloat(toAsciiDigits(amount));
  const tNum = parseFloat(toAsciiDigits(totalAmount));
  const cNum = parseInt(toAsciiDigits(installmentCount), 10);
  const hasA = Number.isFinite(aNum) && aNum > 0;
  const hasT = Number.isFinite(tNum) && tNum > 0;
  const hasC = Number.isFinite(cNum) && cNum > 0;
  const computedTotal = hasA && hasC ? aNum * cNum : null;
  // Tolerate small rounding diffs (1 currency unit) so 99.99 vs 100 isn't flagged.
  const mismatch = hasA && hasT && hasC && Math.abs((computedTotal ?? 0) - tNum) > 1;

  const pNum = parseInt(toAsciiDigits(paidSoFar), 10);
  const hasP = Number.isFinite(pNum) && pNum > 0;
  const remainingInstallments = hasC ? Math.max(0, cNum - (hasP ? pNum : 0)) : null;

  const fixMonthly = () => {
    if (!hasT || !hasC) return;
    setAmount((tNum / cNum).toFixed(2));
    clearError('amount');
  };
  const fixCount = () => {
    if (!hasT || !hasA) return;
    setInstallmentCount(String(Math.max(1, Math.round(tNum / aNum))));
    clearError('installmentCount');
  };
  const fixTotal = () => {
    if (!hasA || !hasC) return;
    setTotalAmount((aNum * cNum).toFixed(2));
    clearError('totalAmount');
  };

  const lenderOptions = useMemo<{ label: string; value: string }[]>(() => {
    const sorted = [...lenders].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    return [
      { label: t.commitments.lenderPlaceholder, value: NO_LENDER },
      ...sorted.map((l) => ({ label: l.name, value: l.id })),
    ];
  }, [lenders, t.commitments.lenderPlaceholder]);

  const kindOptions = [
    { label: t.commitments.kindRecurringBill, value: 'recurring_bill' },
    { label: t.commitments.kindFiniteLoan, value: 'finite_loan' },
    { label: t.commitments.kindOneTime, value: 'one_time' },
  ];

  const clearError = (field: keyof FormErrors) =>
    setErrors((e) => ({ ...e, [field]: undefined }));

  const validate = (): boolean => {
    const errs: FormErrors = {
      title: validateTitle(title, t),
      amount: validateAmount(amount, t),
      dueDay: validateDay(dueDay, t, true),
      startDate: validateDate(startDate, t, false),
      endDate: validateDate(endDate, t, false),
      notes: validateNotes(notes, t),
    };
    if (isFinite) {
      errs.totalAmount = validateAmount(totalAmount, t);
      const ic = toAsciiDigits(installmentCount).trim();
      if (!ic || !/^\d+$/.test(ic) || parseInt(ic, 10) < 1) {
        errs.installmentCount = t.forms.errorCount;
      }
      const ps = toAsciiDigits(paidSoFar).trim();
      if (ps && /^\d+$/.test(ps)) {
        const psn = parseInt(ps, 10);
        const icn = parseInt(ic || '0', 10);
        if (psn >= icn) errs.paidSoFar = t.commitments.paidSoFarError;
        // In edit mode, the field represents the *total* paid count and we
        // can only add historical installments (never remove). Lowering it
        // is a destructive op users should do via the schedule editor.
        if (isEdit && psn < existingPaidCount) errs.paidSoFar = t.commitments.paidSoFarError;
      }
    }
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  };

  const persist = async () => {
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = {
      title: title.trim(),
      category: category as any,
      kind,
      lenderId: lenderId === NO_LENDER ? undefined : lenderId,
      amount: parseFloat(toAsciiDigits(amount)),
      totalAmount: isFinite ? parseFloat(toAsciiDigits(totalAmount)) : undefined,
      installmentCount: isFinite ? parseInt(toAsciiDigits(installmentCount), 10) : undefined,
      dueDay: parseInt(toAsciiDigits(dueDay), 10) || 1,
      isRecurring,
      isActive,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      notes: notes.trim() || undefined,
    };
    if (isEdit && params.id) {
      await updateCommitment(params.id, data);
      // In edit mode the paid-count field is the *target* total. Seed only
      // the delta (seedPastInstallments is idempotent — it skips months
      // that already have a payment record).
      if (isFinite && hasP && data.amount > 0 && data.installmentCount && pNum < data.installmentCount && pNum > existingPaidCount) {
        await seedPastInstallments(params.id, pNum - existingPaidCount, data.amount, data.dueDay);
      }
    } else {
      const newId = await addCommitment(data);
      // Seed paid history for new finite loans that the user has already
      // partially paid before tracking them in the app.
      if (isFinite && hasP && data.amount > 0 && data.installmentCount && pNum < data.installmentCount) {
        await seedPastInstallments(newId, pNum, data.amount, data.dueDay);
      }
    }
    setLoading(false);
    router.back();
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (isFinite && mismatch) {
      Alert.alert(
        t.commitments.installmentMismatchTitle,
        t.commitments.installmentMismatchMsg,
        [
          { text: t.common.cancel, style: 'cancel' },
          { text: t.commitments.installmentFixTotal, onPress: () => { fixTotal(); } },
          { text: t.commitments.installmentSaveAnyway, style: 'destructive', onPress: () => { persist(); } },
        ],
      );
      return;
    }
    await persist();
  };

  const handleDelete = () => {
    Alert.alert(t.commitments.deleteTitle, t.commitments.deleteMsg(existing?.title ?? ''), [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: async () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); await deleteCommitment(params.id!); router.back(); } },
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
        onChangeText={(v) => { setTitle(v); clearError('title'); }}
        placeholder={t.forms.commitmentTitle}
        error={errors.title}
        maxLength={FIELD_LIMITS.title}
        autoFocus
      />

      <Select
        label={t.commitments.kindLabel}
        value={kind}
        options={kindOptions}
        onValueChange={(v) => setKind(v as CommitmentKind)}
      />

      <Input
        label={t.forms.commitmentAmountLabel}
        value={amount}
        onChangeText={(v) => { setAmount(v); clearError('amount'); }}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={errors.amount}
        maxLength={16}
      />

      {isFinite ? (
        <>
          <Input
            label={t.commitments.totalAmountLabel}
            value={totalAmount}
            onChangeText={(v) => { setTotalAmount(v); clearError('totalAmount'); }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={errors.totalAmount}
            maxLength={16}
          />
          <Input
            label={t.commitments.installmentCountLabel}
            value={installmentCount}
            onChangeText={(v) => { setInstallmentCount(v); clearError('installmentCount'); }}
            placeholder="12"
            keyboardType="number-pad"
            error={errors.installmentCount}
            maxLength={4}
          />

          <Input
            label={t.commitments.paidSoFarLabel}
            value={paidSoFar}
            onChangeText={(v) => { setPaidSoFar(v); clearError('paidSoFar'); }}
            placeholder="0"
            keyboardType="number-pad"
            error={errors.paidSoFar}
            maxLength={4}
            selectTextOnFocus
          />
          <Text style={[styles.fieldHint, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
            {isEdit
              ? t.commitments.paidSoFarEditHint(existingPaidCount)
              : t.commitments.paidSoFarHint}
          </Text>
          {hasP && hasC && remainingInstallments !== null && pNum < cNum && (
            <View style={[styles.paidSummary, { backgroundColor: colors.success + '10', borderColor: colors.success + '40' }]}>
              <Feather name="check-circle" size={14} color={colors.success} />
              <Text style={[styles.paidSummaryText, { color: colors.success, textAlign: dir.textAlign, flex: 1 }]}>
                {t.commitments.paidSoFarSummary(pNum, cNum, remainingInstallments)}
              </Text>
            </View>
          )}

          <View style={[styles.helperBox, {
            backgroundColor: mismatch ? colors.danger + '10' : colors.muted,
            borderColor: mismatch ? colors.danger + '50' : colors.border,
          }]}>
            <View style={[styles.helperHeader, { flexDirection: dir.row }]}>
              <Feather
                name={mismatch ? 'alert-triangle' : 'check-circle'}
                size={14}
                color={mismatch ? colors.danger : colors.success}
              />
              <Text style={[styles.helperTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>
                {t.commitments.installmentHelperTitle}
              </Text>
            </View>
            <Text style={[styles.helperHint, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
              {t.commitments.installmentHelperHint}
            </Text>
            {computedTotal !== null && (
              <Text style={[styles.helperStatus, {
                textAlign: dir.textAlign,
                color: mismatch ? colors.danger : colors.success,
              }]}>
                {hasT && mismatch
                  ? t.commitments.installmentMismatch(formatCurrency(computedTotal, currency), formatCurrency(tNum, currency))
                  : hasT
                    ? t.commitments.installmentMatch
                    : `${formatCurrency(aNum, currency)} × ${cNum} = ${formatCurrency(computedTotal, currency)}`}
              </Text>
            )}
            <View style={[styles.helperBtnRow, { flexDirection: dir.row }]}>
              <TouchableOpacity
                onPress={fixMonthly}
                disabled={!hasT || !hasC}
                style={[styles.helperBtn, { borderColor: colors.border, opacity: !hasT || !hasC ? 0.4 : 1 }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.helperBtnText, { color: colors.primary }]}>{t.commitments.installmentFixMonthly}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={fixCount}
                disabled={!hasT || !hasA}
                style={[styles.helperBtn, { borderColor: colors.border, opacity: !hasT || !hasA ? 0.4 : 1 }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.helperBtnText, { color: colors.primary }]}>{t.commitments.installmentFixCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={fixTotal}
                disabled={!hasA || !hasC}
                style={[styles.helperBtn, { borderColor: colors.border, opacity: !hasA || !hasC ? 0.4 : 1 }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.helperBtnText, { color: colors.primary }]}>{t.commitments.installmentFixTotal}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : null}

      <Select
        label={t.forms.commitmentCategoryLabel}
        value={category}
        options={allCategories.map((c) => ({ label: c, value: c }))}
        onValueChange={(v) => setCategory(v as typeof category)}
      />

      <View style={[styles.lenderRow, { flexDirection: dir.row }]}>
        <View style={{ flex: 1 }}>
          <Select
            label={t.commitments.lenderLabel}
            value={lenderId}
            options={lenderOptions}
            onValueChange={(v) => setLenderId(v)}
          />
        </View>
      </View>
      <TouchableOpacity
        onPress={() => router.push('/lenders/add')}
        style={[styles.addLenderLink, { flexDirection: dir.row }]}
        activeOpacity={0.7}
      >
        <Feather name="plus-circle" size={14} color={colors.primary} />
        <Text style={[styles.addLenderText, { color: colors.primary }]}>{t.commitments.addNewLender}</Text>
      </TouchableOpacity>

      <Input
        label={t.forms.dueDayLabel}
        value={dueDay}
        onChangeText={(v) => { setDueDay(v); clearError('dueDay'); }}
        placeholder="1"
        keyboardType="number-pad"
        error={errors.dueDay}
        maxLength={2}
      />

      <View style={[styles.switchRow, { flexDirection: dir.row, borderColor: colors.border }]}>
        <Switch value={isRecurring} onValueChange={setIsRecurring} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.switchLabel, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.commitments.recurringLabel}</Text>
          <Text style={[styles.switchSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{isRecurring ? t.commitments.recurringYes : t.commitments.recurringNo}</Text>
        </View>
      </View>

      <View style={[styles.switchRow, { flexDirection: dir.row, borderColor: colors.border }]}>
        <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: colors.border, true: colors.success }} thumbColor="#fff" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.switchLabel, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.commitments.activeLabel}</Text>
          <Text style={[styles.switchSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{isActive ? t.commitments.activeYes : t.commitments.activeNo}</Text>
        </View>
      </View>

      <Input label={t.forms.startDateLabel} value={startDate} onChangeText={(v) => { setStartDate(v); clearError('startDate'); }} placeholder="2024-01-01" keyboardType="numbers-and-punctuation" error={errors.startDate} maxLength={10} />
      <Input label={t.forms.endDateLabel} value={endDate} onChangeText={(v) => { setEndDate(v); clearError('endDate'); }} placeholder="2026-12-31" keyboardType="numbers-and-punctuation" error={errors.endDate} maxLength={10} />
      <Input label={t.forms.notesLabel} value={notes} onChangeText={(v) => { setNotes(v); clearError('notes'); }} placeholder="" multiline numberOfLines={3} maxLength={FIELD_LIMITS.notes} error={errors.notes} style={{ height: 80, textAlignVertical: 'top' }} />
      <Button title={loading ? t.common.saving : isEdit ? t.commitments.updateBtn : t.commitments.addBtn} onPress={handleSave} fullWidth loading={loading} style={{ marginTop: 8 }} />
      {isEdit ? <Button title={t.commitments.deleteBtn} onPress={handleDelete} variant="destructive" fullWidth style={{ marginTop: 10 }} disabled={loading} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  switchRow: { alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 14 },
  switchLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 2 },
  switchSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  lenderRow: { alignItems: 'flex-start' },
  addLenderLink: { alignItems: 'center', gap: 6, marginTop: -6, marginBottom: 14, paddingVertical: 4 },
  addLenderText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  helperBox: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 14, gap: 6 },
  helperHeader: { alignItems: 'center', gap: 6 },
  helperTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 },
  helperHint: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16 },
  helperStatus: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  helperBtnRow: { flexWrap: 'wrap', gap: 6, marginTop: 6 },
  helperBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  helperBtnText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  fieldHint: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16, marginTop: -8, marginBottom: 12 },
  paidSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 14 },
  paidSummaryText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});
