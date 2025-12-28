import { Platform, StyleSheet } from 'react-native';

/**
 * Platform-specific styling utilities for native UI patterns
 */

// Platform-specific elevation/shadow helpers
export const createElevation = (elevation: number) => {
  if (Platform.OS === 'android') {
    return {
      elevation,
    };
  } else {
    // iOS shadow
    return {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: elevation / 2,
      },
      shadowOpacity: 0.1 + (elevation * 0.02),
      shadowRadius: elevation,
    };
  }
};

// Platform-specific spacing constants
export const Spacing = {
  xs: Platform.OS === 'ios' ? 4 : 4,
  sm: Platform.OS === 'ios' ? 8 : 8,
  md: Platform.OS === 'ios' ? 16 : 16,
  lg: Platform.OS === 'ios' ? 24 : 24,
  xl: Platform.OS === 'ios' ? 32 : 32,
};

// Tab bar height for iOS 26+ (when positioned at top on iPad)
// On iOS 26+, the tab bar is positioned at the top and is not included in safe area insets
const isIOS26OrHigher = () => {
  if (Platform.OS !== 'ios') return false;
  const version = parseInt(String(Platform.Version), 10);
  return version >= 26;
};

export const TAB_BAR_HEIGHT = isIOS26OrHigher() ? 49 : 0;

// Platform-specific border radius
export const BorderRadius = {
  sm: Platform.OS === 'ios' ? 6 : 4,
  md: Platform.OS === 'ios' ? 8 : 6,
  lg: Platform.OS === 'ios' ? 12 : 8,
  xl: Platform.OS === 'ios' ? 16 : 12,
};

// Platform-specific pressable styles
export const createPressableStyle = (baseStyle: any) => {
  return ({ pressed }: { pressed: boolean }) => [
    baseStyle,
    Platform.OS === 'ios' && pressed && { opacity: 0.7 },
  ];
};

// Platform-specific ripple configuration for Android
export const createRippleConfig = (color: string = 'rgba(255, 102, 0, 0.2)') => {
  return Platform.OS === 'android' ? { color } : undefined;
};

// Platform-specific activity indicator color
export const getActivityIndicatorColor = (theme: 'light' | 'dark' = 'light') => {
  if (Platform.OS === 'ios') {
    return theme === 'dark' ? '#ffffff' : '#007AFF';
  } else {
    return '#ff6600'; // Material Design accent color
  }
};

// Platform-specific refresh control colors
export const getRefreshControlColors = (theme: 'light' | 'dark' = 'light') => {
  if (Platform.OS === 'ios') {
    return {
      tintColor: theme === 'dark' ? '#ffffff' : '#007AFF',
    };
  } else {
    return {
      colors: ['#ff6600'],
      progressBackgroundColor: theme === 'dark' ? '#151718' : '#ffffff',
    };
  }
};

// Common card styles with platform-specific elevation
export const createCardStyle = (elevation: number = 2) => ({
  ...createElevation(elevation),
  borderRadius: BorderRadius.md,
  backgroundColor: 'transparent', // Will be set by themed components
});

// Platform-specific list item styles
export const createListItemStyle = () => ({
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: 'rgba(0,0,0,0.1)',
  ...(Platform.OS === 'android' && {
    // Android-specific list item styling
    paddingVertical: 2,
  }),
});

// Platform-specific button styles
export const createButtonStyle = (variant: 'primary' | 'secondary' = 'primary') => {
  const baseStyle = {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 44, // Minimum touch target
  };

  if (variant === 'primary') {
    return {
      ...baseStyle,
      backgroundColor: '#ff6600',
    };
  } else {
    return {
      ...baseStyle,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#ff6600',
    };
  }
};
