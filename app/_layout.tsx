import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/error-boundary';
import { HNClientProvider } from '@/contexts/hn-client-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <HNClientProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              <Stack.Screen
                name="story/[id]"
                options={{
                  title: 'Story',
                  headerShown: true,
                  headerBackTitle: 'Home',
                }}
              />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </HNClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
