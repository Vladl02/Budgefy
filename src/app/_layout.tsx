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
            
          </Stack>
    </Suspense>
    </GestureHandlerRootView>
  );
}

