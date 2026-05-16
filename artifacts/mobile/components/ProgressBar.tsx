import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';

interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
  showPercent?: boolean;
}

export function ProgressBar({ label, value, max, color, showPercent = true }: ProgressBarProps) {
  const colors = useColors();
  const dir = useDir();
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor = color ?? colors.primary;

  return (
    <View style={styles.container}>
      <View style={[styles.row, { flexDirection: dir.row }]}>
        {showPercent ? (
          <Text style={[styles.pct, { color: barColor }]}>{Math.round(pct)}٪</Text>
        ) : null}
        <Text style={[styles.label, { textAlign: dir.textAlign, color: colors.foreground }]}>{label}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.muted, borderRadius: 6 }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%` as any,
              backgroundColor: barColor,
              borderRadius: 6,
              ...(dir.isRTL ? { position: 'absolute', right: 0, top: 0, bottom: 0 } : {}),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  row: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  pct: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  track: { height: 10, overflow: 'hidden' },
  fill: { height: 10 },
});
