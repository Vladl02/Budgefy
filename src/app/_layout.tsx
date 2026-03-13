import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";


import migrations from "@/drizzle/migrations";
import { AuthScreen } from "@/src/components/auth/AuthScreen";
import { LoggedOutOnboardingScreen } from "@/src/components/auth/LoggedOutOnboardingScreen";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync, SQLiteProvider } from "expo-sqlite";
import { users } from "../db/schema";
import { seedAppData } from "../db/seed-data";
import { AppThemeProvider, useAppTheme } from "../providers/AppThemeProvider";
import { AuthProvider, useAuth } from "../providers/AuthProvider";
import { RecommendationStoreProvider } from "../providers/RecommendationStoreProvider";

const DATABASE_NAME = "users_6.db";

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppThemeProvider>
        <RootLayoutContent />
      </AppThemeProvider>
    </AuthProvider>
  );
}

function RootLayoutContent() {
  const {
    isLoading: isAuthLoading,
    session,
    showLoggedOutOnboarding,
    completeLoggedOutOnboarding,
  } = useAuth();
  const { appColors, navigationTheme, statusBarStyle } = useAppTheme();
  const expo = useMemo(() => openDatabaseSync(DATABASE_NAME), []);
  const db = useMemo(() => drizzle(expo), [expo]);
  const hasCheckedSeedRef = useRef(false);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);

  const { success, error } = useMigrations(db, migrations)

  useEffect(() => {
    if (error) {
      console.error("Migrations failed:", error);
      setIsDatabaseReady(true);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      setIsDatabaseReady(true);
    }
  }, [success]);

  useEffect(() => {
    if (!success || hasCheckedSeedRef.current) return;

    hasCheckedSeedRef.current = true;

    const seedIfNeeded = async () => {
      try {
        const existingUsers = db.select().from(users).all();

        if (existingUsers.length > 0) {
          return;
        }

        await seedAppData(db, { usersCount: 1, seedValue: 20260212 });
      } catch (seedError) {
        console.error("Seed failed:", seedError);
      }
    };

    void seedIfNeeded();
  }, [success, db]);


  return (
    <ThemeProvider value={navigationTheme}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: appColors.background }}>
        <StatusBar style={statusBarStyle} />
        <BottomSheetModalProvider>
          {isAuthLoading ? (
            <ActivityIndicator size="large" />
          ) : !session && showLoggedOutOnboarding ? (
            <LoggedOutOnboardingScreen onFinish={() => void completeLoggedOutOnboarding()} />
           ) : !session ? (
            <AuthScreen />
          ) : (
            
            <Suspense fallback={<ActivityIndicator size="large" />}>
              <SQLiteProvider
                databaseName={DATABASE_NAME}
                options={{ enableChangeListener: true }}
                useSuspense
              >
                {isDatabaseReady ? (
                  <RecommendationStoreProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen
                        name="category/[categoryId]"
                        options={{
                          headerShown: false,
                          presentation: "card",
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="(modals)/addExpense"
                        options={{
                          presentation: "transparentModal",
                          title: "Add expense",
                          animation: "none",
                        }}
                      />
                      <Stack.Screen
                        name="(modals)/(settings)/language"
                        options={{
                          presentation: "transparentModal",
                          title: "Language",
                          animation: "none",
                        }}
                      />
                      <Stack.Screen
                        name="(modals)/(settings)/currency"
                        options={{
                          presentation: "transparentModal",
                          title: "Currency",
                          animation: "none",
                        }}
                      />
                      <Stack.Screen
                        name="(modals)/(settings)/startdate"
                        options={{
                          presentation: "transparentModal",
                          title: "Start Date",
                          animation: "none",
                        }}
                      />
                      <Stack.Screen
                        name="(modals)/(settings)/recurringexpense"
                        options={{
                          presentation: "transparentModal",
                          title: "Recurring Expense",
                          animation: "none",
                        }}
                      />
                      <Stack.Screen
                        name="(modals)/(settings)/savingsmanager"
                        options={{
                          presentation: "transparentModal",
                          title: "Savings Manager",
                          animation: "none",
                        }}
                      />
                      <Stack.Screen
                        name="(modals)/(settings)/budget"
                        options={{
                          presentation: "transparentModal",
                          title: "Budget",
                          animation: "none",
                        }}
                      />
                      <Stack.Screen
                        name="(modals)/(settings)/shoppinglist"
                        options={{
                          presentation: "transparentModal",
                          title: "Notes",
                          animation: "none",
                        }}
                      />
                    </Stack>
                  </RecommendationStoreProvider>
                ) : (
                  <ActivityIndicator size="large" />
                )}
              </SQLiteProvider>
            </Suspense>
          )}
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
