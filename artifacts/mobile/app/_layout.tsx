import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { I18nManager, Platform, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HeaderBack } from '@/components/HeaderBack';
import { AppProvider, useApp } from '@/context/AppContext';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import { useColors } from '@/hooks/useColors';
import { useT } from '@/hooks/useT';
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
  const { userProfile, isLoading } = useApp();
  const router = useRouter();
  const segments = useSegments();
  const colors = useColors();
  const t = useT();

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
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 18 },
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerBackTitle: t.nav.back,
        // App is manually RTL with native I18nManager pinned LTR, so the
        // default back button lands on the visual LEFT — wrong side for
        // Arabic. We hide it and render our own larger chevron on the
        // visual right via headerRight (see HeaderBack).
        headerBackVisible: true,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="setup" options={{ headerShown: false }} />
      <Stack.Screen name="reports" options={{ title: t.screen.reports }} />
      <Stack.Screen name="calendar" options={{ title: t.screen.calendar }} />
      <Stack.Screen name="settings" options={{ title: t.screen.settings }} />
      <Stack.Screen name="income/add" options={{ presentation: 'modal', title: t.screen.addEditIncome }} />
      <Stack.Screen name="commitments/add" options={{ presentation: 'modal', title: t.screen.addEditCommitment }} />
      <Stack.Screen name="commitments/overview" options={{ title: t.screen.commitmentsOverview }} />
      <Stack.Screen name="commitments/[id]" options={{ title: t.screen.commitmentDetail }} />
      <Stack.Screen name="expenses/add" options={{ presentation: 'modal', title: t.screen.addEditExpense }} />
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
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <LanguageProvider>
          <AppProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <WebDirectionSync />
                <AppLayout />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AppProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
