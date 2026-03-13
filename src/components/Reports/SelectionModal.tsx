import React from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Check, X } from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SlidingSheet } from "@/src/components/SlidingSheet";

interface SelectionModalProps {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  variant?: "default" | "category" | "currency";
  accentMap?: Record<string, string>;
  onClose: () => void;
  onSelect: (value: string) => void;
}

const SelectionModal = ({ visible, title, options, selected, variant = "default", accentMap, onClose, onSelect }: SelectionModalProps) => {
  const insets = useSafeAreaInsets();
  const isCategorySheet = variant === "category";
  const isCurrencySheet = variant === "currency";
  const categoryAccents: Record<string, string> = {
    Groceries: "#22C55E",
    Tech: "#3B82F6",
    Transport: "#F59E0B",
    Bills: "#EF4444",
    Wholesale: "#14B8A6",
    General: "#8B5CF6",
  };
  const currencyAccents: Record<string, string> = {
    USD: "#2563EB",
    EUR: "#7C3AED",
    RON: "#0891B2",
    GBP: "#16A34A",
  };
  const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "EUR",
    RON: "RON",
    GBP: "GBP",
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={selectionStyles.modalRoot}>
        <SlidingSheet
          onDismiss={onClose}
          fitContent
          maxHeightPercent={0.78}
          backdropOpacity={0.35}
          sheetStyle={selectionStyles.sheet}
          handleStyle={selectionStyles.handle}
        >
          {(close) => (
            <View style={[selectionStyles.content, { paddingBottom: Math.max(34, insets.bottom + 16) }]}>
              <View style={selectionStyles.header}>
                <Text style={selectionStyles.title}>{title}</Text>
                <TouchableOpacity onPress={close}>
                  <X size={24} color="#000" />
                </TouchableOpacity>
              </View>
              {isCategorySheet && <Text style={selectionStyles.subtitle}>Choose a category for this receipt</Text>}
              {isCurrencySheet && <Text style={selectionStyles.subtitle}>Choose a currency for this receipt</Text>}
              <ScrollView style={selectionStyles.optionsScroll} contentContainerStyle={selectionStyles.optionsScrollContent}>
                {isCategorySheet || isCurrencySheet ? (
                  <View style={selectionStyles.categoryGrid}>
                    {options.map((opt: string) => {
                      const isSelected = selected === opt;
                      const accent = isCategorySheet
                        ? accentMap?.[opt] ?? categoryAccents[opt] ?? "#8E8E93"
                        : currencyAccents[opt] ?? "#8E8E93";

                      return (
                        <TouchableOpacity
                          key={opt}
                          style={[selectionStyles.categoryChip, isSelected && selectionStyles.categoryChipSelected]}
                          onPress={() => {
                            onSelect(opt);
                            close();
                          }}
                        >
                          <View style={[selectionStyles.categoryDot, { backgroundColor: accent }]} />
                          <View style={selectionStyles.categoryChipTextWrap}>
                            <Text
                              style={[
                                selectionStyles.categoryChipText,
                                isSelected && selectionStyles.categoryChipTextSelected,
                              ]}
                            >
                              {opt}
                            </Text>
                            {isCurrencySheet ? (
                              <Text style={selectionStyles.categoryChipMeta}>{currencySymbols[opt] ?? opt}</Text>
                            ) : null}
                          </View>
                          {isSelected ? (
                            <View style={selectionStyles.categoryCheckWrap}>
                              <Check size={14} color="#111" strokeWidth={3} />
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  options.map((opt: string) => (
                    <TouchableOpacity
                      key={opt}
                      style={[selectionStyles.option, selected === opt && selectionStyles.selectedOption]}
                      onPress={() => {
                        onSelect(opt);
                        close();
                      }}
                    >
                      <Text style={[selectionStyles.optionText, selected === opt && selectionStyles.selectedOptionText]}>
                        {opt}
                      </Text>
                      {selected === opt && <Check size={20} color="#ffffff" />}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </SlidingSheet>
      </GestureHandlerRootView>
    </Modal>
  );
};

const selectionStyles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  content: {
    padding: 24,
    paddingBottom: 34,
  },
  handle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D4D4D8",
    marginBottom: 16,
  },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, alignItems: "center" },
  title: { fontSize: 20, fontWeight: "800", color: "#111" },
  subtitle: { fontSize: 13, color: "#71717A", marginBottom: 16, fontWeight: "600" },
  optionsScroll: {
    maxHeight: 420,
  },
  optionsScrollContent: {
    paddingBottom: 8,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#F1F1F3",
    marginBottom: 10,
  },
  selectedOption: { backgroundColor: "#000000", borderColor: "#000000" },
  optionText: { fontSize: 16, color: "#333", fontWeight: "600" },
  selectedOptionText: { color: "#ffffff", fontWeight: "600" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryChip: {
    width: "48.5%",
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#ECECF1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryChipSelected: {
    backgroundColor: "#EEF4FF",
    borderColor: "#111",
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 10,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  categoryChipTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  categoryChipTextSelected: {
    color: "#111",
  },
  categoryChipMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
  categoryCheckWrap: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D4D4D8",
  },
});

export { SelectionModal };
