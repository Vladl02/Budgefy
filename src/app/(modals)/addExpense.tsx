import { CurrencySheet } from "@/src/components/CurrencySheet";
import { TagSearchModal } from "@/src/components/TagSearchModal";
import { ProgressBar } from "@/src/components/addExpense/ProgressBar";
import { useRecommendationStore } from "@/src/providers/RecommendationStoreProvider";
import {
  createRecommendationKey,
  DEFAULT_SHOP_OPTIONS,
  DEFAULT_SUBCATEGORY_OPTIONS,
  getCachedCategoryColor,
  getCachedRecommendationNames,
  normalizeRecommendationName,
  setCachedRecommendationNames,
} from "@/src/utils/recommendations";
import { useNavigation } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Check, Delete, Equal } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, Dimensions, InteractionManager, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useAppTheme } from "../../providers/AppThemeProvider";

type CalcOperator = "add" | "subtract" | "multiply" | "divide";
const KEYPAD_KEYS = [
  "7",
  "8",
  "9",
  "X",
  "4",
  "5",
  "6",
  "+/-",
  "1",
  "2",
  "3",
  "*/%",
  "CURRENCY",
  "0",
  ".",
  ">",
] as const;

const withAlpha = (color: string, alpha: number): string => {
  const normalized = color.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return color;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const findCaseInsensitiveMatch = (options: string[], value: string): string | null => {
  const normalizedValue = normalizeRecommendationName(value);
  for (const option of options) {
    if (normalizeRecommendationName(option) === normalizedValue) {
      return option;
    }
  }
  return null;
};

const formatValue = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0";
  }
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return rounded.toFixed(2).replace(/\.?0+$/, "");
};

const applyOperation = (left: number, operator: CalcOperator, right: number): number => {
  switch (operator) {
    case "add":
      return left + right;
    case "subtract":
      return left - right;
    case "multiply":
      return left * right;
    case "divide":
      return right === 0 ? left : left / right;
    default:
      return left;
  }
};

const resolveOperation = (key: string, currentOperator: CalcOperator | null): CalcOperator | null => {
  if (key === "+/-") {
    return currentOperator === "add" ? "subtract" : "add";
  }
  if (key === "*/%") {
    return currentOperator === "multiply" ? "divide" : "multiply";
  }
  return null;
};

const getOperatorSymbol = (operator: CalcOperator | null): string => {
  switch (operator) {
    case "add":
      return "+";
    case "subtract":
      return "-";
    case "multiply":
      return "x";
    case "divide":
      return "/";
    default:
      return "";
  }
};

