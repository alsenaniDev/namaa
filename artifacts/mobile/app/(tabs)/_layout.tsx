import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, View, useColorScheme } from 'react-native';
import { useColors } from '@/hooks/useColors';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>الرئيسية</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="income">
        <Icon sf={{ default: 'arrow.up.circle', selected: 'arrow.up.circle.fill' }} />
        <Label>الدخل</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="commitments">
        <Icon sf={{ default: 'list.bullet.circle', selected: 'list.bullet.circle.fill' }} />
        <Label>الالتزامات</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="expenses">
        <Icon sf={{ default: 'cart.circle', selected: 'cart.circle.fill' }} />
        <Label>المصاريف</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reports">
        <Icon sf={{ default: 'chart.bar.circle', selected: 'chart.bar.circle.fill' }} />
        <Label>التقارير</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: 'gear.circle', selected: 'gear.circle.fill' }} />
        <Label>الإعدادات</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  const tabIcon = (name: string) =>
    ({ color }: { color: string }) =>
      isIOS ? (
        <SymbolView name={name} tintColor={color} size={24} />
      ) : (
        <Feather name={name as any} size={22} color={color} />
      );

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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: tabIcon(isIOS ? 'house' : 'home'),
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          title: 'الدخل',
          tabBarIcon: tabIcon(isIOS ? 'arrow.up.circle' : 'trending-up'),
        }}
      />
      <Tabs.Screen
        name="commitments"
        options={{
          title: 'الالتزامات',
          tabBarIcon: tabIcon(isIOS ? 'list.bullet.circle' : 'credit-card'),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'المصاريف',
          tabBarIcon: tabIcon(isIOS ? 'cart.circle' : 'shopping-bag'),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'التقارير',
          tabBarIcon: tabIcon(isIOS ? 'chart.bar.circle' : 'bar-chart-2'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'الإعدادات',
          tabBarIcon: tabIcon(isIOS ? 'gear.circle' : 'settings'),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
