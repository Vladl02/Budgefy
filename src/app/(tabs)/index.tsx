import { SafeArea } from "@/src/components/SafeArea";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import HomeContent from "@/src/components/homepage/HomeContent";

export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.fontLoading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <SafeArea>
        <HomeContent />
      </SafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: "#ffffffff",
    height: "100%",
  },
  fontLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffffff",
  },
});
