import { AppDrawer, useAppDrawer } from "@/src/components/homepage/AppDrawer";
import { ExpenseGrid, type ExpenseItem } from "@/src/components/homepage/ExpenseGrid";
import { TopBar } from "@/src/components/homepage/TopBar";
import { SafeArea } from "@/src/components/SafeArea";
import { useGuardedModalPush } from "@/src/hooks/guardForModals";
import { clearBudgetForCategory } from "@/src/stores/budgetStore";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import type { LucideIcon } from "lucide-react-native";
import {
  Banknote,
  Baby,
  BriefcaseBusiness,
  BookOpen,
  Bus,
  Car,
  CircleHelp,
  Coffee,
  Droplets,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  House,
  PawPrint,
  Phone,
  Plane,
  PiggyBank,
  ShieldPlus,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Stethoscope,
  Tv,
  Utensils,
  Wrench,
  Zap,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { categoriesForMonth, paymentSumsByCategory } from "@/src/utils/queries";
import { drizzle, useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useSQLiteContext } from "expo-sqlite";

const ICONS: Record<string, LucideIcon> = {
  Banknote,
  Baby,
  BriefcaseBusiness,
  BookOpen,
  Bus,
  Car,
  Coffee,
  Droplets,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  House,
  PawPrint,
  Phone,
  Plane,
  PiggyBank,
  ShieldPlus,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Stethoscope,
  Tv,
  Utensils,
  Wrench,
  Zap,
};
const CATEGORY_COLOR_POOL = [
  "#00DDB7",
  "#FFC83C",
  "#36A8FF",
  "#FF4752",
  "#C48FEE",
  "#FF9949",
  "#5FFF94",
  "#7D8CFF",
  "#4FD27E",
];
type PredefinedCategoryOption = {
  name: string;
  icon: LucideIcon;
  iconName: string;
};

const PREDEFINED_CATEGORY_OPTIONS: PredefinedCategoryOption[] = [
  { name: "Groceries", icon: ShoppingCart, iconName: "ShoppingCart" },
  { name: "Transport", icon: Car, iconName: "Car" },
  { name: "Fuel", icon: Fuel, iconName: "Fuel" },
  { name: "Utilities", icon: Zap, iconName: "Zap" },
  { name: "Home", icon: House, iconName: "House" },
  { name: "Health", icon: Stethoscope, iconName: "Stethoscope" },
  { name: "Fitness", icon: Dumbbell, iconName: "Dumbbell" },
  { name: "Restaurants", icon: Utensils, iconName: "Utensils" },
  { name: "Coffee", icon: Coffee, iconName: "Coffee" },
  { name: "Entertainment", icon: Film, iconName: "Film" },
  { name: "Streaming", icon: Tv, iconName: "Tv" },
  { name: "Gaming", icon: Gamepad2, iconName: "Gamepad2" },
  { name: "Shopping", icon: ShoppingBag, iconName: "ShoppingBag" },
  { name: "Clothing", icon: ShoppingBasket, iconName: "ShoppingBasket" },
  { name: "Education", icon: GraduationCap, iconName: "GraduationCap" },
  { name: "Books", icon: BookOpen, iconName: "BookOpen" },
  { name: "Work", icon: BriefcaseBusiness, iconName: "BriefcaseBusiness" },
  { name: "Travel", icon: Plane, iconName: "Plane" },
  { name: "Phone", icon: Smartphone, iconName: "Smartphone" },
  { name: "Bills", icon: Wrench, iconName: "Wrench" },
  { name: "Gifts", icon: Gift, iconName: "Gift" },
  { name: "Family", icon: Baby, iconName: "Baby" },
  { name: "Pets", icon: PawPrint, iconName: "PawPrint" },
  { name: "Insurance", icon: ShieldPlus, iconName: "ShieldPlus" },
  { name: "Savings", icon: PiggyBank, iconName: "PiggyBank" },
  { name: "Misc", icon: Sparkles, iconName: "Sparkles" },
];
const CATEGORY_COLOR_OPTIONS = [
  "#00DDB7",
  "#36A8FF",
  "#FF4752",
  "#FFC83C",
  "#7D8CFF",
  "#FF9949",
  "#4FD27E",
  "#C48FEE",
  "#15B8A6",
  "#FF7AA2",
  "#00B3FF",
  "#FF5AD9",
  "#00E5FF",
  "#A3FF12",
  "#FF6B00",
];
const PREFERENCES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS app_preferences (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );
`;
const PREFERENCES_UPSERT_SQL = `
  INSERT INTO app_preferences (key, value, updated_at)
  VALUES (?, ?, (unixepoch() * 1000))
  ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = excluded.updated_at;
`;
const HOME_CATEGORY_ORDER_KEY_PREFIX = "home_category_order";

const normalizeToken = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const arraysEqual = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const resolveHomeIcon = (rawIcon: string | null | undefined, categoryName: string | null | undefined): LucideIcon => {
  const normalizedCategory = normalizeToken(categoryName);

  if (normalizedCategory === "groceries") return ShoppingCart;
  if (normalizedCategory === "transport") return Car;
  if (normalizedCategory === "utilities") return Zap;
  if (normalizedCategory === "health") return Heart;
  if (normalizedCategory === "restaurants") return Utensils;
  if (normalizedCategory === "entertainment") return Gamepad2;
  if (normalizedCategory === "shopping") return ShoppingBag;
  if (normalizedCategory === "education") return GraduationCap;
  if (normalizedCategory === "savings") return PiggyBank;

  if (/(groc|supermarket|market)/.test(normalizedCategory)) return ShoppingCart;
  if (/(transport|commute|fuel|gas|ride|taxi|bus|train)/.test(normalizedCategory)) return Car;
  if (/(utilit|bill|internet|electric|water|phone|wifi)/.test(normalizedCategory)) return Zap;
  if (/(health|medical|doctor|pharma|fitness|wellness)/.test(normalizedCategory)) return Heart;
  if (/(restaurant|food|dining|meal|drink|coffee)/.test(normalizedCategory)) return Utensils;
  if (/(entertain|movie|cinema|game|stream)/.test(normalizedCategory)) return Gamepad2;
  if (/(educat|school|course|book|study|tuition)/.test(normalizedCategory)) return GraduationCap;
  if (/(shop|clothes|fashion|accessories)/.test(normalizedCategory)) return ShoppingBag;
  if (/(saving|invest|retire|emergencyfund|goal)/.test(normalizedCategory)) return PiggyBank;

  return ICONS[rawIcon ?? ""] ?? CircleHelp;
};
const resolveCategoryIconName = (categoryName: string): string => {
  const normalizedCategory = normalizeToken(categoryName);

  if (normalizedCategory === "groceries") return "ShoppingCart";
  if (normalizedCategory === "transport") return "Bus";
  if (normalizedCategory === "utilities") return "Zap";
  if (normalizedCategory === "health") return "Heart";
  if (normalizedCategory === "restaurants") return "Utensils";
  if (normalizedCategory === "entertainment") return "Film";
  if (normalizedCategory === "shopping") return "ShoppingBag";
  if (normalizedCategory === "education") return "GraduationCap";
  if (normalizedCategory === "savings") return "PiggyBank";

  if (/(groc|supermarket|market)/.test(normalizedCategory)) return "ShoppingCart";
  if (/(transport|commute|fuel|gas|ride|taxi|bus|train)/.test(normalizedCategory)) return "Bus";
  if (/(utilit|bill|internet|electric|water|phone|wifi)/.test(normalizedCategory)) return "Zap";
  if (/(health|medical|doctor|pharma|fitness|wellness)/.test(normalizedCategory)) return "Heart";
  if (/(restaurant|food|dining|meal|drink|coffee)/.test(normalizedCategory)) return "Utensils";
  if (/(entertain|movie|cinema|game|stream)/.test(normalizedCategory)) return "Film";
  if (/(educat|school|course|book|study|tuition)/.test(normalizedCategory)) return "BookOpen";
  if (/(shop|clothes|fashion|accessories)/.test(normalizedCategory)) return "ShoppingBag";
  if (/(saving|invest|retire|emergencyfund|goal)/.test(normalizedCategory)) return "PiggyBank";

  return "CircleHelp";
};

const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return hex;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function HomeContent() {
  const drawer = useAppDrawer();
  const { pushModal } = useGuardedModalPush();
  const insets = useSafeAreaInsets();

  const dbExpo = useSQLiteContext();
  const db = drizzle(dbExpo);
  const [isAddCategoryVisible, setAddCategoryVisible] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [selectedCategoryPreset, setSelectedCategoryPreset] = useState<string | null>(null);
  const [selectedCategoryColor, setSelectedCategoryColor] = useState(CATEGORY_COLOR_OPTIONS[0]);
  const [categoryOrderIds, setCategoryOrderIds] = useState<string[] | null>(null);
  const [isCategoryEditing, setIsCategoryEditing] = useState(false);
  const shakeValue = useRef(new Animated.Value(0)).current;
  const currentMonth = useMemo(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    [],
  );
  const categoryOrderKey = useMemo(
    () => `${HOME_CATEGORY_ORDER_KEY_PREFIX}_${currentMonth.getTime()}`,
    [currentMonth],
  );
  const shakeRotate = useMemo(
    () =>
      shakeValue.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ["-1.7deg", "0deg", "1.7deg"],
      }),
    [shakeValue],
  );

  useEffect(() => {
    if (!isCategoryEditing) {
      shakeValue.stopAnimation();
      shakeValue.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeValue, {
          toValue: -1,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(shakeValue, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => {
      loop.stop();
      shakeValue.stopAnimation();
      shakeValue.setValue(0);
    };
  }, [isCategoryEditing, shakeValue]);

  const categoriesQuery = useMemo(
    () => categoriesForMonth(db, currentMonth),
    [db, currentMonth],
  );
  const paymentsQuery = useMemo(
    () => paymentSumsByCategory(db),
    [db],
  );

  const { data: categoriesData } = useLiveQuery(categoriesQuery);
  const { data: paymentSumsData } = useLiveQuery(paymentsQuery);
  const paymentSumsByCategoryId = useMemo(
    () => new Map(paymentSumsData.map((row) => [row.categoryId, Number(row.totalSumCents)])),
    [paymentSumsData],
  );
  const expenseItems = useMemo<ExpenseItem[]>(
    () =>
      categoriesData.map((item) => {
        const circleColor = item.color;
        const icon = resolveHomeIcon(item.icon, item.categoryName);
        const categoryTotalCents = paymentSumsByCategoryId.get(item.id) ?? 0;
        const categoryTotalNoDecimals = Math.round(categoryTotalCents / 100);

        return {
          id: String(item.id),
          userId: item.userId,
          name: item.categoryName,
          amount: categoryTotalNoDecimals,
          circleColor,
          backgroundColor: withAlpha(circleColor, 0.4),
          icon,
          kind: "category",
        };
      }),
    [categoriesData, paymentSumsByCategoryId],
  );
  const persistCategoryOrder = useCallback(
    async (nextOrderIds: string[]) => {
      try {
        await dbExpo.runAsync(PREFERENCES_TABLE_SQL);
        await dbExpo.runAsync(PREFERENCES_UPSERT_SQL, [
          categoryOrderKey,
          JSON.stringify(nextOrderIds),
        ]);
      } catch (error) {
        console.error("Failed to persist category order", error);
      }
    },
    [categoryOrderKey, dbExpo],
  );

  useEffect(() => {
    let isMounted = true;

    const loadPersistedCategoryOrder = async () => {
      try {
        await dbExpo.runAsync(PREFERENCES_TABLE_SQL);
        const row = await dbExpo.getFirstAsync<{ value: string }>(
          "SELECT value FROM app_preferences WHERE key = ? LIMIT 1",
          [categoryOrderKey],
        );
        if (!isMounted) return;

        if (!row?.value) {
          setCategoryOrderIds([]);
          return;
        }

        try {
          const parsed = JSON.parse(row.value);
          if (Array.isArray(parsed)) {
            const normalized = parsed
              .map((value) => String(value))
              .filter((value) => value.length > 0);
            setCategoryOrderIds(normalized);
            return;
          }
        } catch {
          // Fallback handled below.
        }

        setCategoryOrderIds([]);
      } catch (error) {
        console.error("Failed to load category order", error);
        if (isMounted) {
          setCategoryOrderIds([]);
        }
      }
    };

    void loadPersistedCategoryOrder();
    return () => {
      isMounted = false;
    };
  }, [categoryOrderKey, dbExpo]);

  useEffect(() => {
    if (categoryOrderIds === null) {
      return;
    }
    const existingIds = expenseItems.map((item) => item.id);
    const existingSet = new Set(existingIds);
    const orderedExisting = categoryOrderIds.filter((id) => existingSet.has(id));
    const missingIds = existingIds.filter((id) => !orderedExisting.includes(id));
    const normalizedOrder = [...orderedExisting, ...missingIds];

    if (arraysEqual(normalizedOrder, categoryOrderIds)) {
      return;
    }
    setCategoryOrderIds(normalizedOrder);
    void persistCategoryOrder(normalizedOrder);
  }, [categoryOrderIds, expenseItems, persistCategoryOrder]);

  const orderedExpenseItems = useMemo(() => {
    if (categoryOrderIds === null || categoryOrderIds.length === 0) {
      return expenseItems;
    }
    const rankById = new Map(categoryOrderIds.map((id, index) => [id, index]));
    return [...expenseItems].sort((a, b) => {
      const aRank = rankById.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bRank = rankById.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank;
    });
  }, [categoryOrderIds, expenseItems]);
  const gridItems = useMemo<ExpenseItem[]>(
    () => [
      ...orderedExpenseItems,
      {
        id: "add-category-card",
        name: "Add Category",
        kind: "add",
      },
    ],
    [orderedExpenseItems],
  );
  const totalExpenseNoDecimals = useMemo(
    () => Math.round(expenseItems.reduce((acc, item) => acc + Number(item.amount), 0)),
    [expenseItems],
  );
  const existingCategoryTokens = useMemo(
    () => new Set(categoriesData.map((item) => normalizeToken(item.categoryName))),
    [categoriesData],
  );
  const availablePresetCount = useMemo(
    () => PREDEFINED_CATEGORY_OPTIONS.filter((option) => !existingCategoryTokens.has(normalizeToken(option.name))).length,
    [existingCategoryTokens],
  );
  const selectedPresetOption = useMemo(
    () => PREDEFINED_CATEGORY_OPTIONS.find((option) => option.name === selectedCategoryPreset) ?? null,
    [selectedCategoryPreset],
  );
  const SelectedPresetIcon = selectedCategoryPreset
    ? selectedPresetOption?.icon ?? resolveHomeIcon(undefined, selectedCategoryPreset)
    : CircleHelp;

  const openAddCategoryModal = useCallback(() => {
    const defaultColor = CATEGORY_COLOR_OPTIONS[categoriesData.length % CATEGORY_COLOR_OPTIONS.length];
    const firstAvailablePreset =
      PREDEFINED_CATEGORY_OPTIONS.find((option) => !existingCategoryTokens.has(normalizeToken(option.name)))?.name ?? null;
    setIsCategoryEditing(false);
    setSelectedCategoryPreset(firstAvailablePreset);
    setSelectedCategoryColor(defaultColor);
    setAddCategoryVisible(true);
  }, [categoriesData.length, existingCategoryTokens]);
  const closeAddCategoryModal = useCallback(() => {
    setAddCategoryVisible(false);
    setIsCreatingCategory(false);
  }, []);
  const handleSelectPresetCategory = useCallback((presetName: string) => {
    setSelectedCategoryPreset(presetName);
  }, []);
  const handleCategoryOrderPreview = useCallback((nextCategoryIds: string[]) => {
    setCategoryOrderIds(nextCategoryIds);
  }, []);
  const handleCategoryOrderCommit = useCallback(
    (nextCategoryIds: string[]) => {
      setCategoryOrderIds(nextCategoryIds);
      void persistCategoryOrder(nextCategoryIds);
    },
    [persistCategoryOrder],
  );
  const handleCreateCategory = useCallback(async () => {
    if (!selectedCategoryPreset) {
      Alert.alert("Pick a category", "Select one option from the list.");
      return;
    }

    const trimmedName = selectedCategoryPreset.trim();
    const isDuplicate = existingCategoryTokens.has(normalizeToken(trimmedName));
    if (isDuplicate) {
      Alert.alert("Already exists", "This category already exists for this month.");
      return;
    }
    const color = selectedCategoryColor || CATEGORY_COLOR_POOL[categoriesData.length % CATEGORY_COLOR_POOL.length];
    const iconName = selectedPresetOption?.iconName ?? resolveCategoryIconName(trimmedName);
    const userId = categoriesData[0]?.userId ?? 1;

    try {
      setIsCreatingCategory(true);
      await dbExpo.runAsync(
        "INSERT INTO categories (category_name, color, icon, month_start, user_id) VALUES (?, ?, ?, ?, ?)",
        [trimmedName, color, iconName, currentMonth.getTime(), userId],
      );
      closeAddCategoryModal();
    } catch (error) {
      console.error("Failed to create category", error);
      Alert.alert("Unable to add category", "Please try again.");
      setIsCreatingCategory(false);
    }
  }, [categoriesData, closeAddCategoryModal, currentMonth, dbExpo, existingCategoryTokens, selectedCategoryColor, selectedCategoryPreset, selectedPresetOption]);
  const handleOpenAddExpense = useCallback(
    (item: ExpenseItem) => {
      if (isCategoryEditing) {
        setIsCategoryEditing(false);
        return;
      }

      if (item.kind === "add") {
        openAddCategoryModal();
        return;
      }
      pushModal({
        pathname: "/(modals)/addExpense",
        params: {
          category: item.name,
          categoryId: item.id,
          categoryUserId: String(item.userId ?? 1),
        },
      });
    },
    [isCategoryEditing, openAddCategoryModal, pushModal],
  );
  const handleLongPressCategory = useCallback((item: ExpenseItem) => {
    if (item.kind !== "category") {
      return;
    }
    setIsCategoryEditing(true);
  }, []);
  const handleDeleteCategory = useCallback(
    (item: ExpenseItem) => {
      if (item.kind !== "category") {
        return;
      }

      const categoryId = Number(item.id);
      if (!Number.isFinite(categoryId)) {
        return;
      }

      Alert.alert(
        "Remove category?",
        `"${item.name}" and all related expenses will be deleted.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await dbExpo.runAsync(
                  "DELETE FROM products WHERE payment_id IN (SELECT id FROM payments WHERE category_id = ?)",
                  [categoryId],
                );
                await dbExpo.runAsync("DELETE FROM payments WHERE category_id = ?", [categoryId]);
                await dbExpo.runAsync("DELETE FROM categories WHERE id = ?", [categoryId]);
                clearBudgetForCategory(String(categoryId));
                setCategoryOrderIds((prev) => {
                  if (!prev) return prev;
                  const next = prev.filter((id) => id !== item.id);
                  void persistCategoryOrder(next);
                  return next;
                });
                setIsCategoryEditing(false);
              } catch (error) {
                console.error("Failed deleting category", error);
                Alert.alert("Unable to delete", "Please try again.");
              }
            },
          },
        ],
      );
    },
    [dbExpo, persistCategoryOrder],
  );
  const handleDismissEditing = useCallback(() => {
    if (!isCategoryEditing) {
      return;
    }
    setIsCategoryEditing(false);
  }, [isCategoryEditing]);

  
  return (
    <>
      <TopBar
        title="This Month"
        onMenuPress={drawer.open}
        onPrevPress={() => {}}
        onNextPress={() => {}}
      />
      <View style={styles.contentDismissArea}>
        {isCategoryEditing ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismissEditing} />
        ) : null}
        <View style={styles.contentForeground} pointerEvents="box-none">
          <Text style={styles.expenseTotal}>
            Expense ${totalExpenseNoDecimals}
          </Text>
          <ExpenseGrid
            items={gridItems}
            onPressItem={handleOpenAddExpense}
            onLongPressItem={handleLongPressCategory}
            onDeleteItem={handleDeleteCategory}
            isEditing={isCategoryEditing}
            shakeAnim={shakeRotate}
            onReorderPreview={handleCategoryOrderPreview}
            onReorderCommit={handleCategoryOrderCommit}
          />
        </View>
      </View>
      <Modal visible={isAddCategoryVisible} transparent animationType="fade" onRequestClose={closeAddCategoryModal}>
        <Pressable style={styles.categoryModalOverlay} onPress={closeAddCategoryModal}>
          <Pressable style={styles.categoryModalSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.categoryModalHeader}>
              <View style={styles.categoryModalHeaderText}>
                <Text style={styles.categoryModalTitle}>New Category</Text>
                <Text style={styles.categoryModalSubtitle}>Choose a category and a color</Text>
              </View>
              <Pressable style={styles.categoryModalCloseButton} onPress={closeAddCategoryModal}>
                <X size={18} color="#111827" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.categoryModalScroll}
              contentContainerStyle={[
                styles.categoryModalScrollContent,
                { paddingBottom: 120 + insets.bottom },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalSectionLabel}>Pick a category</Text>
              <View style={styles.presetGrid}>
                {PREDEFINED_CATEGORY_OPTIONS.map((option) => {
                  const isSelected = selectedCategoryPreset === option.name;
                  const isTaken = existingCategoryTokens.has(normalizeToken(option.name));
                  const IconComponent = option.icon;
                  return (
                    <Pressable
                      key={option.name}
                      style={[
                        styles.presetChip,
                        isSelected ? styles.presetChipActive : null,
                        isTaken ? styles.presetChipDisabled : null,
                      ]}
                      onPress={() => handleSelectPresetCategory(option.name)}
                      disabled={isTaken}
                    >
                      <View
                        style={[
                          styles.presetChipIconWrap,
                          isSelected ? styles.presetChipIconWrapActive : null,
                        ]}
                      >
                        <IconComponent
                          size={14}
                          color={isTaken ? "#9CA3AF" : isSelected ? "#FFFFFF" : "#111827"}
                        />
                      </View>
                      <Text
                        style={[
                          styles.presetChipText,
                          isSelected ? styles.presetChipTextActive : null,
                          isTaken ? styles.presetChipTextDisabled : null,
                        ]}
                      >
                        {option.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {availablePresetCount === 0 ? (
                <Text style={styles.presetUnavailableText}>All predefined categories are already added.</Text>
              ) : null}

              <Text style={styles.modalSectionLabel}>Pick a color</Text>
              <View style={styles.colorPalette}>
                {CATEGORY_COLOR_OPTIONS.map((color) => {
                  const isSelected = selectedCategoryColor === color;
                  return (
                    <Pressable
                      key={color}
                      style={[
                        styles.colorSwatchOuter,
                        isSelected ? styles.colorSwatchOuterActive : null,
                      ]}
                      onPress={() => setSelectedCategoryColor(color)}
                    >
                      <View style={[styles.colorSwatchInner, { backgroundColor: color }]} />
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.modalSectionLabel}>Preview</Text>
              <View style={styles.previewCard}>
                <View style={[styles.previewIconWrap, { backgroundColor: selectedCategoryColor }]}>
                  <SelectedPresetIcon size={16} color="#FFFFFF" />
                </View>
                <View style={styles.previewCopy}>
                  <Text style={styles.previewName}>{selectedCategoryPreset ?? "Select a category"}</Text>
                  <Text style={styles.previewHint}>This will be added for the current month</Text>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.categoryModalActions, { paddingBottom: Math.max(18, insets.bottom + 10) }]}>
              <Pressable style={styles.modalGhostButton} onPress={closeAddCategoryModal}>
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalPrimaryButton,
                  isCreatingCategory || !selectedCategoryPreset ? styles.modalPrimaryButtonDisabled : null,
                ]}
                onPress={handleCreateCategory}
                disabled={isCreatingCategory || !selectedCategoryPreset}
              >
                <Text style={styles.modalPrimaryText}>{isCreatingCategory ? "Adding..." : "Add Category"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// Custom Text component to apply global font style
export function AppText(props: any) {
  return (
    <Text {...props} style={[{ fontFamily: "Inter_600Bold" }, props.style]} />
  );
}

export default function HomeScreen() {

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })
  if (!fontsLoaded) return null;

  return (
    <View style={styles.background}>
      <SafeArea>
        <AppDrawer>
          <HomeContent />
        </AppDrawer>
      </SafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: "#ffffffff",
    height: "100%",
  },
  expenseTotal: {
    textAlign: "center",
    paddingTop: 4,
    paddingBottom: 4,
  },
  contentDismissArea: {
    flex: 1,
  },
  contentForeground: {
    flex: 1,
  },
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(3,7,18,0.45)",
    justifyContent: "flex-end",
  },
  categoryModalSheet: {
    minHeight: "84%",
    maxHeight: "94%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  categoryModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  categoryModalHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  categoryModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  categoryModalSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  categoryModalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryModalScroll: {
    flex: 1,
  },
  categoryModalScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 28,
  },
  modalSectionLabel: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  presetChip: {
    width: "48%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  presetChipActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  presetChipDisabled: {
    opacity: 0.45,
  },
  presetChipIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  presetChipIconWrapActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  presetChipTextActive: {
    color: "#FFFFFF",
  },
  presetChipTextDisabled: {
    color: "#6B7280",
  },
  presetUnavailableText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  colorPalette: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorSwatchOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  colorSwatchOuterActive: {
    borderColor: "#111827",
    borderWidth: 2.5,
  },
  colorSwatchInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  previewIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCopy: {
    marginLeft: 10,
    flex: 1,
  },
  previewName: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  previewHint: {
    marginTop: 2,
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "500",
  },
  categoryModalActions: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    flexDirection: "row",
    gap: 8,
  },
  modalGhostButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalGhostText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700",
  },
  modalPrimaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryButtonDisabled: {
    opacity: 0.6,
  },
  modalPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
