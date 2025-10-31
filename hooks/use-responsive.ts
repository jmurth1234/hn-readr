import { useWindowDimensions } from 'react-native';

/**
 * Breakpoint for tablet detection (768px)
 * This is a common breakpoint used in responsive design
 */
const TABLET_BREAKPOINT = 768;

/**
 * Hook to detect if the current device is a tablet based on screen width
 * @returns true if screen width >= TABLET_BREAKPOINT, false otherwise
 */
export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= TABLET_BREAKPOINT;
}

/**
 * Hook to get screen dimensions and responsive helpers
 * @returns Object with width, height, and isTablet flag
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  
  return {
    width,
    height,
    isTablet,
  };
}

