import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Card } from './ui/Card';
import * as dir from '@/utils/dir';

interface SummaryCardProps {
  label: string;
  amount: string;
  icon: string;
  iconColor?: string;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function SummaryCard({ label, amount, icon, iconColor, sub, trend }: SummaryCardProps) {
  const colors = useColors();
  const ic = iconColor ?? colors.primary;
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: ic + '18', borderRadius: colors.radius - 4 }]}>
          <Feather name={icon as any} size={20} color={ic} />
        </View>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <Text style={[styles.amount, { color: colors.foreground }]}>{amount}</Text>
      {sub ? (
        <View style={styles.subRow}>
          {trend ? (
            <Feather
              name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'minus'}
              size={12}
              color={trend === 'up' ? colors.success : trend === 'down' ? colors.danger : colors.mutedForeground}
              style={dir.isRTL ? { marginLeft: 4 } : { marginRight: 4 }}
            />
          ) : null}
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>{sub}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 140 },
  row: { flexDirection: dir.row, alignItems: 'center', marginBottom: 10, gap: 8 },
  iconWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontFamily: 'Inter_500Medium', flex: 1, textAlign: dir.textAlign },
  amount: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: dir.textAlign, marginBottom: 4 },
  subRow: { flexDirection: dir.row, alignItems: 'center' },
  sub: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: dir.textAlign },
});
