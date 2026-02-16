import React, { createContext, ReactNode, useContext, useMemo } from 'react';

import { useIsTablet } from '@/hooks/use-responsive';

interface NavigationContextValue {
  isTablet: boolean;
  isSplitView: boolean;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);
const DEFAULT_NAVIGATION_MODE: NavigationContextValue = {
  isTablet: false,
  isSplitView: false,
};

export interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const isTablet = useIsTablet();

  const value = useMemo<NavigationContextValue>(() => ({
    isTablet,
    isSplitView: isTablet,
  }), [isTablet]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationMode() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    return DEFAULT_NAVIGATION_MODE;
  }
  return context;
}
