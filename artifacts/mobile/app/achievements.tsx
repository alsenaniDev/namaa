import React, { useMemo } from 'react';
import { FlatList, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { ACHIEVEMENT_IDS, formatAchievementDate, getAchievementMeta } from '@/utils/achievements';
import { AchievementId, UserAchievement } from '@/types';

export default function AchievementsScreen() {
  const colors = useColors();
  const dir = useDir();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { language } = useLanguage();
  const { achievements } = useApp();
  const unlockedMap = useMemo(() => new Map(achievements.map((item) => [item.id, item])), [achievements]);
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const gap = 10;
  const cardWidth = Math.floor((width - 32 - gap) / 2);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 28 }]}
      data={ACHIEVEMENT_IDS}
      keyExtractor={(item) => item}
      numColumns={2}
      columnWrapperStyle={{ flexDirection: dir.row, gap }}
      ListHeaderComponent={(
        <View style={[styles.summary, { flexDirection: dir.row, backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <View style={[styles.summaryIcon, { backgroundColor: colors.primary }]}>
            <Feather name="award" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>
              {language === 'en' ? 'Your achievement collection' : 'مجموعة إنجازاتك'}
            </Text>
            <Text style={[styles.summarySub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
              {language === 'en'
                ? `${achievements.length} of ${ACHIEVEMENT_IDS.length} unlocked`
                : `${achievements.length} من ${ACHIEVEMENT_IDS.length} إنجاز مفتوح`}
            </Text>
          </View>
        </View>
      )}
      renderItem={({ item }) => (
        <AchievementTile
          id={item}
          unlocked={unlockedMap.get(item)}
          width={cardWidth}
          language={language}
        />
      )}
    />
  );
}

function AchievementTile({
  id,
  unlocked,
  width,
  language,
}: {
  id: AchievementId;
  unlocked?: UserAchievement;
  width: number;
  language: string;
}) {
  const colors = useColors();
  const meta = getAchievementMeta(id, language);
  const isUnlocked = !!unlocked;
  const accent = isUnlocked ? meta.color : colors.mutedForeground;

  return (
    <View
      style={[
        styles.tile,
        {
          width,
          backgroundColor: isUnlocked ? colors.card : colors.muted,
          borderColor: isUnlocked ? meta.color + '40' : colors.border,
        },
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: isUnlocked ? meta.color + '18' : colors.border }]}>
        <Feather name={(isUnlocked ? meta.icon : 'lock') as any} size={25} color={accent} />
      </View>
      <Text style={[styles.tileTitle, { color: isUnlocked ? colors.foreground : colors.mutedForeground, textAlign: 'center' }]} numberOfLines={2}>
        {meta.title}
      </Text>
      <Text style={[styles.tileDesc, { color: colors.mutedForeground, textAlign: 'center' }]} numberOfLines={3}>
        {meta.description}
      </Text>
      <Text style={[styles.tileDate, { color: accent, textAlign: 'center' }]}>
        {isUnlocked
          ? formatAchievementDate(unlocked.unlockedAt)
          : language === 'en' ? 'Locked' : 'مقفل'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  summary: { alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  summaryIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 17, fontFamily: 'Cairo_700Bold', marginBottom: 2 },
  summarySub: { fontSize: 12, fontFamily: 'Cairo_400Regular' },
  tile: { minHeight: 218, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center', marginBottom: 10 },
  tileIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tileTitle: { minHeight: 42, fontSize: 14, fontFamily: 'Cairo_700Bold', lineHeight: 20 },
  tileDesc: { minHeight: 58, fontSize: 11, fontFamily: 'Cairo_400Regular', lineHeight: 18, marginTop: 4 },
  tileDate: { fontSize: 11, fontFamily: 'Cairo_700Bold', marginTop: 'auto' },
});
