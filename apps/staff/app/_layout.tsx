import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { initializeSupabase } from '@beauty-pos/api';
import { useAuthStore } from '@beauty-pos/core';
import { colors } from '@beauty-pos/ui';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Initialize Supabase
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  initializeSupabase({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY });
}

export default function RootLayout() {
  const { isLoading, initialize } = useAuthStore();
  const [fontsLoaded] = useFonts({
    // Add custom fonts here if needed
  });

  useEffect(() => {
    const init = async () => {
      try {
        await initialize();
      } finally {
        if (fontsLoaded) {
          await SplashScreen.hideAsync();
        }
      }
    };
    init();
  }, [fontsLoaded]);

  if (!fontsLoaded || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.white,
          },
          headerTintColor: colors.neutral[900],
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.neutral[50],
          },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="customer/[id]"
          options={{
            title: '顧客詳細',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="visit/[id]"
          options={{
            title: '来店詳細',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="checkout"
          options={{
            title: '会計',
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="reservation/new"
          options={{
            title: '予約作成',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="reservation/[id]"
          options={{
            title: '予約詳細',
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
});
