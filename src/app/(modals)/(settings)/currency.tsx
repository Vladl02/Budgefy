import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SlidingSheet } from "@/src/components/SlidingSheet"; // Adjust path as needed
import { useSQLiteContext } from "expo-sqlite";
import {
  DEFAULT_BASE_CURRENCY,
  getBaseCurrencyPreference,
  setBaseCurrencyPreference,
} from "@/src/utils/preferences";

const CURRENCY_OPTIONS = [
  { code: "RON", name: "Romanian Leu" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
];

const CURRENCY_REGION_MAP: Record<string, string> = {
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  JPY: "JP",
  CAD: "CA",
  AUD: "AU",
  CHF: "CH",
  RON: "RO",
};

const toFlagEmoji = (regionCode: string): string =>
  String.fromCodePoint(
    ...regionCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0)),
  );

const currencyFlag = (currencyCode: string): string => {
  const regionCode = CURRENCY_REGION_MAP[currencyCode];
  if (!regionCode) return "🏳️";
  return toFlagEmoji(regionCode);
};

export default function LanguageScreen() {
  const router = useRouter();
  const dbExpo = useSQLiteContext();
  const [selectedCurrency, setSelectedCurrency] = useState(DEFAULT_BASE_CURRENCY);

  useEffect(() => {
    let isActive = true;
    const loadCurrentCurrency = async () => {
      try {
        const storedCurrency = await getBaseCurrencyPreference(dbExpo);
        if (isActive) {
          setSelectedCurrency(storedCurrency.toUpperCase());
        }
      } catch (error) {
        console.error("Failed to load base currency preference", error);
      }
    };

    void loadCurrentCurrency();
    return () => {
      isActive = false;
    };
  }, [dbExpo]);

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
              {CURRENCY_OPTIONS.map((option) => {
                const isActive = option.code === selectedCurrency;
                return (
                  <Pressable
                    key={option.code}
                    onPress={async () => {
                      const nextCurrency = option.code.toUpperCase();
                      setSelectedCurrency(nextCurrency);
                      try {
                        await setBaseCurrencyPreference(dbExpo, nextCurrency);
                      } catch (error) {
                        console.error("Failed to save base currency preference", error);
                      }
                      closeSheet(); // This triggers the animation, then calls handleDismiss
                    }}
                    style={[styles.row, isActive ? styles.rowActive : null]}
                  >
                    <Text style={styles.code}>{currencyFlag(option.code)} {option.code}</Text>
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
