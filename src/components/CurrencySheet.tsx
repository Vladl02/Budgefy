import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SlidingSheet } from "./SlidingSheet";

type CurrencyOption = {
  code: string;
  name: string;
};

type CurrencySheetProps = {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (currency: string) => void;
  selectedCurrency: string;
  options?: CurrencyOption[];
};

const defaultOptions: CurrencyOption[] = [
  { code: "RON", name: "Romanian Leu" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
];

export function CurrencySheet({
  visible,
  onDismiss,
  onSelect,
  selectedCurrency,
  options,
}: CurrencySheetProps) {
  const list = options ?? defaultOptions;

  if (!visible) {
    return null;
  }

  return (
    <SlidingSheet onDismiss={onDismiss} heightPercent={0.55} backdropOpacity={0.25}>
      {(close) => (
        <View style={styles.container}>
          <Text style={styles.title}>Select currency</Text>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {list.map((option) => {
              const isActive = option.code === selectedCurrency;
              return (
                <Pressable
                  key={option.code}
                  onPress={() => {
                    onSelect(option.code);
                    close();
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
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  list: {
    gap: 10,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F3F3F3",
  },
  rowActive: {
    backgroundColor: "#DCE8C9",
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
