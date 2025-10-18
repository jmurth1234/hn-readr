import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchFilterType, SearchList, SearchSortOrder } from '@/components/search-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createPressableStyle, createRippleConfig } from '@/constants/platform-styles';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function SearchIndex() {
  const { query = '' } = useLocalSearchParams<{ query?: string }>();
  const [filterType, setFilterType] = useState<SearchFilterType>('all');
  const [sortOrder, setSortOrder] = useState<SearchSortOrder>('relevance');
  const insets = useSafeAreaInsets();
  const borderColor = useThemeColor({}, 'border');

  const renderFilterButton = (
    label: string, 
    value: SearchFilterType | SearchSortOrder, 
    currentValue: SearchFilterType | SearchSortOrder,
    onPress: () => void
  ) => {
    const handlePress = () => {
      // Add haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress();
    };

    return (
      <Pressable
        style={createPressableStyle([
          styles.filterButton,
          value === currentValue && styles.filterButtonActive
        ])}
        onPress={handlePress}
        android_ripple={createRippleConfig()}
      >
        <ThemedText 
          style={[
            styles.filterButtonText,
            value === currentValue && styles.filterButtonTextActive
          ]}
        >
          {label}
        </ThemedText>
      </Pressable>
    );
  };

  const paddingTop = Platform.OS === 'ios' ? insets.top + 8 : 8;

  return (
    <ThemedView style={styles.container}>
      {/* Filter Controls */}
      {query && (
        <ThemedView style={[styles.filterContainer, { paddingTop, borderBottomColor: borderColor }]}>
          <ThemedView style={styles.filterSection}>
            <ThemedText style={styles.filterLabel}>Type:</ThemedText>
            <View style={styles.filterButtons}>
              {renderFilterButton('All', 'all', filterType, () => setFilterType('all'))}
              {renderFilterButton('Stories', 'story', filterType, () => setFilterType('story'))}
              {renderFilterButton('Comments', 'comment', filterType, () => setFilterType('comment'))}
            </View>
          </ThemedView>
          
          <ThemedView style={styles.filterSection}>
            <ThemedText style={styles.filterLabel}>Sort:</ThemedText>
            <View style={styles.filterButtons}>
              {renderFilterButton('Relevance', 'relevance', sortOrder, () => setSortOrder('relevance'))}
              {renderFilterButton('Date', 'date', sortOrder, () => setSortOrder('date'))}
            </View>
          </ThemedView>
        </ThemedView>
      )}

      {/* Search Results */}
      <SearchList 
        query={query} 
        filterType={filterType} 
        sortOrder={sortOrder} 
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '400',
    marginRight: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  filterButtonActive: {
    backgroundColor: '#ff6600',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
});
