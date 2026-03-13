import type { Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { supabase } from "@/src/utils/supabase";

const LOGGED_OUT_ONBOARDING_KEY = "show_logged_out_onboarding_v1";

type AuthContextValue = {
  isLoading: boolean;
  session: Session | null;
  signOut: () => Promise<void>;
  showLoggedOutOnboarding: boolean;
  completeLoggedOutOnboarding: () => Promise<void>;
  showOnboardingForTesting: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(true);
  const [showLoggedOutOnboarding, setShowLoggedOutOnboarding] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Failed loading auth session:", error);
      }
      if (!isMounted) return;
      setSession(data.session ?? null);
      setIsSessionLoading(false);
    };

    const bootstrapOnboarding = async () => {
      try {
        const shouldShow = await AsyncStorage.getItem(LOGGED_OUT_ONBOARDING_KEY);
        const shouldDisplayOnboarding = shouldShow === null ? true : shouldShow === "1";
        if (!isMounted) return;
        setShowLoggedOutOnboarding(shouldDisplayOnboarding);
      } catch (error) {
        console.error("Failed loading onboarding state:", error);
      } finally {
        if (isMounted) {
          setIsOnboardingLoading(false);
        }
      }
    };

    void bootstrap();
    void bootstrapOnboarding();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setIsSessionLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    setShowLoggedOutOnboarding(true);
    void AsyncStorage.setItem(LOGGED_OUT_ONBOARDING_KEY, "1").catch((error) => {
      console.error("Failed persisting onboarding state:", error);
    });

    const { error } = await supabase.auth.signOut();
    if (error) {
      setShowLoggedOutOnboarding(false);
      void AsyncStorage.setItem(LOGGED_OUT_ONBOARDING_KEY, "0").catch((cleanupError) => {
        console.error("Failed reverting onboarding state:", cleanupError);
      });
      throw error;
    }
  }, []);

  const completeLoggedOutOnboarding = useCallback(async () => {
    setShowLoggedOutOnboarding(false);
    await AsyncStorage.setItem(LOGGED_OUT_ONBOARDING_KEY, "0").catch((error) => {
      console.error("Failed clearing onboarding state:", error);
    });
  }, []);

  const showOnboardingForTesting = useCallback(async () => {
    setShowLoggedOutOnboarding(true);
    await AsyncStorage.setItem(LOGGED_OUT_ONBOARDING_KEY, "1").catch((error) => {
      console.error("Failed persisting onboarding testing state:", error);
    });
  }, []);

  const isLoading = isSessionLoading || isOnboardingLoading;

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      session,
      signOut,
      showLoggedOutOnboarding,
      completeLoggedOutOnboarding,
      showOnboardingForTesting,
    }),
    [
      completeLoggedOutOnboarding,
      isLoading,
      session,
      showLoggedOutOnboarding,
      showOnboardingForTesting,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
