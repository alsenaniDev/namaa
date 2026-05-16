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

  const headerIconsStyle = dir.isRTL
    ? { flexDirection: dir.row, alignItems: 'center', marginRight: 12 } as const
    : { flexDirection: dir.row, alignItems: 'center', marginLeft: 12 } as const;

  const gearStyle = dir.isRTL
    ? { marginRight: 16, padding: 4 } as const
    : { marginLeft: 16, padding: 4 } as const;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 18 },
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 10 },
        tabBarStyle: {
          position: 'absolute',
          flexDirection: dir.row,
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
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={gearStyle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="settings" size={22} color={colors.foreground} />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.home,
          tabBarIcon: tabIcon('home'),
          headerRight: () => (
            <View style={headerIconsStyle}>
              <TouchableOpacity
                onPress={() => router.push('/reports')}
                style={dir.isRTL ? { padding: 4, marginLeft: 4 } : { padding: 4, marginRight: 4 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="bar-chart-2" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/settings')}
                style={dir.isRTL ? { padding: 4, marginLeft: 8 } : { padding: 4, marginRight: 8 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="settings" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          title: t.tabs.income,
          tabBarIcon: tabIcon('trending-up'),
        }}
      />
      <Tabs.Screen
        name="commitments"
        options={{
          title: t.tabs.commitments,
          tabBarIcon: tabIcon('credit-card'),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: t.tabs.expenses,
          tabBarIcon: tabIcon('shopping-bag'),
        }}
      />
    </Tabs>
  );
}
