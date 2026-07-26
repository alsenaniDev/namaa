import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { formatCurrency } from '@/utils/format';
import { getCommitmentsOverview, CommitmentsOverviewItem } from '@/utils/calculations';
import { Card } from '@/components/ui/Card';

export default function CommitmentsOverviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dir = useDir();
  const t = useT();
  const { commitments, commitmentPayments, userProfile } = useApp();
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const overview = useMemo(
    () => getCommitmentsOverview(commitments, commitmentPayments),
    [commitments, commitmentPayments],
  );

  const progressLabel = `${Math.round(overview.progressPercent)}%`;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.hero}>
        <View style={[styles.heroTop, { flexDirection: dir.row }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.commitment + '18' }]}>
            <Feather name="shield" size={24} color={colors.commitment} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.dashboard.totalOwedTitle}</Text>
            <Text style={[styles.heroAmount, { textAlign: dir.textAlign, color: colors.foreground }]}>{formatCurrency(overview.totalOwed, currency)}</Text>
          </View>
        </View>

        <View style={[styles.progressHeader, { flexDirection: dir.row }]}>
          <Text style={[styles.progressText, { color: colors.commitment }]}>{progressLabel}</Text>
          <Text style={[styles.progressHint, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.commitmentsOverview.loanProgress}</Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${overview.progressPercent}%`,
                backgroundColor: colors.commitment,
                ...(dir.isRTL ? { right: 0 } : { left: 0 }),
              },
            ]}
          />
        </View>
      </Card>

      <View style={[styles.grid, { flexDirection: dir.row }]}>
        <MetricCard label={t.commitmentsOverview.finiteRemaining} value={formatCurrency(overview.finiteRemaining, currency)} color={colors.commitment} />
        <MetricCard label={t.commitmentsOverview.oneTimeTotal} value={formatCurrency(overview.oneTimeTotal, currency)} color={colors.warning} />
        <MetricCard label={t.dashboard.monthlyOpenCommitments} value={formatCurrency(overview.monthlyTotal, currency)} color={colors.primary} />
        <MetricCard label={t.dashboard.remainingInstallments} value={String(overview.remainingInstallments)} color={colors.foreground} />
      </View>

      <BreakdownSection
        title={t.commitmentsOverview.finiteLoans}
        emptyText={t.commitmentsOverview.noFiniteLoans}
        items={overview.finiteItems}
        currency={currency}
        accent={colors.commitment}
        onPress={(id) => router.push({ pathname: '/commitments/[id]', params: { id } })}
      />

      <BreakdownSection
        title={t.commitmentsOverview.oneTimeCommitments}
        emptyText={t.commitmentsOverview.noOneTime}
        items={overview.oneTimeItems}
        currency={currency}
        accent={colors.warning}
        onPress={(id) => router.push({ pathname: '/commitments/[id]', params: { id } })}
      />

      <BreakdownSection
        title={t.commitmentsOverview.monthlyOpenCommitments}
        emptyText={t.commitmentsOverview.noMonthlyOpen}
        items={overview.monthlyItems}
        currency={currency}
        accent={colors.primary}
        onPress={(id) => router.push({ pathname: '/commitments/[id]', params: { id } })}
      />

      <Card style={styles.noteCard} padding={12}>
        <Text style={[styles.noteText, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.commitmentsOverview.calculationNote}</Text>
      </Card>
    </ScrollView>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  const dir = useDir();
  return (
    <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.metricValue, { textAlign: dir.textAlign, color }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.metricLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function BreakdownSection({
  title, emptyText, items, currency, accent, onPress,
}: {
  title: string;
  emptyText: string;
  items: CommitmentsOverviewItem[];
  currency: string;
  accent: string;
  onPress: (id: string) => void;
}) {
  const colors = useColors();
  const dir = useDir();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{title}</Text>
      {items.length === 0 ? (
        <Card padding={12}>
          <Text style={[styles.emptyText, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{emptyText}</Text>
        </Card>
      ) : (
        items.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.78}
            onPress={() => onPress(item.id)}
            style={[styles.rowCard, { flexDirection: dir.row, backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.rowStrip, { backgroundColor: accent }]} />
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { textAlign: dir.textAlign, color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.rowSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]} numberOfLines={1}>
                {item.category}
                {typeof item.remainingInstallments === 'number' ? ` · ${item.remainingInstallments}` : ''}
              </Text>
            </View>
            <Text style={[styles.rowAmount, { color: accent }]} numberOfLines={1}>{formatCurrency(item.amount, currency)}</Text>
            <Feather name={dir.chevronDetail as any} size={14} color={colors.mutedForeground} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  hero: { marginBottom: 12 },
  heroTop: { alignItems: 'center', gap: 10, marginBottom: 14 },
  iconWrap: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  heroLabel: { fontSize: 12, fontFamily: 'Cairo_500Medium', marginBottom: 2 },
  heroAmount: { fontSize: 28, fontFamily: 'Cairo_700Bold' },
  progressHeader: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { fontSize: 13, fontFamily: 'Cairo_700Bold' },
  progressHint: { fontSize: 12, fontFamily: 'Cairo_500Medium' },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, bottom: 0, height: '100%', borderRadius: 5 },
  grid: { flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  metric: { width: '48%', borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 76 },
  metricValue: { fontSize: 15, fontFamily: 'Cairo_700Bold', marginBottom: 4 },
  metricLabel: { fontSize: 11, fontFamily: 'Cairo_400Regular', lineHeight: 16 },
  section: { marginTop: 10 },
  sectionTitle: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', marginBottom: 8 },
  rowCard: { alignItems: 'center', borderWidth: 1, borderRadius: 12, marginBottom: 8, overflow: 'hidden', gap: 10 },
  rowStrip: { width: 4, alignSelf: 'stretch' },
  rowBody: { flex: 1, paddingVertical: 12 },
  rowTitle: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', marginBottom: 3 },
  rowSub: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  rowAmount: { fontSize: 13, fontFamily: 'Cairo_700Bold', flexShrink: 0 },
  emptyText: { fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 18 },
  noteCard: { marginTop: 12 },
  noteText: { fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 18 },
});
