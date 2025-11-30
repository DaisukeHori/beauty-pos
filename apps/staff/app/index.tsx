import { Redirect } from 'expo-router';
import { useAuthStore } from '@beauty-pos/core';

export default function Index() {
  const { isAuthenticated, staff } = useAuthStore();

  if (isAuthenticated && staff) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
