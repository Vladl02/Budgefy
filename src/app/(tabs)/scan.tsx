import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { SafeArea } from "@/src/components/SafeArea";
import { useAppTheme } from "@/src/providers/AppThemeProvider";

export default function Scan() {
  const { isDark } = useAppTheme();

  return (
    <SafeArea>
      <View style={[styles.screen, isDark ? styles.screenDark : null]}>
        <Text style={[styles.message, isDark ? styles.messageDark : null]}>
          Tap the center Scan button to open the scanner.
        </Text>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },
  screenDark: {
    backgroundColor: "#0B0F14",
  },
  message: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
  },
  messageDark: {
    color: "#9CA3AF",
  },
});
