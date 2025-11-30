import { Redirect, Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { useAuthStore } from '@beauty-pos/core';
import { colors, spacing } from '@beauty-pos/ui';

type TabIconProps = {
  focused: boolean;
  icon: string;
  label: string;
};

function TabIcon({ focused, icon, label }: TabIconProps) {
  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {icon}
    </Text>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, staff } = useAuthStore();

  // If not authenticated, redirect to login
  if (!isAuthenticated || !staff) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.neutral[200],
          height: 80,
          paddingTop: spacing[2],
          paddingBottom: spacing[4],
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: colors.white,
        },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="🏠" label="ホーム" />
          ),
        }}
      />
      <Tabs.Screen
        name="visits"
        options={{
          title: '来店管理',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="👥" label="来店" />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: '予約',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="📅" label="予約" />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: '顧客',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="📋" label="顧客" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="⚙️" label="設定" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 24,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
  },
});
