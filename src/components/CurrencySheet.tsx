import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SlidingSheet } from "./SlidingSheet";
import { useAppTheme } from "@/src/providers/AppThemeProvider";

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
  const { isDark } = useAppTheme();
  const list = options ?? defaultOptions;

  if (!visible) {
    return null;
  }

  return (
    <SlidingSheet
      onDismiss={onDismiss}
      heightPercent={0.55}
      backdropOpacity={0.25}
      sheetStyle={isDark ? styles.sheetDark : undefined}
      handleStyle={isDark ? styles.handleDark : undefined}
    >
      {(close) => (
        <View style={[styles.container, isDark ? styles.containerDark : null]}>
          <Text style={[styles.title, isDark ? styles.titleDark : null]}>Select currency</Text>
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
                  style={[
                    styles.row,
                    isDark ? styles.rowDark : null,
                    isActive ? (isDark ? styles.rowActiveDark : styles.rowActive) : null,
                  ]}
                >
                  <Text style={[styles.code, isDark ? styles.codeDark : null]}>{option.code}</Text>
                  <Text style={[styles.name, isDark ? styles.nameDark : null]}>{option.name}</Text>
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
  sheetDark: {
    backgroundColor: "#0B0F14",
  },
  handleDark: {
    backgroundColor: "#4B5563",
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 12,
  },
  containerDark: {
    backgroundColor: "#0B0F14",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  titleDark: {
    color: "#F3F4F6",
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
  rowActiveDark: {
    backgroundColor: "#30401F",
    borderColor: "#5F6F2A",
  },
  rowDark: {
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#2F3A4A",
  },
  code: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  codeDark: {
    color: "#F3F4F6",
  },
  name: {
    fontSize: 13,
    color: "#4E4E4E",
  },
  nameDark: {
    color: "#9CA3AF",
  },
});
