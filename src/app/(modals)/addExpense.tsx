import { useNavigation } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { Check } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CurrencySheet } from "../../components/CurrencySheet";

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
  const navigation = useNavigation();
  const title = categoryName ?? "Shopping";
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [currency, setCurrency] = useState("RON");
  const keypadKeys = useMemo(
    () => ["7", "8", "9", "X", "4", "5", "6", "+/-", "1", "2", "3", "x/%", "CURRENCY", "0", ".", ">"],
    []
  );
  //const sheetHeight = useMemo(() => Math.round(Dimensions.get("window").height * 0.90), []);
  const sheetHeight = Dimensions.get("screen").height * 0.9;
  const translateY = useSharedValue(sheetHeight);

  const finishClose = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const parent = navigation.getParent();
    if (parent?.canGoBack()) {
      parent.goBack();
      return;
    }
    router.replace("/");
  }, [navigation]);

  const handleClose = useCallback(() => {
    translateY.value = withTiming(
      sheetHeight,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          scheduleOnRN(finishClose);
        }
      }
    );
  }, [finishClose, sheetHeight, translateY]);

  const handleOpenCurrencySheet = useCallback(() => {
    setCurrencySheetOpen(true);
  }, []);

  const handleDismissCurrencySheet = useCallback(() => {
    setCurrencySheetOpen(false);
  }, []);

  const handleSelectCurrency = useCallback((nextCurrency: string) => {
    setCurrency(nextCurrency);
  }, []);

  useEffect(() => {
    translateY.value = sheetHeight;
    requestAnimationFrame(() => {
      translateY.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
    });
  }, [sheetHeight, translateY]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      handleClose();
      return true;
    });

    return () => subscription.remove();
  }, [handleClose]);

  const panGesture = useMemo(() => {
    const closeThreshold = sheetHeight * 0.2;
    return Gesture.Pan()
      .onUpdate((event) => {
        translateY.value = Math.min(sheetHeight, Math.max(0, event.translationY));
      })
      .onEnd((event) => {
        const shouldClose = event.translationY > closeThreshold || event.velocityY > 1200;
        if (shouldClose) {
          translateY.value = withSpring(
            sheetHeight,
            {
              damping: 24,
              stiffness: 260,
              velocity: event.velocityY,
              overshootClamping: true,
            },
            (finished) => {
              if (finished) {
                scheduleOnRN(finishClose);
              }
            }
          );
        } else {
          translateY.value = withSpring(0, {
            damping: 24,
            stiffness: 260,
            velocity: event.velocityY,
            overshootClamping: true,
          });
        }
      });
  }, [finishClose, sheetHeight, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - Math.min(translateY.value / sheetHeight, 1)),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdropPressable} onPress={handleClose}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, { height: sheetHeight }, sheetStyle]}>
          <View style={styles.handleIndicator} />
          <View style={styles.topSection}>
            <View style={styles.header}>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeIcon}>X</Text>
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
              {keypadKeys.map((key) => {
                const isCurrencyKey = key === "CURRENCY";
                const isConfirmKey = key === ">";

                if (isCurrencyKey) {
                  return (
                    <Pressable
                      key={key}
                      style={[styles.key, styles.keyDouble]}
                      onPress={handleOpenCurrencySheet}
                    >
                      <Text style={styles.keyText}>{currency}</Text>
                      <Text style={styles.keySubText}>Currency</Text>
                    </Pressable>
                  );
                }

                return (
                  <View key={key} style={[styles.key, isConfirmKey ? styles.keyAccent : null]}>
                    {isConfirmKey ? (
                      <Check size={18} color={styles.keyTextAccent.color} />
                    ) : (
                      <Text style={[styles.keyText, isConfirmKey ? styles.keyTextAccent : null]}>
                        {key}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </GestureDetector>

      <CurrencySheet
        visible={currencySheetOpen}
        onDismiss={handleDismissCurrencySheet}
        onSelect={handleSelectCurrency}
        selectedCurrency={currency}
      />
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
    fontSize: 18,
    fontWeight: "700",
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
