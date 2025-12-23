import { Stack } from "expo-router";
import { Suspense } from "react";
import { ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";



const DATABASE_NAME = "users_13.db"


export default function RootLayout() {


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <Suspense fallback={<ActivityIndicator size="large"/>}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "default" }} />
            <Stack.Screen 
              name="(modals)/upcomingpayments" 
              options={{ headerShown: true, title: "Upcoming Payments", animation: "default", headerBackTitle: "Back" }} 
            />
            <Stack.Screen 
              name="(modals)/recentspendingspage" 
              options={{ headerShown: true, title: "Recent Spendings", animation: "default", headerBackTitle: "Back" }} 
            />
            <Stack.Screen 
              name="(modals)/notifications" 
              options={{ headerShown: true, title: "Notifications", animation: "default", headerBackTitle: "Back" }} 
            />
            <Stack.Screen 
              name="(modals)/(settings-modals)/profile" 
              options={{ headerShown: true, title: "Profile", animation: "default", headerBackTitle: "Back" }} 
            />
            <Stack.Screen 
            name="(modals)/(settings-modals)/language" 
            options={{ headerShown: false, title: "Language", animation: "default", headerBackTitle: "Back" }} 
          />
          </Stack>
    </Suspense>
    </GestureHandlerRootView>
  );
}

