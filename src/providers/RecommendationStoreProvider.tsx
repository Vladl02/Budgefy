import { useSQLiteContext } from "expo-sqlite";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { preloadAllRecommendations } from "@/src/utils/recommendations";

type RecommendationStoreContextValue = {
  cacheVersion: number;
};

const RecommendationStoreContext = createContext<RecommendationStoreContextValue | null>(null);

export function RecommendationStoreProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [cacheVersion, setCacheVersion] = useState(0);
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      await preloadAllRecommendations(db);
      if (cancelled) return;
      setCacheVersion((current) => current + 1);
      setIsBootstrapped(true);
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

  if (!isBootstrapped) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
