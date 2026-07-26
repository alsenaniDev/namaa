import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { toAsciiDigits } from '@/utils/format';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
}

// Keyboards where the user is expected to enter digits — for these we convert
// Arabic-Indic / Persian digits to ASCII on every keystroke in real time.
const NUMERIC_KEYBOARDS = new Set([
  'number-pad',
  'decimal-pad',
  'numeric',
  'numbers-and-punctuation',
  'phone-pad',
]);

export function Input({ label, error, rightIcon, onRightIconPress, style, onChangeText, keyboardType, ...props }: InputProps) {
  const colors = useColors();
  const dir = useDir();
  const [focused, setFocused] = useState(false);

  const shouldConvertDigits = !!keyboardType && NUMERIC_KEYBOARDS.has(keyboardType);

  const handleChangeText = useCallback(
    (text: string) => {
      const converted = shouldConvertDigits ? toAsciiDigits(text) : text;
      onChangeText?.(converted);
    },
    [onChangeText, shouldConvertDigits],
  );

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { textAlign: dir.textAlign, color: colors.foreground }]}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          { flexDirection: dir.row },
          {
            borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
            backgroundColor: colors.card,
            borderRadius: colors.radius - 2,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.foreground }, style]}
          placeholderTextColor={colors.mutedForeground}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          textAlign={dir.textAlign}
          keyboardType={keyboardType}
          onChangeText={handleChangeText}
          {...props}
        />
        {rightIcon ? (
          <TouchableOpacity onPress={onRightIconPress} style={styles.icon}>
            <Feather name={rightIcon as any} size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { textAlign: dir.textAlign, color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6, fontFamily: 'Cairo_500Medium' },
  inputWrap: { alignItems: 'center', borderWidth: 1.5, paddingHorizontal: 12, minHeight: 48 },
  input: { flex: 1, fontSize: 15, paddingVertical: 10, fontFamily: 'Cairo_400Regular' },
  icon: { padding: 4, marginLeft: 8 },
  error: { fontSize: 12, marginTop: 4 },
});
