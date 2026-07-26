import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { Card } from './ui/Card';
import { Insight, InsightSeverity } from '@/utils/insights';

interface InsightCardProps {
  insight: Insight;
  onCta?: () => void;
}

export function InsightCard({ insight, onCta }: InsightCardProps) {
  const colors = useColors();
  const dir = useDir();
  const accent = severityColor(insight.severity, colors);

  return (
    <Card style={[styles.card, { borderColor: accent + '40', backgroundColor: accent + '0C' }]}>
      <View style={[styles.row, { flexDirection: dir.row }]}>
        <View style={[styles.iconWrap, { backgroundColor: accent + '20' }]}>
          <Feather name={insight.icon as any} size={18} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { textAlign: dir.textAlign, color: colors.foreground }]}>{insight.title}</Text>
          <Text style={[styles.msg, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{insight.message}</Text>
          {insight.cta && onCta ? (
            <TouchableOpacity onPress={onCta} activeOpacity={0.7} style={[styles.ctaRow, { flexDirection: dir.row }]}>
              <Text style={[styles.ctaText, { color: accent }]}>{insight.cta.label}</Text>
              <Feather name={dir.chevronDetail as any} size={14} color={accent} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

function severityColor(s: InsightSeverity, colors: ReturnType<typeof useColors>): string {
  switch (s) {
    case 'danger': return colors.danger;
    case 'warning': return colors.warning;
    case 'success': return colors.success;
    case 'info':
    default: return colors.commitment;
  }
}

const styles = StyleSheet.create({
  card: { marginBottom: 8, borderWidth: 1 },
  row: { gap: 12, alignItems: 'flex-start' },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', marginBottom: 4 },
  msg: { fontSize: 13, fontFamily: 'Cairo_400Regular', lineHeight: 19 },
  ctaRow: { alignItems: 'center', gap: 4, marginTop: 8 },
  ctaText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
});
