import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import React, { useEffect } from 'react';
import { I18nManager, Platform, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppProvider, useApp } from '@/context/AppContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { useColors } from '@/hooks/useColors';
import { useT } from '@/hooks/useT';

// Force RTL for Arabic layout. Persists after first reload.
if (Platform.OS !== 'web') {
  const wasAlreadyRTL = I18nManager.isRTL;
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  if (!wasAlreadyRTL) {
    Updates.reloadAsync().catch(() => {});
  }
}

SplashScreen.preventAutoHideAsync();

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
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="setup" options={{ headerShown: false }} />
      <Stack.Screen name="reports" options={{ title: t.screen.reports }} />
      <Stack.Screen name="settings" options={{ title: t.screen.settings }} />
      <Stack.Screen name="income/add" options={{ presentation: 'modal', title: t.screen.addEditIncome }} />
      <Stack.Screen name="commitments/add" options={{ presentation: 'modal', title: t.screen.addEditCommitment }} />
      <Stack.Screen name="expenses/add" options={{ presentation: 'modal', title: t.screen.addEditExpense }} />
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
                <AppLayout />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AppProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
