import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { HackerNewsClient } from '@/lib/hn-api';

interface HNClientContextType {
  client: HackerNewsClient;
}

const HNClientContext = createContext<HNClientContextType | undefined>(undefined);

export function HNClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(
    () =>
      new HackerNewsClient({
        maxConcurrency: 5,
        cache: {
          maxEntries: 500,
          ttl: 5 * 60 * 1000, // 5 minutes
        },
        enablePolling: false, // Will enable per-component as needed
      }),
    [],
  );

  return <HNClientContext.Provider value={{ client }}>{children}</HNClientContext.Provider>;
}

export function useHNClient(): HackerNewsClient {
  const context = useContext(HNClientContext);
  if (context === undefined) {
    throw new Error('useHNClient must be used within an HNClientProvider');
  }
  return context.client;
}
