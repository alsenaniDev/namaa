import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { I18nManager, Platform, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AchievementPopup } from '@/components/AchievementPopup';
import { HeaderBack } from '@/components/HeaderBack';
import { AppProvider, useApp } from '@/context/AppContext';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { SmartExpenseDetectionProvider } from '@/features/smartExpenseDetection/context/SmartExpenseDetectionProvider';
import { useColors } from '@/hooks/useColors';
import { useT } from '@/hooks/useT';
import { useDir } from '@/hooks/useDir';
import { isRTL } from '@/utils/dir';

// ─── WEB-ONLY SYNCHRONOUS DIRECTION SETUP ────────────────────────────────────
// Web has no I18nManager persistence, so we set CSS direction from localStorage
// (read by isRTL helper) before first paint to avoid a flash.
// Native direction is fully managed by LanguageContext + I18nManager NSUserDefaults.

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.style.direction = isRTL ? 'rtl' : 'ltr';
} else {
  I18nManager.allowRTL(true);
}

SplashScreen.preventAutoHideAsync();

const BRAND_SPLASH_VISIBLE_MS = 2600;

// Keeps document.dir in sync whenever language changes (web only).
function WebDirectionSync() {
  const { language } = useLanguage();
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.direction = language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [language]);
  return null;
}

function LoadingView() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function AppLayout() {
  const { userProfile, isLoading, recentAchievement, dismissRecentAchievement } = useApp();
  const router = useRouter();
  const segments = useSegments();
  const colors = useColors();
  const t = useT();
  const dir = useDir();

  useEffect(() => {
    if (isLoading) return;
    const inSetup = segments[0] === 'setup';
    if (!userProfile && !inSetup) {
      router.replace('/setup');
    } else if (userProfile && inSetup) {
      router.replace('/(tabs)');
    }
  }, [isLoading, userProfile]);

  if (isLoading) return <LoadingView />;

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.foreground, fontFamily: 'Cairo_600SemiBold', fontSize: 18 },
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerBackTitle: t.nav.back,
          // Native RTL stays pinned LTR (see index.js / plugins/withForceRTL.js),
          // so we render our own back button for both languages to keep the icon
          // size identical: English on the left, Arabic on the right.
          headerBackVisible: false,
          ...(dir.isRTL
            ? { headerRight: () => <HeaderBack />, headerRightContainerStyle: { paddingEnd: 4 } }
            : { headerLeft: () => <HeaderBack />, headerLeftContainerStyle: { paddingStart: 4 } }),
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="setup" options={{ headerShown: false }} />
        <Stack.Screen name="reports" options={{ title: t.screen.reports }} />
        <Stack.Screen name="payoff-plan" options={{ title: t.screen.payoffPlan }} />
        <Stack.Screen name="what-if" options={{ title: t.screen.whatIf }} />
        <Stack.Screen name="financial-challenges" options={{ title: t.screen.financialChallenges }} />
        <Stack.Screen name="achievements" options={{ title: t.screen.achievements }} />
        <Stack.Screen name="calendar" options={{ title: t.screen.calendar }} />
        <Stack.Screen name="settings" options={{ title: t.screen.settings }} />
        <Stack.Screen name="income/add" options={{ presentation: 'modal', title: t.screen.addEditIncome }} />
        <Stack.Screen name="commitments/add" options={{ presentation: 'modal', title: t.screen.addEditCommitment }} />
        <Stack.Screen name="commitments/overview" options={{ title: t.screen.commitmentsOverview }} />
        <Stack.Screen name="commitments/archive" options={{ title: t.screen.commitmentsArchive }} />
        <Stack.Screen name="commitments/[id]" options={{ title: t.screen.commitmentDetail }} />
        <Stack.Screen name="expenses/add" options={{ presentation: 'modal', title: t.screen.addEditExpense }} />
        <Stack.Screen name="expenses/review" options={{ presentation: 'modal', title: t.screen.reviewExpense }} />
        <Stack.Screen name="lenders/index" options={{ title: t.screen.lenders }} />
        <Stack.Screen name="lenders/add" options={{ presentation: 'modal', title: t.screen.addEditLender }} />
        <Stack.Screen name="lenders/[id]" options={{ title: t.screen.lenderDetail }} />
        <Stack.Screen name="goals/index" options={{ title: t.screen.goals }} />
        <Stack.Screen name="goals/add" options={{ presentation: 'modal', title: t.screen.addEditGoal }} />
        <Stack.Screen name="goals/[id]" options={{ title: t.screen.goalDetail }} />
        <Stack.Screen name="budgets" options={{ title: t.screen.budgets }} />
        <Stack.Screen name="subscriptions/index" options={{ title: t.screen.subscriptions }} />
        <Stack.Screen name="subscriptions/add" options={{ presentation: 'modal', title: t.screen.addEditSubscription }} />
      </Stack>
      <AchievementPopup achievement={recentAchievement} onDismiss={dismissRecentAchievement} />
    </>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      const timer = setTimeout(() => {
        setAppReady(true);
      }, BRAND_SPLASH_VISIBLE_MS);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (appReady) SplashScreen.hideAsync();
  }, [appReady]);

  if (!fontsLoaded && !fontError) return null;
  if (!appReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <LanguageProvider>
            <AppProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <WebDirectionSync />
                  <SmartExpenseDetectionProvider>
                    <AppLayout />
                  </SmartExpenseDetectionProvider>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AppProvider>
          </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
