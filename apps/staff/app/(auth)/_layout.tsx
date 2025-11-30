import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@beauty-pos/core';
import { colors } from '@beauty-pos/ui';

export default function AuthLayout() {
  const { isAuthenticated, staff } = useAuthStore();

  // If user is authenticated, redirect to main app
  if (isAuthenticated && staff) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.white,
        },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
