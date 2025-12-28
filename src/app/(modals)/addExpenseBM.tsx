import {
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import type { RefObject } from "react";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SNAP_POINTS = ["90%"];

type AddExpenseBottomSheetProps = {
  bottomSheetRef: RefObject<BottomSheetModal | null>;
  category: string | null;
  onClose: () => void;
  onDismiss: () => void;
};

export default function AddExpenseBottomSheet({
  bottomSheetRef,
  category,
  onClose,
  onDismiss,
}: AddExpenseBottomSheetProps) {
  const title = category ?? "Shopping";
  const insets = useSafeAreaInsets();

  


  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={SNAP_POINTS}
      index={0}
      enableDynamicSizing={false}
      enablePanDownToClose
      onDismiss={onDismiss}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* TOP */}
        <View style={styles.topSection}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <Text style={styles.closeIcon}>X</Text>
            </Pressable>

            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>

            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.formArea}>
            <View style={styles.amountBox}>
              <Text style={styles.amountText}>RON0</Text>
            </View>

            <View style={styles.productBox}>
              <Text style={styles.productText} numberOfLines={1}>
                Product Name
              </Text>
            </View>
          </View>
        </View>

        {/* Spacer that now actually grows */}
        <View style={{ flex: 1 }} />

        {/* BOTTOM */}
        <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.progressBar}>
            <View style={styles.progressLeft}>
              <Text style={styles.progressAmount}>RON25</Text>
              <Text style={styles.progressLabel}>25% Spent</Text>
            </View>

            <View style={styles.progressRight}>
              <Text style={styles.progressAmount}>RON75</Text>
              <Text style={styles.progressLabel}>75% Left</Text>
            </View>
          </View>

          <View style={styles.tagsRow}>
            <View style={[styles.tag, styles.tagMuted]}>
              <Text style={styles.tagText}>+</Text>
            </View>

            {["Tucano", "Careffour", "Esushi", "KFC", "Altex"].map((label) => (
              <View key={label} style={styles.tag}>
                <Text style={styles.tagText}>{label}</Text>
              </View>
            ))}

            <View style={[styles.tag, styles.tagMuted]}>
              <Text style={styles.tagText}>O</Text>
            </View>
          </View>

          <View style={styles.keypad}>
            {[
              "7","8","9","X",
              "4","5","6","+/-",
              "1","2","3","x/",
              "RON","0",".",">",
            ].map((key) => (
              <View
                key={key}
                style={[
                  styles.key,
                  key === ">" ? styles.keyAccent : null,
                  key === "RON" ? styles.keyDouble : null,
                ]}
              >
                <Text style={[styles.keyText, key === ">" ? styles.keyTextAccent : null]}>
                  {key}
                </Text>
                {key === "RON" ? <Text style={styles.keySubText}>RON</Text> : null}
              </View>
            ))}
          </View>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  handleIndicator: {
    backgroundColor: "#2B2B2B",
    width: 42,
  },

  // ⭐ the real key: forces the scroll view content to fill the 90% height
  contentContainer: {
    flexGrow: 1,
  },

  topSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
    maxWidth: "70%",
  },
  headerSpacer: {
    width: 32,
  },

  formArea: {
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
  },
  amountBox: {
    width: "78%",
    backgroundColor: "#EDEDED",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  amountText: {
    fontSize: 26,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  productBox: {
    width: "78%",
    backgroundColor: "#EDEDED",
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  productText: {
    fontSize: 14,
    color: "#555555",
  },

  bottomSection: {
    backgroundColor: "#C9C9C9",
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },

  progressBar: {
    backgroundColor: "#F6B3B3",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLeft: { alignItems: "flex-start" },
  progressRight: { alignItems: "flex-end" },
  progressAmount: { color: "#D63A3A", fontWeight: "700" },
  progressLabel: { color: "#D63A3A", fontSize: 12 },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  tag: {
    backgroundColor: "#E8E8E8",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagMuted: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#B8B8B8",
    backgroundColor: "transparent",
  },
  tagText: { fontSize: 12, color: "#6D6D6D" },

  keypad: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  key: {
    width: "23%",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginBottom: 8,
  },
  keyDouble: { paddingVertical: 6 },
  keyText: { fontSize: 16, fontWeight: "600", color: "#1F1F1F" },
  keySubText: { fontSize: 11, color: "#666666" },
  keyAccent: { backgroundColor: "#5F6F2A" },
  keyTextAccent: { color: "#FFFFFF", fontWeight: "700" },
});

