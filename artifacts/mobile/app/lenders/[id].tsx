import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Image, Alert, Share } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { formatCurrency } from '@/utils/format';
import { getLenderStats, getCommitmentProgress } from '@/utils/calculations';
import { Card } from '@/components/ui/Card';

export default function LenderDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const params = useLocalSearchParams<{ id: string }>();
  const { lenders, commitments, commitmentPayments, userProfile } = useApp();

  const lender = lenders.find((l) => l.id === params.id);
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  if (!lender) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>—</Text>
      </View>
    );
  }

  const stats = getLenderStats(lender.id, commitments, commitmentPayments);
  const linked = commitments.filter((c) => c.lenderId === lender.id);
  const initial = lender.name.trim().charAt(0) || '?';

  const openTel = (v?: string) => v && Linking.openURL(`tel:${v}`);
  const openMail = (v?: string) => v && Linking.openURL(`mailto:${v}`);
  const openWeb = (v?: string) => {
    if (!v) return;
    const url = v.startsWith('http') ? v : `https://${v}`;
    Linking.openURL(url);
  };
  const copyPaymentValue = async (value: string) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        Alert.alert(t.common.copied, t.common.copiedMsg);
        return;
      }
      await Share.share({ message: value });
    } catch {
      Alert.alert(t.common.errorTitle, t.common.copyFailed);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: lender.name,
          // headerRight is reserved globally for the back button (see root
          // _layout). The edit action lives on headerLeft (visual left).
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/lenders/add', params: { id: lender.id } })}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={{ paddingHorizontal: 14, paddingVertical: 6 }}
            >
              <Feather name="edit-2" size={20} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <Card style={styles.headerCard}>
          <View style={[styles.headerRow, { flexDirection: dir.row }]}>
            <View style={[styles.avatar, { backgroundColor: lender.color + '22', borderColor: lender.color + '55' }]}>
              {lender.imageUri ? (
                <Image source={{ uri: lender.imageUri }} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.avatarText, { color: lender.color }]}>{initial}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { textAlign: dir.textAlign, color: colors.foreground }]}>{lender.name}</Text>
              <View style={[styles.typeRow, { flexDirection: dir.row }]}>
                <View style={[styles.typePill, { backgroundColor: lender.color + '18' }]}>
                  <Text style={[styles.typeText, { color: lender.color }]}>{t.lenders.typeLabels[lender.type] ?? lender.type}</Text>
                </View>
                {lender.paymentMethod ? (
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{t.lenders.paymentMethodLabels[lender.paymentMethod]}</Text>
                ) : null}
              </View>
            </View>
          </View>
        </Card>

        {/* Stats grid */}
        <View style={[styles.statsGrid, { flexDirection: dir.row }]}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t.lenders.statMonthly}</Text>
            <Text style={[styles.statValue, { color: colors.commitment }]}>{formatCurrency(stats.monthlyTotal, currency)}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t.lenders.statActive}</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.activeCommitmentCount}</Text>
          </View>
        </View>
        {stats.totalContracted > 0 ? (
          <View style={[styles.statsGrid, { flexDirection: dir.row }]}>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t.lenders.statTotalRemaining}</Text>
              <Text style={[styles.statValue, { color: colors.warning }]}>{formatCurrency(stats.totalRemaining, currency)}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t.lenders.statTotalContracted}</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{formatCurrency(stats.totalContracted, currency)}</Text>
            </View>
          </View>
        ) : null}

        {/* Contact */}
        {(lender.phone || lender.email || lender.website || lender.address) ? (
          <>
            <Text style={[styles.sectionLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.lenders.sectionContact}</Text>
            <Card style={styles.card} padding={0}>
              {lender.phone ? (
                <ContactRow icon="phone" label={lender.phone} onPress={() => openTel(lender.phone)} colors={colors} dir={dir} />
              ) : null}
              {lender.email ? (
                <ContactRow icon="mail" label={lender.email} onPress={() => openMail(lender.email)} colors={colors} dir={dir} />
              ) : null}
              {lender.website ? (
                <ContactRow icon="globe" label={lender.website} onPress={() => openWeb(lender.website)} colors={colors} dir={dir} />
              ) : null}
              {lender.address ? (
                <ContactRow icon="map-pin" label={lender.address} colors={colors} dir={dir} />
              ) : null}
            </Card>
          </>
        ) : null}

        {/* Payment details */}
        {(lender.bankName || lender.iban || lender.bankAccount || lender.beneficiaryName) ? (
          <>
            <Text style={[styles.sectionLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.lenders.sectionPayment}</Text>
            <Card style={styles.card} padding={14}>
              {lender.bankName ? <KV label={t.lenders.fieldBankName} value={lender.bankName} colors={colors} dir={dir} /> : null}
              {lender.iban ? <KV label={t.lenders.fieldIban} value={lender.iban} colors={colors} dir={dir} copyLabel={t.common.copy} onCopy={() => copyPaymentValue(lender.iban!)} /> : null}
              {lender.bankAccount ? <KV label={t.lenders.fieldBankAccount} value={lender.bankAccount} colors={colors} dir={dir} copyLabel={t.common.copy} onCopy={() => copyPaymentValue(lender.bankAccount!)} /> : null}
              {lender.beneficiaryName ? <KV label={t.lenders.fieldBeneficiary} value={lender.beneficiaryName} colors={colors} dir={dir} /> : null}
            </Card>
          </>
        ) : null}

        {/* Linked commitments */}
        <Text style={[styles.sectionLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.lenders.sectionLinked}</Text>
        {linked.length === 0 ? (
          <Card style={styles.card}>
            <Text style={[styles.emptyText, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.lenders.noLinked}</Text>
          </Card>
        ) : (
          linked.map((c) => {
            const prog = getCommitmentProgress(c, commitmentPayments);
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => router.push({ pathname: '/commitments/[id]', params: { id: c.id } })}
                activeOpacity={0.78}
                style={[styles.linkedCard, { flexDirection: dir.row, backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.linkedTitle, { textAlign: dir.textAlign, color: colors.foreground }]} numberOfLines={1}>{c.title}</Text>
                  <Text style={[styles.linkedMeta, { textAlign: dir.textAlign, color: colors.mutedForeground }]} numberOfLines={1}>
                    {c.category} · {t.commitments.dayPrefix} {c.dueDay}
                  </Text>
                  {prog.isFinite ? (
                    <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${prog.progressPercent}%`,
                            backgroundColor: lender.color,
                            ...(dir.isRTL ? { right: 0 } : { left: 0 }),
                          },
                        ]}
                      />
                    </View>
                  ) : null}
                </View>
                <View style={{ alignItems: dir.isRTL ? 'flex-start' : 'flex-end' }}>
                  <Text style={[styles.linkedAmount, { color: colors.commitment }]}>{formatCurrency(c.amount, currency)}</Text>
                  {prog.isFinite ? (
                    <Text style={[styles.linkedSub, { color: colors.mutedForeground }]}>
                      {t.commitments.installmentsPaid(prog.paidInstallmentCount, prog.installmentCount)}
                    </Text>
                  ) : null}
                </View>
                <Feather name={dir.chevronDetail as any} size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          })
        )}

        {lender.notes ? (
          <Card style={[styles.card, { marginTop: 14 }]} padding={14}>
            <Text style={[styles.notesText, { textAlign: dir.textAlign, color: colors.foreground }]}>{lender.notes}</Text>
          </Card>
        ) : null}
      </ScrollView>
    </>
  );
}

function ContactRow({ icon, label, onPress, colors, dir }: { icon: string; label: string; onPress?: () => void; colors: any; dir: any }) {
  const content = (
    <View style={[styles.contactRow, { flexDirection: dir.row, borderBottomColor: colors.border }]}>
      <View style={[styles.contactIcon, { backgroundColor: colors.primary + '15' }]}>
        <Feather name={icon as any} size={16} color={colors.primary} />
      </View>
      <Text style={[styles.contactText, { textAlign: dir.textAlign, color: colors.foreground }]} numberOfLines={2}>{label}</Text>
      {onPress ? <Feather name={dir.chevronDetail as any} size={14} color={colors.mutedForeground} /> : null}
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>
  ) : content;
}

function KV({ label, value, colors, dir, copyLabel, onCopy }: { label: string; value: string; colors: any; dir: any; copyLabel?: string; onCopy?: () => void }) {
  return (
    <View style={[styles.kv, { flexDirection: dir.row }]}>
      <Text style={[styles.kvLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.kvValueWrap, { flexDirection: dir.row }]}>
        <Text style={[styles.kvValue, { textAlign: dir.isRTL ? 'left' : 'right', color: colors.foreground }]} selectable numberOfLines={2}>{value}</Text>
        {onCopy ? (
          <TouchableOpacity
            onPress={onCopy}
            activeOpacity={0.76}
            accessibilityLabel={copyLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.copyBtn, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '35' }]}
          >
            <Feather name="copy" size={14} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  headerCard: { marginBottom: 12 },
  headerRow: { alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2, overflow: 'hidden' },
  avatarText: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  avatarImg: { width: '100%', height: '100%' },
  name: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 6 },
  typeRow: { alignItems: 'center', gap: 8 },
  typePill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  typeText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  metaText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  statsGrid: { gap: 10, marginBottom: 10 },
  statBox: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1 },
  statLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  statValue: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { marginBottom: 8 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', paddingVertical: 8 },
  contactRow: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  contactIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  contactText: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
  kv: { paddingVertical: 8, gap: 10 },
  kvLabel: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium' },
  kvValueWrap: { flex: 1.5, alignItems: 'center', gap: 8 },
  kvValue: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
  copyBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  linkedCard: { alignItems: 'center', padding: 12, borderWidth: 1, marginBottom: 8, gap: 10 },
  linkedTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  linkedMeta: { fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: 6 },
  linkedAmount: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  linkedSub: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  progressBar: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  progressFill: { position: 'absolute', top: 0, bottom: 0, height: '100%', borderRadius: 3 },
  notesText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
});
