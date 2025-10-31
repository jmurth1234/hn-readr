import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface SplitViewProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

export function SplitView({ leftPanel, rightPanel }: SplitViewProps) {
  const borderColor = useThemeColor({}, 'border');

  return (
    <ThemedView style={styles.container}>
      {/* Left Panel - Story List */}
      <View style={styles.leftPanel}>
        {leftPanel}
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: borderColor }]} />

      {/* Right Panel - Story Detail */}
      <View style={styles.rightPanel}>
        {rightPanel}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 0.35, // 35% width for list
    minWidth: 300,
    maxWidth: 400,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
  },
  rightPanel: {
    flex: 1, // Takes remaining space
  },
});

