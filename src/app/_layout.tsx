import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";


import migrations from "@/drizzle/migrations";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync, SQLiteProvider } from "expo-sqlite";
import { users } from "../db/schema";
import { seedAppData } from "../db/seed-data";
import { RecommendationStoreProvider } from "../providers/RecommendationStoreProvider";

const DATABASE_NAME = "users_3.db";

export default function RootLayout() {
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
      } finally {
        setIsDatabaseReady(true);
      }
    };

    void seedIfNeeded();
  }, [success, db]);


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Suspense fallback={<ActivityIndicator size="large" />}>
        <SQLiteProvider
          databaseName={DATABASE_NAME}
          options={{ enableChangeListener: true}}
          useSuspense>
          {isDatabaseReady ? (
            <RecommendationStoreProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "default" }} />
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
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
