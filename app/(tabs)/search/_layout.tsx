import { useColorScheme } from '@/hooks/use-color-scheme.web';
import { NativeSyntheticEvent, TextInputChangeEventData } from 'react-native';
import { Stack, useRouter } from 'expo-router';

export default function SearchLayout() {
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleSearchChange = (event: NativeSyntheticEvent<TextInputChangeEventData>) => {
    const text = event.nativeEvent.text || '';
    // Update the URL with the search query
    router.setParams({ query: text });
  };

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Search',
          headerSearchBarOptions: {
            autoFocus: true,
            placement: "automatic",
            placeholder: "Search Hacker News",
            headerIconColor: isDark ? '#fff' : '#000',
            hintTextColor: isDark ? '#bbb' : '#666',
            textColor: isDark ? '#fff' : '#000',
            onChangeText: handleSearchChange,
          },
        }} />
    </Stack>
  );
}
