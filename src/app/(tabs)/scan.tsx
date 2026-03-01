import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { SafeArea } from "@/src/components/SafeArea";

export default function Scan() {
  return (
    <SafeArea>
      <View style={styles.screen}>
        <Text style={styles.message}>Tap the center Scan button to open the scanner.</Text>
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
  message: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
  },
});
