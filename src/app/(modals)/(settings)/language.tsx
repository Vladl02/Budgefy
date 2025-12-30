import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SlidingSheet } from "@/src/components/SlidingSheet"; // Adjust path as needed

const LANGUAGE_OPTIONS = [
  { code: "ES", name: "Spanish" },
  { code: "EN", name: "English" },
  { code: "FR", name: "French" },
  { code: "DE", name: "German" },
  { code: "ZH", name: "Chinese" },
  { code: "JA", name: "Japanese" },
  { code: "RU", name: "Russian" },
  { code: "AR", name: "Arabic" },
  { code: "HI", name: "Hindi" },
  { code: "PT", name: "Portuguese" },
  { code: "IT", name: "Italian" },
  { code: "KO", name: "Korean" },
  { code: "NL", name: "Dutch" },
  { code: "SV", name: "Swedish" },
  { code: "TR", name: "Turkish" },
  { code: "PL", name: "Polish" },
  { code: "VI", name: "Vietnamese" },
  { code: "ID", name: "Indonesian" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
];

export default function LanguageScreen() {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState("EN");

  // This handles the physical closing of the router modal
  const handleDismiss = () => {
    router.back();
  };

  return (
    <View style={styles.screenWrapper}>
      <SlidingSheet 
        onDismiss={handleDismiss} 
        heightPercent={0.6} 
        backdropOpacity={0.4}
      >
        {(closeSheet) => (
          <View style={styles.container}>
            <Text style={styles.title}>Select currency</Text>
            
            <ScrollView 
              contentContainerStyle={styles.list} 
              showsVerticalScrollIndicator={false}
            >
              {LANGUAGE_OPTIONS.map((option) => {
                const isActive = option.code === selectedLanguage;
                return (
                  <Pressable
                    key={option.code}
                    onPress={() => {
                      setSelectedLanguage(option.code);
                      // Add your save logic here (e.g., AsyncStorage or Context)
                      closeSheet(); // This triggers the animation, then calls handleDismiss
                    }}
                    style={[styles.row, isActive ? styles.rowActive : null]}
                  >
                    <Text style={styles.code}>{option.code}</Text>
                    <Text style={styles.name}>{option.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </SlidingSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: "transparent", // Important: allows backdrop to see through to previous screen
  },
  container: {
    flex: 1, // Let container fill the sheet height
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40, 
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 20,
    textAlign: "center",
  },
  list: {
    gap: 10,
    paddingBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#F3F3F3",
  },
  rowActive: {
    backgroundColor: "#0e162136",
    borderWidth: 1,
    borderColor: "#0E1621",
  },
  code: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  name: {
    fontSize: 13,
    color: "#4E4E4E",
  },
});