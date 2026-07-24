import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, View, useColorScheme, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useRouter } from 'expo-router';
import { useT } from '@/hooks/useT';
import { useDir } from '@/hooks/useDir';

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const router = useRouter();
  const t = useT();
  const dir = useDir();

  const tabIcon = (name: string) =>
    ({ color }: { color: string }) => (
      <Feather name={name as any} size={22} color={color} />
    );

  // In RTL, the gear lives in headerLeft (visual right = start for Arabic).
  // In LTR it lives in headerRight.
  const GearButton = () => (
    <TouchableOpacity
      onPress={() => router.push('/settings')}
      style={dir.isRTL ? { marginRight: 14, padding: 4, marginInlineStart: 10 } : { marginLeft: 14, padding: 4 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Feather name="settings" size={22} color={colors.foreground} />
    </TouchableOpacity>
  );

  // Home tab has two icons. In RTL place on left side of header (start), in LTR on right.
  const HomeHeaderIcons = () => (
    <View style={dir.isRTL
      ? { flexDirection: 'row', alignItems: 'center', marginRight: 14 }
      : { flexDirection: 'row', alignItems: 'center', marginLeft: 14 }
    }>
      <TouchableOpacity
        onPress={() => router.push('/calendar')}
        style={{ padding: 4, marginHorizontal: 4, marginInlineStart: 12 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="calendar" size={22} color={colors.foreground} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push('/reports')}
        style={{ padding: 4, marginHorizontal: 4 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="bar-chart-2" size={22} color={colors.foreground} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push('/settings')}
        style={dir.isRTL ? { padding: 4, marginLeft: 4 } : { padding: 4, marginRight: 4 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="settings" size={22} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );

  const commonScreenOptions = {
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.mutedForeground,
    headerShown: true,
    headerStyle: { backgroundColor: colors.background },
    headerTitleStyle: { color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 18 },
    headerTitleAlign: 'center' as const,
    headerShadowVisible: false,
    tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 10 },
    tabBarStyle: {
      position: 'absolute' as const,
      backgroundColor: isIOS ? 'transparent' : colors.background,
      borderTopWidth: isWeb ? 1 : StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      elevation: 0,
      ...(isWeb ? { height: 84 } : {}),
    },
    tabBarBackground: () =>
      isIOS ? (
        <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : isWeb ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      ) : null,
    // default gear for non-home tabs
    ...(dir.isRTL
      ? { headerRight: undefined, headerLeft: () => <GearButton /> }
      : { headerLeft: undefined, headerRight: () => <GearButton /> }),
  };

  const indexScreen = (
    <Tabs.Screen
      key="index"
      name="index"
      options={{
        title: t.tabs.home,
        tabBarIcon: tabIcon('home'),
        ...(dir.isRTL
          ? { headerRight: undefined, headerLeft: () => <HomeHeaderIcons /> }
          : { headerLeft: undefined, headerRight: () => <HomeHeaderIcons /> }),
      }}
    />
  );

  const incomeScreen = (
    <Tabs.Screen
      key="income"
      name="income"
      options={{ title: t.tabs.income, tabBarIcon: tabIcon('trending-up') }}
    />
  );

  const commitmentsScreen = (
    <Tabs.Screen
      key="commitments"
      name="commitments"
      options={{ title: t.tabs.commitments, tabBarIcon: tabIcon('credit-card') }}
    />
  );

  const expensesScreen = (
    <Tabs.Screen
      key="expenses"
      name="expenses"
      options={{ title: t.tabs.expenses, tabBarIcon: tabIcon('shopping-bag') }}
    />
  );

  // In RTL the visual start is the right side — reverse tab order so Home is rightmost.
  const screens = dir.isRTL
    ? [expensesScreen, commitmentsScreen, incomeScreen, indexScreen]
    : [indexScreen, incomeScreen, commitmentsScreen, expensesScreen];

  return (
    <Tabs initialRouteName="index" screenOptions={commonScreenOptions}>
      {screens}
    </Tabs>
  );
}
