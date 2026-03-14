import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  type Theme as NavigationTheme,
} from "@react-navigation/native";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance } from "react-native";

export type AppThemeMode = "light" | "dark";

type AppThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  overlay: string;
  tabBar: string;
  tabBarBorder: string;
  tabActivePill: string;
  tabActiveText: string;
  tabInactiveText: string;
};

type AppThemeContextValue = {
  mode: AppThemeMode;
  isDark: boolean;
  isHydrated: boolean;
  appColors: AppThemeColors;
  navigationTheme: NavigationTheme;
  statusBarStyle: "light" | "dark";
  setMode: (mode: AppThemeMode) => void;
  toggleMode: () => void;
};

const STORAGE_KEY = "app_theme_mode_v1";

const LIGHT_COLORS: AppThemeColors = {
  background: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceMuted: "#F3F4F6",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  overlay: "rgba(3,7,18,0.45)",
  tabBar: "#000000",
  tabBarBorder: "#000000",
  tabActivePill: "#FFFFFF",
  tabActiveText: "#111827",
  tabInactiveText: "#D1D5DB",
};

const DARK_COLORS: AppThemeColors = {
  background: "#000000",
  surface: "#000000",
  surfaceMuted: "#1F2937",
  textPrimary: "#F9FAFB",
  textSecondary: "#9CA3AF",
  border: "#2A3342",
  overlay: "rgba(0,0,0,0.55)",
  tabBar: "#000000",
  tabBarBorder: "#000000",
  tabActivePill: "#F3F4F6",
  tabActiveText: "#111827",
  tabInactiveText: "#D1D5DB",
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

const resolveInitialMode = (): AppThemeMode =>
  Appearance.getColorScheme() === "dark" ? "dark" : "light";

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppThemeMode>(() => resolveInitialMode());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrateThemeMode = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isMounted) return;
        if (storedMode === "light" || storedMode === "dark") {
          setModeState(storedMode);
        }
      } catch (error) {
        console.error("Failed to load theme mode", error);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    void hydrateThemeMode();
    return () => {
      isMounted = false;
    };
  }, []);

  const setMode = useCallback((nextMode: AppThemeMode) => {
    setModeState(nextMode);
    void AsyncStorage.setItem(STORAGE_KEY, nextMode).catch((error) => {
      console.error("Failed to persist theme mode", error);
    });
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const nextMode: AppThemeMode = prev === "dark" ? "light" : "dark";
      void AsyncStorage.setItem(STORAGE_KEY, nextMode).catch((error) => {
        console.error("Failed to persist theme mode", error);
      });
      return nextMode;
    });
  }, []);

  const isDark = mode === "dark";
  const appColors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = isDark ? NavigationDarkTheme : NavigationDefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: isDark ? "#93C5FD" : "#111827",
        background: appColors.background,
        card: appColors.surface,
        text: appColors.textPrimary,
        border: appColors.border,
        notification: isDark ? "#F87171" : "#EF4444",
      },
    };
  }, [appColors.background, appColors.border, appColors.surface, appColors.textPrimary, isDark]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode,
      isDark,
      isHydrated,
      appColors,
      navigationTheme,
      statusBarStyle: isDark ? "light" : "dark",
      setMode,
      toggleMode,
    }),
    [appColors, isDark, isHydrated, mode, navigationTheme, setMode, toggleMode],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(AppThemeContext);
  if (!value) {
    throw new Error("useAppTheme must be used within <AppThemeProvider>");
  }
  return value;
}
