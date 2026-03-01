import { useSQLiteContext } from "expo-sqlite";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { preloadAllRecommendations } from "@/src/utils/recommendations";

type RecommendationStoreContextValue = {
  cacheVersion: number;
};

const RecommendationStoreContext = createContext<RecommendationStoreContextValue | null>(null);

export function RecommendationStoreProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [cacheVersion, setCacheVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      await preloadAllRecommendations(db);
      if (cancelled) return;
      setCacheVersion((current) => current + 1);
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [db]);

  const value = useMemo<RecommendationStoreContextValue>(
    () => ({ cacheVersion }),
    [cacheVersion],
  );

  return (
    <RecommendationStoreContext.Provider value={value}>
      {children}
    </RecommendationStoreContext.Provider>
  );
}

export const useRecommendationStore = (): RecommendationStoreContextValue => {
  const context = useContext(RecommendationStoreContext);
  if (!context) {
    throw new Error("useRecommendationStore must be used within RecommendationStoreProvider");
  }
  return context;
};
