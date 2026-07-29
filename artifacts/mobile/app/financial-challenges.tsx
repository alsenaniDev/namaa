import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { getAllChallengeProgress, ChallengeProgress } from '@/utils/financialChallenges';
import { iosScrollViewObserverProps } from '@/utils/scrollView';

export default function FinancialChallengesScreen() {
  const colors = useColors();
  const dir = useDir();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const {
    challenges,
    incomes,
    commitments,
    commitmentPayments,
    expenses,
    goalContributions,
    startChallenge,
  } = useApp();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const items = useMemo(
    () => getAllChallengeProgress({
      challenges,
      incomes,
      commitments,
      payments: commitmentPayments,
      expenses,
      goalContributions,
      lang: language,
    }),
    [challenges, incomes, commitments, commitmentPayments, expenses, goalContributions, language],
  );

  return (
    <ScrollView
      {...iosScrollViewObserverProps}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 28 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { alignItems: dir.isRTL ? 'flex-end' : 'flex-start', backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
        <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
          <Feather name="flag" size={24} color="#fff" />
        </View>
        <Text style={[styles.heroTitle, { color: colors.foreground, textAlign: dir.textAlign }]}>
          {language === 'en' ? 'Small wins become habits' : 'انتصارات صغيرة تتحول إلى عادة'}
        </Text>
        <Text style={[styles.heroSub, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>
          {language === 'en'
            ? 'Start one challenge and let Namaa calculate progress from your real data.'
            : 'ابدأ تحدياً واحداً، ونماء يحسب التقدم من بياناتك الفعلية فقط.'}
        </Text>
      </View>

      {items.map((item) => (
        <ChallengeCard
          key={item.id}
          item={item}
          onStart={() => startChallenge(item.id)}
          language={language}
        />
      ))}
    </ScrollView>
  );
}

function ChallengeCard({
  item,
  onStart,
  language,
}: {
  item: ChallengeProgress;
  onStart: () => void;
  language: string;
}) {
  const colors = useColors();
  const dir = useDir();
  const isCompleted = item.status === 'completed';
  const isActive = item.status === 'active';
  const statusText = isCompleted
    ? (language === 'en' ? 'Completed' : 'مكتمل')
    : isActive
      ? (language === 'en' ? 'Active' : 'جاري')
      : (language === 'en' ? 'Not started' : 'لم يبدأ بعد');
  const buttonText = isCompleted
    ? (language === 'en' ? 'Restart challenge' : 'إعادة التحدي')
    : isActive
      ? (language === 'en' ? 'In progress' : 'التحدي جاري')
      : (language === 'en' ? 'Start challenge' : 'بدء التحدي');

  return (
    <Card style={styles.card} padding={14}>
      <View style={[styles.cardHeader, { flexDirection: dir.row }]}>
        <View style={[styles.iconBox, { backgroundColor: item.definition.color + '18' }]}>
          <Feather name={item.definition.icon as any} size={22} color={item.definition.color} />
        </View>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: colors.foreground, textAlign: dir.textAlign }]}>{item.definition.title}</Text>
          <Text style={[styles.desc, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{item.definition.shortDescription}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: isCompleted ? colors.success + '18' : isActive ? colors.primary + '14' : colors.muted }]}>
          <Text style={[styles.statusText, { color: isCompleted ? colors.success : isActive ? colors.primary : colors.mutedForeground }]}>{statusText}</Text>
        </View>
      </View>

      <Text style={[styles.longDesc, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{item.definition.description}</Text>
      <ProgressBar label={item.metricLabel} value={item.progressPercent} max={100} color={item.definition.color} />

      <View style={[styles.metaRow, { flexDirection: dir.row }]}>
        <View style={[styles.metaItem, { backgroundColor: colors.muted }]}>
          <Text style={[styles.metaValue, { color: colors.foreground }]}>{item.daysRemaining}</Text>
          <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{language === 'en' ? 'days left' : 'أيام متبقية'}</Text>
        </View>
        <View style={[styles.metaItem, { backgroundColor: colors.muted }]}>
          <Text style={[styles.metaValue, { color: colors.foreground }]}>{item.definition.durationDays}</Text>
          <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{language === 'en' ? 'duration' : 'مدة التحدي'}</Text>
        </View>
      </View>

      <Button
        title={buttonText}
        onPress={onStart}
        disabled={isActive}
        variant={isCompleted ? 'outline' : 'primary'}
        fullWidth
        style={{ marginTop: 2 }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  hero: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  heroIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroTitle: { fontSize: 19, fontFamily: 'Cairo_700Bold', marginBottom: 4 },
  heroSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', lineHeight: 22 },
  card: { marginBottom: 10 },
  cardHeader: { alignItems: 'center', gap: 10, marginBottom: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontFamily: 'Cairo_700Bold', marginBottom: 2 },
  desc: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, fontFamily: 'Cairo_700Bold' },
  longDesc: { fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 20, marginBottom: 10 },
  metaRow: { gap: 8, marginBottom: 10 },
  metaItem: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  metaValue: { fontSize: 18, fontFamily: 'Cairo_700Bold' },
  metaLabel: { fontSize: 10, fontFamily: 'Cairo_400Regular' },
});
