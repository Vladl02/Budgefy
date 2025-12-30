import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { Suspense } from "react";
import { ActivityIndicator, BackHandler } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const DATABASE_NAME = "users_13.db";

type BackHandlerCompat = typeof BackHandler & {
  removeEventListener?: (eventName: string, handler: () => boolean | null | undefined) => void;
};

const backHandlerCompat = BackHandler as BackHandlerCompat;
const backHandlerSubscriptions = new Map<() => boolean | null | undefined, { remove: () => void }>();
const originalAddEventListener = backHandlerCompat.addEventListener.bind(BackHandler);

if (!backHandlerCompat.removeEventListener) {
  backHandlerCompat.addEventListener = (eventName, handler: () => boolean | null | undefined) => {
    const subscription = originalAddEventListener(eventName, handler);
    backHandlerSubscriptions.set(handler, subscription);
    return subscription;
  };

  backHandlerCompat.removeEventListener = (_eventName, handler) => {
    const subscription = backHandlerSubscriptions.get(handler);
    if (subscription) {
      subscription.remove();
      backHandlerSubscriptions.delete(handler);
    }
  };
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Suspense fallback={<ActivityIndicator size="large" />}>
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
                title: "Recurring Expense",
                animation: "none",
              }}
            />
          </Stack>
        </Suspense>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
