import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useResponsive } from '@/hooks/useResponsive';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  title, onPress, variant = 'primary', disabled, loading, style, fullWidth = false,
}: ButtonProps) {
  const colors = useColors();
  const responsive = useResponsive();

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const bgColor = {
    primary: colors.primary,
    secondary: colors.secondary,
    destructive: colors.destructive,
    ghost: 'transparent',
    outline: 'transparent',
  }[variant];

  const textColor = {
    primary: colors.primaryForeground,
    secondary: colors.secondaryForeground,
    destructive: colors.destructiveForeground,
    ghost: colors.foreground,
    outline: colors.primary,
  }[variant];

  const borderColor = variant === 'outline' ? colors.primary : 'transparent';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderRadius: colors.radius,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
          paddingHorizontal: responsive.isTiny ? 14 : 20,
          paddingVertical: responsive.isTiny ? 11 : 13,
          minHeight: responsive.isTiny ? 44 : 48,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Cairo_600SemiBold',
  },
});