export default function AddExpense() {
  const { isDark } = useAppTheme();
  const { cacheVersion } = useRecommendationStore();
  const { category, categoryUserId, categoryId } = useLocalSearchParams<{
    category?: string;
    categoryUserId?: string;
    categoryId?: string;
  }>();
  const categoryName = Array.isArray(category) ? category[0] : category;
  const categoryUserIdParam = Array.isArray(categoryUserId) ? categoryUserId[0] : categoryUserId;
  const categoryIdParam = Array.isArray(categoryId) ? categoryId[0] : categoryId;
  const parsedCategoryUserId = categoryUserIdParam ? Number(categoryUserIdParam) : NaN;
  const parsedCategoryId = categoryIdParam ? Number(categoryIdParam) : NaN;

  const dbExpo = useSQLiteContext();
  const selectedCategoryUserId =
    Number.isInteger(parsedCategoryUserId) && parsedCategoryUserId > 0
      ? parsedCategoryUserId
      : null;
  const selectedCategoryId =
    Number.isInteger(parsedCategoryId) && parsedCategoryId > 0
      ? parsedCategoryId
      : null;
  const resolvedCategoryName = categoryName;
  const selectedCategoryColor = getCachedCategoryColor({
    categoryId: selectedCategoryId,
    userId: selectedCategoryUserId,
    categoryName: resolvedCategoryName ?? null,
  });
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const title = resolvedCategoryName ?? "Unknown";
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [currency, setCurrency] = useState("RON");
  const [readyCalcState, setReadyCalcState] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [storedDisplay, setStoredDisplay] = useState("");
  const [pendingOperator, setPendingOperator] = useState<CalcOperator | null>(null);
  const [productName, setProductName] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedShopName, setSelectedShopName] = useState<string | null>(null);
  const [pendingNewSubcategory, setPendingNewSubcategory] = useState<string | null>(null);
  const [pendingNewShopName, setPendingNewShopName] = useState<string | null>(null);
  const [subcategoryOptions, setSubcategoryOptions] = useState<string[]>([]);
  const [shopOptions, setShopOptions] = useState<string[]>([]);
  const [activePicker, setActivePicker] = useState<"subcategory" | "shop" | null>(null);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const isSavingExpenseRef = useRef(false);

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

  const handleOpenCurrencySheet = () => {
    setCurrencySheetOpen(true);
  };

  const handleDismissCurrencySheet = () => {
    setCurrencySheetOpen(false);
  };

  const handleSelectCurrency = (nextCurrency: string) => {
    setCurrency(nextCurrency);
  };

  const operatorSymbol = getOperatorSymbol(pendingOperator);
  const displayValue = (() => {
    const left = storedDisplay !== "" ? storedDisplay : storedValue !== null ? String(storedValue) : "";
    if (pendingOperator && storedValue !== null) {
      if (inputValue !== "") {
        return `${left}${operatorSymbol}${inputValue}`;
      }
      return `${left}${operatorSymbol}`.trim();
    }
    if (inputValue !== "") return inputValue;
    if (storedValue !== null) return left;
    return "0";
  })();

  const handleDigitPress = (digit: string) => {
    setInputValue((prev) => {
      let next = prev;
      if (digit === ".") {
        if (next === "") return "0.";
        if (next.includes(".")) return next;
        return `${next}.`;
      }
      if (next === "0") return digit;
      return `${next}${digit}`;
    });
  };

  const handleBackspace = () => {
    if (inputValue !== "") {
      setInputValue((prev) => {
        if (prev === "") return prev;
        const trimmed = prev.slice(0, -1);
        if (trimmed === "-" || trimmed === "") return "";
        return trimmed;
      });
      return;
    }

    if (pendingOperator) {
      const fallback =
        storedDisplay !== "" ? storedDisplay : storedValue !== null ? String(storedValue) : "";
      setPendingOperator(null);
      setReadyCalcState(true);
      if (fallback !== "") {
        setInputValue(fallback);
        setStoredValue(null);
        setStoredDisplay("");
      }
    }
  };

  const handleOperationPress = (key: string) => {
    const nextOperator = resolveOperation(key, pendingOperator);
    if (!nextOperator) return;

    const hasInput = inputValue !== "";
    if (storedValue === null) {
      if (!hasInput) return;
      setStoredValue(Number(inputValue));
      setStoredDisplay(inputValue);
      setInputValue("");
      setPendingOperator(nextOperator);
      setReadyCalcState(false);
      return;
    }

    if (!pendingOperator) {
      if (hasInput) {
        setStoredValue(Number(inputValue));
        setStoredDisplay(inputValue);
        setInputValue("");
      }
      setPendingOperator(nextOperator);
      setReadyCalcState(false);
      return;
    }

    if (!hasInput) {
      setPendingOperator(nextOperator);
      setReadyCalcState(false);
      return;
    }

    const result = applyOperation(storedValue, pendingOperator, Number(inputValue));
    setStoredValue(result);
    setStoredDisplay(formatValue(result));
    setInputValue("");
    setPendingOperator(nextOperator);
    setReadyCalcState(false);
  };

  const handleEqualsPress = () => {
    if (!pendingOperator || storedValue === null || inputValue === "") return;
    const result = applyOperation(storedValue, pendingOperator, Number(inputValue));
    setStoredValue(null);
    setStoredDisplay("");
    setPendingOperator(null);
    setInputValue(formatValue(result));
    setReadyCalcState(true);
  };
  useEffect(() => {
    translateY.value = sheetHeight;
    requestAnimationFrame(() => {
      translateY.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
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
      .activeOffsetY([-10, 10])
      .failOffsetX([-10, 10])
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

  const recommendationUserId = selectedCategoryUserId;
  const recommendationCategoryName = resolvedCategoryName ?? null;
  const recommendationContextKey =
    recommendationUserId && recommendationCategoryName
      ? createRecommendationKey(recommendationUserId, recommendationCategoryName)
      : null;

  useEffect(() => {
    setSelectedSubcategory(null);
    setSelectedShopName(null);
    setPendingNewSubcategory(null);
    setPendingNewShopName(null);
  }, [recommendationContextKey]);

  useEffect(() => {
    if (!recommendationContextKey) {
      setSubcategoryOptions(DEFAULT_SUBCATEGORY_OPTIONS);
      setShopOptions(DEFAULT_SHOP_OPTIONS);
      return;
    }

    const cachedSubcategories = getCachedRecommendationNames("subcategory", recommendationContextKey);
    const cachedShops = getCachedRecommendationNames("shop", recommendationContextKey);

    setSubcategoryOptions(
      cachedSubcategories && cachedSubcategories.length > 0
        ? cachedSubcategories
        : DEFAULT_SUBCATEGORY_OPTIONS,
    );
    setShopOptions(
      cachedShops && cachedShops.length > 0
        ? cachedShops
        : DEFAULT_SHOP_OPTIONS,
    );
  }, [cacheVersion, recommendationContextKey]);

  const displayedSubcategoryOptions = (() => {
    if (!pendingNewSubcategory) return subcategoryOptions;
    if (findCaseInsensitiveMatch(subcategoryOptions, pendingNewSubcategory)) {
      return subcategoryOptions;
    }
    return [pendingNewSubcategory, ...subcategoryOptions];
  })();
  const displayedShopOptions = (() => {
    if (!pendingNewShopName) return shopOptions;
    if (findCaseInsensitiveMatch(shopOptions, pendingNewShopName)) {
      return shopOptions;
    }
    return [pendingNewShopName, ...shopOptions];
  })();
  const subcategoryPickerItems =
    displayedSubcategoryOptions.length > 0
      ? displayedSubcategoryOptions
      : DEFAULT_SUBCATEGORY_OPTIONS;
  const shopPickerItems =
    displayedShopOptions.length > 0
      ? displayedShopOptions
      : DEFAULT_SHOP_OPTIONS;

  const progressFillColor = selectedCategoryColor ?? "#36A8FF";
  const progressTrackColor = withAlpha(progressFillColor, 0.35);

  const visibleSubcategories = displayedSubcategoryOptions.slice(0, 5);
  const visibleShopNames = displayedShopOptions.slice(0, 5);

  const upsertSubcategoryPreset = async (value: string, markAsUsed: boolean) => {
    if (!recommendationUserId || !recommendationCategoryName) return;

    const trimmed = value.trim().replace(/\s+/g, " ");
    if (!trimmed) return;

    const normalizedName = normalizeRecommendationName(trimmed);
    const now = Date.now();

    if (markAsUsed) {
      await dbExpo.runAsync(
        `INSERT INTO subcategory_presets
          (user_id, category_name, name, normalized_name, use_count, last_used_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?)
         ON CONFLICT(user_id, category_name, normalized_name)
         DO UPDATE SET
           name = excluded.name,
           use_count = subcategory_presets.use_count + 1,
           last_used_at = excluded.last_used_at,
           is_archived = 0,
           updated_at = excluded.updated_at`,
        [
          recommendationUserId,
          recommendationCategoryName,
          trimmed,
          normalizedName,
          now,
          now,
          now,
        ],
      );
      return;
    }

    await dbExpo.runAsync(
      `INSERT INTO subcategory_presets
        (user_id, category_name, name, normalized_name, use_count, last_used_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, NULL, ?, ?)
       ON CONFLICT(user_id, category_name, normalized_name)
       DO UPDATE SET
         name = excluded.name,
         is_archived = 0,
         updated_at = excluded.updated_at`,
      [
        recommendationUserId,
        recommendationCategoryName,
        trimmed,
        normalizedName,
        now,
        now,
      ],
    );
  };

  const upsertShopPreset = async (value: string, markAsUsed: boolean) => {
    if (!recommendationUserId || !recommendationCategoryName) return;

    const trimmed = value.trim().replace(/\s+/g, " ");
    if (!trimmed) return;

    const normalizedName = normalizeRecommendationName(trimmed);
    const now = Date.now();

    if (markAsUsed) {
      await dbExpo.runAsync(
        `INSERT INTO shop_presets
          (user_id, category_name, name, normalized_name, use_count, last_used_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?)
         ON CONFLICT(user_id, category_name, normalized_name)
         DO UPDATE SET
           name = excluded.name,
           use_count = shop_presets.use_count + 1,
           last_used_at = excluded.last_used_at,
           is_archived = 0,
           updated_at = excluded.updated_at`,
        [
          recommendationUserId,
          recommendationCategoryName,
          trimmed,
          normalizedName,
          now,
          now,
          now,
        ],
      );
      return;
    }

    await dbExpo.runAsync(
      `INSERT INTO shop_presets
        (user_id, category_name, name, normalized_name, use_count, last_used_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, NULL, ?, ?)
       ON CONFLICT(user_id, category_name, normalized_name)
       DO UPDATE SET
         name = excluded.name,
         is_archived = 0,
         updated_at = excluded.updated_at`,
      [
        recommendationUserId,
        recommendationCategoryName,
        trimmed,
        normalizedName,
        now,
        now,
      ],
    );
  };

  const addSubcategoryToStateAndCache = (value: string) => {
    const trimmed = value.trim().replace(/\s+/g, " ");
    if (!trimmed) return;

    setSubcategoryOptions((prev) => {
      const exists = findCaseInsensitiveMatch(prev, trimmed);
      if (exists) return prev;
      const next = [trimmed, ...prev];
      if (recommendationContextKey) {
        setCachedRecommendationNames("subcategory", recommendationContextKey, next);
      }
      return next;
    });
  };

  const addShopToStateAndCache = (value: string) => {
    const trimmed = value.trim().replace(/\s+/g, " ");
    if (!trimmed) return;

    setShopOptions((prev) => {
      const exists = findCaseInsensitiveMatch(prev, trimmed);
      if (exists) return prev;
      const next = [trimmed, ...prev];
      if (recommendationContextKey) {
        setCachedRecommendationNames("shop", recommendationContextKey, next);
      }
      return next;
    });
  };

  const handleSelectSubcategory = (value: string) => {
    setSelectedSubcategory(value);
    if (
      pendingNewSubcategory &&
      normalizeRecommendationName(pendingNewSubcategory) !== normalizeRecommendationName(value)
    ) {
      setPendingNewSubcategory(null);
    }
  };

  const handleSelectShop = (value: string) => {
    setSelectedShopName(value);
    if (
      pendingNewShopName &&
      normalizeRecommendationName(pendingNewShopName) !== normalizeRecommendationName(value)
    ) {
      setPendingNewShopName(null);
    }
  };

  const handleAddSubcategory = (value: string) => {
    const trimmed = value.trim().replace(/\s+/g, " ");
    if (!trimmed) return;

    const existing = findCaseInsensitiveMatch(subcategoryOptions, trimmed);
    if (existing) {
      setSelectedSubcategory(existing);
      setPendingNewSubcategory(null);
      return;
    }

    setPendingNewSubcategory(trimmed);
    setSelectedSubcategory(trimmed);
  };

  const handleAddShopName = (value: string) => {
    const trimmed = value.trim().replace(/\s+/g, " ");
    if (!trimmed) return;

    const existing = findCaseInsensitiveMatch(shopOptions, trimmed);
    if (existing) {
      setSelectedShopName(existing);
      setPendingNewShopName(null);
      return;
    }

    setPendingNewShopName(trimmed);
    setSelectedShopName(trimmed);
  };

  const handleSubmitExpense = async () => {
    if (isSavingExpenseRef.current) return;
    if (!selectedCategoryUserId) {
      console.error("Cannot save expense: missing categoryUserId");
      Alert.alert("Could not save", "Missing category user. Reopen the modal and try again.");
      return;
    }

    const parsedAmount = Number.parseFloat(displayValue.replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    const amountInCents = Math.round((parsedAmount + Number.EPSILON) * 100);
    const marketName = selectedShopName?.trim() || null;
    const trimmedProductName = productName.trim();
    const representativeProductName = trimmedProductName || "Manual entry";
    const isPlaceholderProduct = trimmedProductName ? 0 : 1;
    const selectedSubcategorySnapshot = selectedSubcategory;
    const selectedShopNameSnapshot = selectedShopName;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    isSavingExpenseRef.current = true;
    setIsSavingExpense(true);
    setPendingNewSubcategory(null);
    setPendingNewShopName(null);
    handleClose();

    InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          let resolvedCategoryId = selectedCategoryId;

          if (!resolvedCategoryId && resolvedCategoryName) {
            const categoryRow = await dbExpo.getFirstAsync<{ id: number }>(
              `SELECT id
               FROM categories
               WHERE user_id = ? AND category_name = ? AND month_start = ?
               LIMIT 1`,
              [selectedCategoryUserId, resolvedCategoryName, monthStart],
            );
            resolvedCategoryId = categoryRow?.id ?? null;
          }

          if (!resolvedCategoryId) {
            console.error("Cannot save expense: category id could not be resolved");
            return;
          }

          const paymentResult = await dbExpo.runAsync(
            `INSERT INTO payments (sum, market_name, source_type, user_id, category_id, timed_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [amountInCents, marketName, "manual", selectedCategoryUserId, resolvedCategoryId, Math.floor(Date.now() / 1000)],
          );

          const paymentId = Number(paymentResult.lastInsertRowId);
          if (!Number.isFinite(paymentId) || paymentId <= 0) {
            throw new Error("Failed to resolve inserted payment id");
          }

          await dbExpo.runAsync(
            `INSERT INTO products (name, price, category_id, origin_type, is_placeholder, user_id, payment_id, first_subcategory, other_subcategories)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              representativeProductName,
              amountInCents,
              resolvedCategoryId,
              "manual",
              isPlaceholderProduct,
              selectedCategoryUserId,
              paymentId,
              selectedSubcategorySnapshot ?? null,
              null,
            ],
          );

          if (selectedSubcategorySnapshot || selectedShopNameSnapshot) {
            try {
              await Promise.all([
                selectedSubcategorySnapshot
                  ? upsertSubcategoryPreset(selectedSubcategorySnapshot, true)
                  : Promise.resolve(),
                selectedShopNameSnapshot
                  ? upsertShopPreset(selectedShopNameSnapshot, true)
                  : Promise.resolve(),
              ]);
              if (selectedSubcategorySnapshot) {
                addSubcategoryToStateAndCache(selectedSubcategorySnapshot);
              }
              if (selectedShopNameSnapshot) {
                addShopToStateAndCache(selectedShopNameSnapshot);
              }
            } catch (presetError) {
              console.error("Failed to update recommendation presets:", presetError);
            }
          }
        } catch (error) {
          console.error("Failed to save expense:", error);
        } finally {
          isSavingExpenseRef.current = false;
          setIsSavingExpense(false);
        }
      })();
    });
  };

  const handleKeyPress = (key: string) => {
    if (key === "CURRENCY") {
      handleOpenCurrencySheet();
      return;
    }
    if (key === ">") {
      if (readyCalcState) {
        void handleSubmitExpense();
        return;
      }
      handleEqualsPress();
      return;
    }
    if (key === "X") {
      handleBackspace();
      return;
    }
    if (key === "+/-" || key === "x/%" || key === "*/%") {
      handleOperationPress(key);
      return;
    }
    if (/^\d$/.test(key) || key === ".") {
      handleDigitPress(key);
    }
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdropPressable} onPress={handleClose}>
        <Animated.View style={[styles.backdrop, isDark ? styles.backdropDark : null, backdropStyle]} />
      </Pressable>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, isDark ? styles.sheetDark : null, { height: sheetHeight }, sheetStyle]}>
          <View style={[styles.handleIndicator, isDark ? styles.handleIndicatorDark : null]} />
          <View style={[styles.topSection, isDark ? styles.topSectionDark : null]}>
            <View style={[styles.header, isDark ? styles.headerDark : null]}>
              <Pressable onPress={handleClose} style={[styles.closeButton, isDark ? styles.closeButtonDark : null]}>
                <Text style={[styles.closeIcon, isDark ? styles.closeIconDark : null]}>X</Text>
              </Pressable>
              <Text style={[styles.headerTitle, isDark ? styles.headerTitleDark : null]}>{title}</Text>
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.formArea}>
              <View style={[styles.amountBox, isDark ? styles.amountBoxDark : null]}>
                <Text style={[styles.amountText, isDark ? styles.amountTextDark : null]}>RON {displayValue}</Text>
              </View>
              <View style={[styles.productBox, isDark ? styles.productBoxDark : null]}>
                <TextInput
                  value={productName}
                  onChangeText={setProductName}
                  placeholder="Product Name"
                  placeholderTextColor={isDark ? "#9CA3AF" : "#777777"}
                  style={[styles.productInput, isDark ? styles.productInputDark : null]}
                />
              </View>
            </View>
          </View>

          <View style={[styles.bottomSection, isDark ? styles.bottomSectionDark : null, { paddingBottom: 20 + insets.bottom }]}>
            <ProgressBar
              spent={20}
              total={200}
              trackColor={progressTrackColor}
              fillColor={progressFillColor}
              labelColor={progressFillColor}
              leftLabelColor="#FFFFFF"
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsRow}
              contentContainerStyle={styles.tagsRowContent}
            >
              <Pressable
                style={[styles.tag, isDark ? styles.tagDark : null, styles.tagMuted, isDark ? styles.tagMutedDark : null]}
                onPress={() => setActivePicker("subcategory")}
              >
                <Text style={[styles.tagText, isDark ? styles.tagTextDark : null]}>+</Text>
              </Pressable>
              {visibleSubcategories.map((label, index) => (
                <Pressable
                  key={`${label}-${index}`}
                  style={[
                    styles.tag,
                    isDark ? styles.tagDark : null,
                    selectedSubcategory === label ? styles.tagSelected : null,
                  ]}
                  onPress={() => handleSelectSubcategory(label)}
                >
                  <Text
                    style={[
                      styles.tagText,
                      isDark ? styles.tagTextDark : null,
                      selectedSubcategory === label ? styles.tagTextSelected : null,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={[styles.tagsDivider, isDark ? styles.tagsDividerDark : null]} />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsRow}
              contentContainerStyle={styles.tagsRowContent}
            >
              <Pressable
                style={[styles.tag, isDark ? styles.tagDark : null, styles.tagMuted, isDark ? styles.tagMutedDark : null]}
                onPress={() => setActivePicker("shop")}
              >
                <Text style={[styles.tagText, isDark ? styles.tagTextDark : null]}>+</Text>
              </Pressable>
              {visibleShopNames.map((label, index) => (
                <Pressable
                  key={`${label}-${index}`}
                  style={[
                    styles.tag,
                    isDark ? styles.tagDark : null,
                    selectedShopName === label ? styles.tagSelected : null,
                  ]}
                  onPress={() => handleSelectShop(label)}
                >
                  <Text
                    style={[
                      styles.tagText,
                      isDark ? styles.tagTextDark : null,
                      selectedShopName === label ? styles.tagTextSelected : null,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={[styles.keypad, isDark ? styles.keypadDark : null]}>
              {KEYPAD_KEYS.map((key) => {
                const isCurrencyKey = key === "CURRENCY";
                const isConfirmKey = key === ">";
                const isConfirmDisabled = isConfirmKey && isSavingExpense;
                const displayLabel = key === "*/%" ? "x/" : key;

                if (isCurrencyKey) {
                  return (
                    <Pressable
                      key={key}
                      style={[styles.key, isDark ? styles.keyDark : null, styles.keyDouble]}
                      onPress={() => handleKeyPress(key)}
                    >
                      <Text style={[styles.keyText, isDark ? styles.keyTextDark : null]}>{currency}</Text>
                      <Text style={[styles.keySubText, isDark ? styles.keySubTextDark : null]}>Currency</Text>
                    </Pressable>
                  );
                }

                return (
                  <Pressable
                    key={key}
                    onPress={() => handleKeyPress(key)}
                    disabled={isConfirmDisabled}
                    style={[
                      styles.key,
                      isDark ? styles.keyDark : null,
                      isConfirmKey ? styles.keyAccent : null,
                      isConfirmDisabled ? styles.keyDisabled : null,
                    ]}
                  >
                    {isConfirmKey ? (
                      isSavingExpense ? (
                        <ActivityIndicator size="small" color={styles.keyTextAccent.color} />
                      ) : readyCalcState ? (
                        <Check size={18} color={styles.keyTextAccent.color} />
                      ) : (
                        <Equal size={18} color={styles.keyTextAccent.color} />
                      )
                    ) : key === "X" ? (
                      <Delete size={18} color={isDark ? "#F3F4F6" : "#1F1F1F"} />
                    ) : (
                      <Text style={[styles.keyText, isDark ? styles.keyTextDark : null, isConfirmKey ? styles.keyTextAccent : null]}>
                        {displayLabel}
                      </Text>
                    )}
                  </Pressable>
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

      <TagSearchModal
        visible={activePicker === "subcategory"}
        title="Add subcategory"
        items={subcategoryPickerItems}
        placeholder="Search subcategories"
        onAdd={handleAddSubcategory}
        onDismiss={() => setActivePicker(null)}
      />
      <TagSearchModal
        visible={activePicker === "shop"}
        title="Add shop"
        items={shopPickerItems}
        placeholder="Search shops"
        onAdd={handleAddShopName}
        onDismiss={() => setActivePicker(null)}
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
  backdropDark: {
    backgroundColor: "#000000",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },
  sheetDark: {
    backgroundColor: "#0B0F14",
  },
  handleIndicator: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#2B2B2B",
    marginTop: 8,
  },
  handleIndicatorDark: {
    backgroundColor: "#4B5563",
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    flexGrow: 1,
  },
  topSectionDark: {
    backgroundColor: "#0B0F14",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
  },
  headerDark: {
    backgroundColor: "#0B0F14",
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonDark: {
    borderRadius: 10,
    backgroundColor: "#1F2937",
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  closeIconDark: {
    color: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  headerTitleDark: {
    color: "#F3F4F6",
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
  amountBoxDark: {
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#374151",
  },
  amountText: {
    fontSize: 26,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  amountTextDark: {
    color: "#F9FAFB",
  },
  productBox: {
    width: "78%",
    backgroundColor: "#EDEDED",
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  productBoxDark: {
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#374151",
  },
  productInput: {
    width: "100%",
    textAlign: "center",
    fontSize: 14,
    color: "#555555",
  },
  productInputDark: {
    color: "#E5E7EB",
  },
  bottomSection: {
    marginTop: "auto",
    backgroundColor: "#ffffffff",
    paddingBottom: 16,
  },
  bottomSectionDark: {
    backgroundColor: "#0B0F14",
  },
  progressBar: {
    backgroundColor: "#F1D6D6",
    paddingVertical: 6,
    paddingHorizontal: 12,
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
    marginTop: 4,
    marginBottom: 4,
  },
  tagsRowContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  tagsDivider: {
    height: 1,
    backgroundColor: "#C6C6C6",
    marginHorizontal: 0,
    opacity: 0.9,
  },
  tagsDividerDark: {
    backgroundColor: "#374151",
  },
  tag: {
    backgroundColor: "#E8E8E8",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tagDark: {
    backgroundColor: "#1F2937",
  },
  tagMuted: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#B8B8B8",
    backgroundColor: "transparent",
  },
  tagMutedDark: {
    borderColor: "#4B5563",
  },
  tagSelected: {
    backgroundColor: "#5F6F2A",
  },
  tagText: {
    fontSize: 12,
    color: "#6D6D6D",
    textAlign: "center",
  },
  tagTextDark: {
    color: "#D1D5DB",
  },
  tagTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 5,
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingTop: 8,
  },
  keypadDark: {
    backgroundColor: "#0B0F14",
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
  keyDark: {
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#2F3A4A",
  },
  keyDouble: {
    paddingVertical: 6,
  },
  keyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  keyTextDark: {
    color: "#F3F4F6",
  },
  keySubText: {
    fontSize: 11,
    color: "#666666",
  },
  keySubTextDark: {
    color: "#9CA3AF",
  },
  keyAccent: {
    backgroundColor: "#5F6F2A",
  },
  keyDisabled: {
    opacity: 0.55,
  },
  keyTextAccent: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
