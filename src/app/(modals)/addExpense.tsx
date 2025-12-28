import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo } from "react";
import { BackHandler, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

type ProgressBarProps = {
  spent: number;
  total: number;
};

function ProgressBar({ spent, total }: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 0;
  const safeSpent = Math.max(spent, 0);
  const clampedSpent = safeTotal > 0 ? Math.min(safeSpent, safeTotal) : 0;
  const remaining = Math.max(safeTotal - clampedSpent, 0);
  const percentSpent = safeTotal > 0 ? clampedSpent / safeTotal : 0;
  const percentLabel = Math.round(percentSpent * 100);
  const percentLeftLabel = 100 - percentLabel;

  return (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${percentSpent * 100}%` }]} />
      <View style={styles.progressContent}>
        <View style={styles.progressLeft}>
          <Text style={styles.progressAmount}>RON {clampedSpent}</Text>
          <Text style={styles.progressLabel}>{percentLabel}% Spent</Text>
        </View>
        <View style={styles.progressRight}>
          <Text style={styles.progressAmount}>RON {remaining}</Text>
          <Text style={styles.progressLabel}>{percentLeftLabel}% Left</Text>
        </View>
      </View>
    </View>
  );
}

export default function AddExpense() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const categoryName = Array.isArray(category) ? category[0] : category;
  const insets = useSafeAreaInsets();
  const title = categoryName ?? "Shopping";
  const sheetHeight = useMemo(() => Math.round(Dimensions.get("window").height * 0.90), []);
  const progress = useSharedValue(0);

  const handleClose = useCallback(() => {
    progress.value = withTiming(
      0,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        scheduleOnRN(() => {
          router.back();
        });
      }
    );
  }, [progress]);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      handleClose();
      return true;
    });

    return () => subscription.remove();
  }, [handleClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.35,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * sheetHeight }],
  }));

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdropPressable} onPress={handleClose}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>

      <Animated.View style={[styles.sheet, { height: sheetHeight }, sheetStyle]}>
        <View style={styles.handleIndicator} />
        <View style={styles.topSection}>
          <View style={styles.header}>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <ArrowLeft size={18} color={styles.closeIcon.color} />
            </Pressable>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.formArea}>
            <View style={styles.amountBox}>
              <Text style={styles.amountText}>RON0</Text>
            </View>
            <View style={styles.productBox}>
              <Text style={styles.productText}>Product Name</Text>
            </View>
          </View>
        </View>

        <View style={[styles.bottomSection, { paddingBottom: 20 + insets.bottom }]}>
          <ProgressBar spent={20} total={200} />

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
            {["7", "8", "9", "X", "4", "5", "6", "+/-", "1", "2", "3", "x/%", "RON", "0", ".", ">"].map(
              (key) => (
                <View
                  key={key}
                  style={[
                    styles.key,
                    key === ">" ? styles.keyAccent : null,
                    key === "RON" ? styles.keyDouble : null,
                  ]}
                >
                  {key === ">" ? (
                    <Check size={18} color={styles.keyTextAccent.color} />
                  ) : (
                    <Text style={[styles.keyText, key === ">" ? styles.keyTextAccent : null]}>
                      {key}
                    </Text>
                  )}
                  {key === "RON" ? <Text style={styles.keySubText}>RON</Text> : null}
                </View>
              )
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },
  handleIndicator: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#2B2B2B",
    marginTop: 8,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    flexGrow: 1,
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
    color: "#1F1F1F",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  headerSpacer: {
    width: 32,
  },
  formArea: {
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    flex: 1,
    justifyContent: "center",
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
    marginTop: "auto",
    backgroundColor: "#C9C9C9",
    paddingBottom: 16,
  },
  progressBar: {
    backgroundColor: "#F1D6D6",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#F6B3B3",
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  progressContent: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLeft: {
    alignItems: "flex-start",
  },
  progressRight: {
    alignItems: "flex-end",
  },
  progressAmount: {
    color: "#D63A3A",
    fontWeight: "700",
  },
  progressLabel: {
    color: "#D63A3A",
    fontSize: 12,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 5,
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
  tagText: {
    fontSize: 12,
    color: "#6D6D6D",
  },
  keypad: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 5,
    justifyContent: "space-between",
  },
  key: {
    width: "23%",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginBottom: 8,
  },
  keyDouble: {
    paddingVertical: 6,
  },
  keyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  keySubText: {
    fontSize: 11,
    color: "#666666",
  },
  keyAccent: {
    backgroundColor: "#5F6F2A",
  },
  keyTextAccent: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
