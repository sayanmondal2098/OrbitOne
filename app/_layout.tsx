import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { LocationProvider } from '../context/LocationContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { TasksProvider } from '../context/TasksContext';
import { NewsProvider } from '../context/NewsContext';
import { HabitsProvider } from '../context/HabitsContext';

function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabIconSelected,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarStyle: {
            backgroundColor: colors.tabBackground,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom + 8,
            paddingTop: 8,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Tasks',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="checkbox" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="habits"
          options={{
            title: 'Habits',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="flame" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LocationProvider>
          <TasksProvider>
            <NewsProvider>
              <HabitsProvider>
                <TabsLayout />
              </HabitsProvider>
            </NewsProvider>
          </TasksProvider>
        </LocationProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
