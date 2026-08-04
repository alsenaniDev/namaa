import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { formatCurrency } from '@/utils/format';
import type { BudgetUsage } from '@/utils/calculations';

interface Props {
  usage: BudgetUsage;
  currency: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function BudgetRow({ usage, currency, onEdit, onDelete }: Props) {
  const colors = useColors();
  const dir = useDir();
  const pct = Math.round(usage.percent);
  const color =
    usage.status === 'over' ? colors.danger :
    usage.status === 'warning' ? '#F59E0B' :
    colors.success;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}>
      <View style={[styles.headerRow, { flexDirection: dir.row }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[styles.cat, { textAlign: dir.textAlign, color: colors.foreground }]}>{usage.category}</Text>
          <Text style={[styles.sub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
            {formatCurrency(usage.spent, currency)} / {formatCurrency(usage.limit, currency)}
          </Text>
        </View>
        <Text style={[styles.pct, { color }]}>{pct}٪</Text>
      </View>

      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.min(100, pct)}%` as any,
              backgroundColor: color,
              ...(dir.isRTL ? { position: 'absolute', right: 0, top: 0, bottom: 0 } : {}),
            },
          ]}
        />
      </View>

      <View style={[styles.actionsRow, { flexDirection: dir.row }]}>
        {onDelete ? (
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="trash-2" size={14} color={colors.danger} />
          </TouchableOpacity>
        ) : null}
        {onEdit ? (
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="edit-2" size={14} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
        <Text style={[styles.remaining, { textAlign: dir.textAlign, color: usage.remaining < 0 ? colors.danger : colors.mutedForeground }]}>
          {usage.remaining < 0
            ? `+ ${formatCurrency(Math.abs(usage.remaining), currency)}`
            : formatCurrency(usage.remaining, currency)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 14, marginBottom: 8 },
  headerRow: { alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  cat: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', marginBottom: 2 },
  sub: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  pct: { fontSize: 16, fontFamily: 'Cairo_700Bold', flexShrink: 1 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  actionsRow: { alignItems: 'center', marginTop: 10, gap: 12 },
  actionBtn: { padding: 2 },
  remaining: { flex: 1, minWidth: 0, fontSize: 11, fontFamily: 'Cairo_500Medium' },
});
