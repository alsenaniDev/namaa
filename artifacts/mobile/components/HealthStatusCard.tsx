import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useT } from '@/hooks/useT';
import { HealthStatus } from '@/types';
import * as dir from '@/utils/dir';

interface HealthStatusCardProps {
  status: HealthStatus;
  color: string;
  message: string;
  commitmentPercent: number;
}

const STATUS_ICONS: Record<HealthStatus, string> = {
  'ممتاز': 'check-circle',
  'متوسط': 'alert-circle',
  'خطر': 'alert-triangle',
  'حرج جدًا': 'x-circle',
};

export function HealthStatusCard({ status, color, message, commitmentPercent }: HealthStatusCardProps) {
  const colors = useColors();
  const t = useT();
  const iconName = STATUS_ICONS[status];
  const statusLabel = t.health.statusLabels[status] ?? status;

  return (
    <View style={[styles.card, { backgroundColor: color + '15', borderColor: color + '40', borderRadius: colors.radius }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{statusLabel}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.pctLabel, { color: colors.mutedForeground }]}>{t.health.commitmentPctLabel}</Text>
          <Feather name={iconName as any} size={22} color={color} />
        </View>
      </View>
      <Text style={[styles.percent, { color }]}>{t.health.pctOfIncome(Math.round(commitmentPercent))}</Text>
      <Text style={[styles.message, { color: colors.foreground }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, marginBottom: 4 },
  header: { flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerRight: { flexDirection: dir.row, alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  pctLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  percent: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: dir.textAlign, marginBottom: 6 },
  message: { fontSize: 13, lineHeight: 20, textAlign: dir.textAlign, fontFamily: 'Inter_400Regular' },
});
