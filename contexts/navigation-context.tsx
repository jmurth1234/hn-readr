import React, { createContext, useContext, ReactNode } from 'react';

import { useIsTablet } from '@/hooks/use-responsive';

interface NavigationContextValue {
  isTablet: boolean;
  isSplitView: boolean;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const isTablet = useIsTablet();

  const value: NavigationContextValue = {
    isTablet,
    isSplitView: isTablet,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationMode() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    // Fallback: check directly if no provider
    const isTablet = useIsTablet();
    return {
      isTablet,
      isSplitView: isTablet,
    };
  }
  return context;
}

