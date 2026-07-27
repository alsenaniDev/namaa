import React, { useMemo } from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useT } from '@/hooks/useT';
import { formatCurrency } from '@/utils/format';
import {
  getCommitmentProgress,
  getCommitmentMonthlyShare,
  isCommitmentArchived,
  isFiniteCommitmentPaidOff,
  isOneTimeCommitmentPaid,
} from '@/utils/calculations';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { LenderAvatar } from '@/components/LenderAvatar';
import type { Commitment } from '@/types';

export default function CommitmentsArchiveScreen() {
  const colors = useColors();
  const dir = useDir();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { commitments, commitmentPayments, lenders, userProfile } = useApp();
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const archived = useMemo(
    () => commitments
      .filter((commitment) => isCommitmentArchived(commitment, commitmentPayments))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [commitments, commitmentPayments],
  );

  const getArchiveLabel = (item: Commitment) => {
    if (isOneTimeCommitmentPaid(item, commitmentPayments)) return t.commitments.archivePaidOneTime;
    if (isFiniteCommitmentPaidOff(item, commitmentPayments)) return t.commitments.archiveCompletedLoan;
    if (!item.isActive) return t.commitments.archiveInactive;
    return t.commitments.archiveArchived;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Card style={styles.summary} padding={14}>
        <View style={[styles.summaryRow, { flexDirection: dir.row }]}>
          <View style={[styles.summaryIcon, { backgroundColor: colors.primary + '18' }]}>
            <Feather name="archive" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryTitle, { color: colors.foreground, textAlign: dir.textAlign }]}>{t.commitments.archiveTitle}</Text>
            <Text style={[styles.summarySub, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>
              {t.commitments.archiveSubtitle(archived.length)}
            </Text>
          </View>
        </View>
      </Card>

      <FlatList
        data={archived}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + bottomPad + 24 }, !archived.length && styles.emptyList]}
        ListEmptyComponent={
          <EmptyState
            icon="archive"
            title={t.commitments.archiveEmptyTitle}
            description={t.commitments.archiveEmptyDesc}
          />
        }
        renderItem={({ item }) => {
          const lender = item.lenderId ? lenders.find((l) => l.id === item.lenderId) : undefined;
          const label = getArchiveLabel(item);
          const progress = getCommitmentProgress(item, commitmentPayments);
          const amount = progress.isFinite ? progress.totalAmount : getCommitmentMonthlyShare(item);
          const accent = isFiniteCommitmentPaidOff(item, commitmentPayments) || isOneTimeCommitmentPaid(item, commitmentPayments)
            ? colors.success
            : colors.mutedForeground;

          return (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/commitments/[id]', params: { id: item.id } })}
              activeOpacity={0.78}
              style={[styles.item, { flexDirection: dir.row, backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}
            >
              <View style={[styles.strip, { backgroundColor: accent }]} />
              {lender ? (
                <LenderAvatar lender={lender} size={38} fontSize={15} borderWidth={0} />
              ) : (
                <View style={[styles.fallbackIcon, { backgroundColor: accent + '18' }]}>
                  <Feather name="check-circle" size={18} color={accent} />
                </View>
              )}
              <View style={styles.body}>
                <Text style={[styles.title, { color: colors.foreground, textAlign: dir.textAlign }]} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.metaRow, { flexDirection: dir.row }]}>
                  <View style={[styles.badge, { backgroundColor: accent + '18' }]}>
                    <Text style={[styles.badgeText, { color: accent }]}>{label}</Text>
                  </View>
                  <Text style={[styles.category, { color: colors.mutedForeground }]} numberOfLines={1}>{item.category}</Text>
                </View>
              </View>
              <View style={[styles.right, { flexDirection: dir.row }]}>
                <Text style={[styles.amount, { color: accent }]}>{formatCurrency(amount, currency)}</Text>
                <Feather name={dir.chevronDetail as any} size={14} color={colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { margin: 16, marginBottom: 8 },
  summaryRow: { alignItems: 'center', gap: 12 },
  summaryIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', marginBottom: 2 },
  summarySub: { fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 18 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  emptyList: { flex: 1 },
  item: { alignItems: 'center', borderWidth: 1, marginBottom: 8, overflow: 'hidden', gap: 10, paddingVertical: 12, paddingHorizontal: 12 },
  strip: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 4 },
  fallbackIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', marginBottom: 4 },
  metaRow: { alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  category: { fontSize: 11, fontFamily: 'Cairo_400Regular', flexShrink: 1 },
  right: { alignItems: 'center', gap: 4, flexShrink: 0 },
  amount: { fontSize: 13, fontFamily: 'Cairo_700Bold' },
});
