import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Platform, Text } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { useDir } from '@/hooks/useDir';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { CurrencyAmountInput } from '@/components/CurrencyAmountInput';
import { EXPENSE_CATEGORIES } from '@/types';
import { FIELD_LIMITS, validateAmount, validateDate, validateNotes, validateTitle } from '@/utils/validation';
import { iosScrollViewObserverProps } from '@/utils/scrollView';
import { formatCurrency } from '@/utils/format';
import { convertCurrency } from '@/utils/currency';
import { usePendingDetectedExpense } from '@/features/smartExpenseDetection/context/SmartExpenseDetectionProvider';
import { markAdded } from '@/features/smartExpenseDetection/storage/processedStore';

interface FormErrors {
    merchant?: string;
    amount?: string;
    expenseDate?: string;
    notes?: string;
}

/** Formats a Date to the app's local `YYYY-MM-DD` expense-date string. */
function toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Review screen for a clipboard-detected purchase. Every field is pre-filled
 * from the parsed message and fully editable. Nothing is saved until the user
 * confirms — at which point the expense is created through the existing
 * `addExpense` flow.
 */
export default function ReviewExpenseScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const t = useT();
    const dir = useDir();
    const { addExpense, customTypes, setExpenseFocus, userProfile } = useApp();
    const { pending, clearPending } = usePendingDetectedExpense();

    // Capture the detection once, at mount, so navigation state changes don't
    // wipe the form mid-edit.
    const [detection] = useState(pending);

    const preferredCurrency = userProfile?.preferredCurrency ?? 'SAR';

    // When the detected purchase is in a different currency than the user's
    // preferred one, convert it (offline, fixed rates) so the pre-filled amount
    // is in the currency the app stores everything in. Captured once at mount.
    const [conversion] = useState(() => {
        if (!pending?.currency || pending.currency === preferredCurrency) return null;
        const converted = convertCurrency(pending.amount, pending.currency, preferredCurrency);
        if (converted == null) return null;
        return { original: pending.amount, from: pending.currency, converted };
    });

    const allCategories = [...EXPENSE_CATEGORIES, ...customTypes.expenseCategories];

    const [merchant, setMerchant] = useState(detection?.merchant ?? '');
    const [amount, setAmount] = useState(
        detection ? String(conversion ? conversion.converted : detection.amount) : '',
    );
    const [category, setCategory] = useState<string>(detection?.suggestedCategory ?? 'أخرى');
    const [expenseDate, setExpenseDate] = useState(
        detection ? toDateString(detection.transactionDate) : new Date().toISOString().split('T')[0],
    );
    const [paymentMethod, setPaymentMethod] = useState(detection?.paymentMethod ?? '');
    const [cardLastFour, setCardLastFour] = useState(detection?.cardLastFourDigits ?? '');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    // Guard: opening this screen without a detection is a no-op.
    useEffect(() => {
        if (!detection) router.back();
    }, [detection, router]);

    // Release the pending detection when leaving the screen.
    useEffect(() => () => clearPending(), [clearPending]);

    if (!detection) return null;

    const clearError = (field: keyof FormErrors) =>
        setErrors((e) => ({ ...e, [field]: undefined }));

    const validate = (): boolean => {
        const errs: FormErrors = {
            merchant: validateTitle(merchant, t),
            amount: validateAmount(amount, t),
            expenseDate: validateDate(expenseDate, t, true),
            notes: validateNotes(notes, t),
        };
        setErrors(errs);
        return !Object.values(errs).some(Boolean);
    };

    /** Folds the payment method + card digits into notes (the Expense model has
     * no dedicated fields for them) so the detail is preserved. */
    const composeNotes = (): string | undefined => {
        const parts: string[] = [];
        if (notes.trim()) parts.push(notes.trim());
        if (conversion) {
            parts.push(`${t.smartDetection.originalAmountLabel}: ${formatCurrency(conversion.original, conversion.from)}`);
        }
        if (paymentMethod.trim()) parts.push(`${t.smartDetection.paymentMethodLabel}: ${paymentMethod.trim()}`);
        if (cardLastFour.trim()) parts.push(`${t.smartDetection.lastFourLabel}: ****${cardLastFour.trim()}`);
        const joined = parts.join(' — ');
        return joined || undefined;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const newId = await addExpense({
            title: merchant.trim(),
            category: category as (typeof EXPENSE_CATEGORIES)[number],
            amount: parseFloat(amount),
            expenseDate,
            notes: composeNotes(),
        });
        // Link the detection to the created expense so deleting it later re-enables
        // detection of the same bank message.
        if (detection) await markAdded(detection.fingerprint, newId);
        // Surface the expense in the Expenses screen even when its date is in a past
        // month (the transaction date, not necessarily the current month).
        const [y, m] = expenseDate.split('-').map((n) => parseInt(n, 10));
        if (y && m) setExpenseFocus(m, y);
        setLoading(false);
        clearPending();
        router.back();
    };

    const handleCancel = () => {
        clearPending();
        router.back();
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
                label={t.smartDetection.merchantLabel}
                value={merchant}
                onChangeText={(v) => { setMerchant(v); clearError('merchant'); }}
                placeholder={t.smartDetection.merchantPlaceholder}
                error={errors.merchant}
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

            {conversion ? (
                <Text style={[styles.convertHint, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>
                    {t.smartDetection.convertedFrom} {formatCurrency(conversion.original, conversion.from)}
                </Text>
            ) : null}

            <DatePickerField
                label={t.smartDetection.dateLabel}
                value={expenseDate}
                onChange={(v) => { setExpenseDate(v); clearError('expenseDate'); }}
                error={errors.expenseDate}
            />

            <Select
                label={t.forms.categoryLabel}
                value={category}
                options={allCategories.map((c) => ({ label: c, value: c }))}
                onValueChange={setCategory}
            />

            <Input
                label={t.smartDetection.paymentMethodLabel}
                value={paymentMethod}
                onChangeText={setPaymentMethod}
                placeholder={t.smartDetection.paymentMethodPlaceholder}
                maxLength={60}
            />

            <Input
                label={t.smartDetection.lastFourLabel}
                value={cardLastFour}
                onChangeText={(v) => setCardLastFour(v.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                keyboardType="number-pad"
                maxLength={4}
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
                title={loading ? t.common.saving : t.smartDetection.addExpenseBtn}
                onPress={handleSave}
                fullWidth
                loading={loading}
                style={{ marginTop: 8 }}
            />

            <Button
                title={t.common.cancel}
                onPress={handleCancel}
                variant="outline"
                fullWidth
                style={{ marginTop: 10 }}
                disabled={loading}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { padding: 20 },
    convertHint: { fontSize: 12, fontFamily: 'Cairo_400Regular', marginTop: -8, marginBottom: 12 },
});
