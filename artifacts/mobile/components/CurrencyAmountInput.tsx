import React, { useMemo, useState } from 'react';
import { Keyboard, Modal, StyleSheet, Text, TextInputProps, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useT } from '@/hooks/useT';
import { CURRENCIES } from '@/types';
import { formatCurrency, toAsciiDigits } from '@/utils/format';
import { formatAmountForInput, formatRateForInput, getDefaultExchangeRate } from '@/utils/currencyConversion';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

interface CurrencyAmountInputProps extends TextInputProps {
  label?: string;
  error?: string;
  targetCurrency?: string;
}

export function CurrencyAmountInput({
  label,
  error,
  targetCurrency,
  onChangeText,
  ...props
}: CurrencyAmountInputProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dir = useDir();
  const t = useT();
  const { userProfile } = useApp();
  const target = targetCurrency ?? userProfile?.preferredCurrency ?? 'SAR';
  const initialSource = target === 'USD' ? 'SAR' : 'USD';

  const [open, setOpen] = useState(false);
  const [sourceAmount, setSourceAmount] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState(initialSource);
  const [rate, setRate] = useState(formatRateForInput(getDefaultExchangeRate(initialSource, target)));

  const currencyOptions = useMemo(
    () => CURRENCIES.map((currency) => ({
      label: `${currency.value} - ${currency.label}`,
      value: currency.value,
    })),
    [],
  );

  const sourceNumber = parseFloat(toAsciiDigits(sourceAmount));
  const rateNumber = parseFloat(toAsciiDigits(rate));
  const convertedAmount = Number.isFinite(sourceNumber) && Number.isFinite(rateNumber)
    ? sourceNumber * rateNumber
    : 0;
  const canApply = convertedAmount > 0;

  const openConverter = () => {
    Keyboard.dismiss();
    setSourceAmount('');
    setSourceCurrency(initialSource);
    setRate(formatRateForInput(getDefaultExchangeRate(initialSource, target)));
    setOpen(true);
  };

  const closeConverter = () => {
    Keyboard.dismiss();
    setOpen(false);
  };

  const handleCurrencyChange = (nextCurrency: string) => {
    setSourceCurrency(nextCurrency);
    setRate(formatRateForInput(getDefaultExchangeRate(nextCurrency, target)));
  };

  const applyConvertedAmount = () => {
    if (!canApply) return;
    Keyboard.dismiss();
    onChangeText?.(formatAmountForInput(convertedAmount));
    setOpen(false);
  };

  return (
    <>
      <Input
        {...props}
        label={label}
        error={error}
        keyboardType="decimal-pad"
        onChangeText={onChangeText}
        rightIcon="repeat"
        onRightIconPress={openConverter}
      />

      <Modal visible={open} transparent animationType="slide" onRequestClose={closeConverter}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.card,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  paddingBottom: insets.bottom + 16,
                },
              ]}
            >
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <View style={[styles.header, { flexDirection: dir.row }]}>
                <Text style={[styles.title, { color: colors.foreground, textAlign: dir.textAlign }]}>
                  {t.forms.currencyConverterTitle}
                </Text>
                <TouchableOpacity onPress={closeConverter} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <Input
                label={t.forms.currencySourceAmount}
                value={sourceAmount}
                onChangeText={setSourceAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                maxLength={16}
              />
              <Select
                label={t.forms.currencySourceCurrency}
                value={sourceCurrency}
                options={currencyOptions}
                onValueChange={handleCurrencyChange}
              />
              <Input
                label={t.forms.currencyRateLabel(sourceCurrency, target)}
                value={rate}
                onChangeText={setRate}
                placeholder="1"
                keyboardType="decimal-pad"
                maxLength={16}
              />

              <View style={[styles.resultBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.resultLabel, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>
                  {t.forms.currencyConvertedAmount}
                </Text>
                <Text style={[styles.resultValue, { color: colors.primary, textAlign: dir.textAlign }]}>
                  {formatCurrency(convertedAmount, target)}
                </Text>
                <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>
                  {t.forms.currencyRateHint}
                </Text>
              </View>

              <View style={[styles.actions, { flexDirection: dir.row }]}>
                <Button title={t.common.cancel} onPress={closeConverter} variant="outline" style={{ flex: 1 }} />
                <Button title={t.forms.currencyApplyConverted} onPress={applyConvertedAmount} disabled={!canApply} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 20, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  header: { alignItems: 'center', gap: 10, marginBottom: 14 },
  title: { flex: 1, fontSize: 17, fontFamily: 'Cairo_700Bold' },
  closeBtn: { padding: 4 },
  resultBox: { borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 14 },
  resultLabel: { fontSize: 12, fontFamily: 'Cairo_500Medium', marginBottom: 4 },
  resultValue: { fontSize: 22, fontFamily: 'Cairo_700Bold', marginBottom: 4 },
  hint: { fontSize: 11, fontFamily: 'Cairo_400Regular', lineHeight: 17 },
  actions: { gap: 10 },
});
