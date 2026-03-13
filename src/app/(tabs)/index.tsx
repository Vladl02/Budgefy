import { useAppDrawer } from "@/src/components/homepage/AppDrawer";
import { ExpenseGrid, type ExpenseItem, type HomeLayoutStyle } from "@/src/components/homepage/ExpenseGrid";
import { TopBar } from "@/src/components/homepage/TopBar";
import { SafeArea } from "@/src/components/SafeArea";
import { useGuardedModalPush } from "@/src/hooks/guardForModals";
import { useAppTheme } from "@/src/providers/AppThemeProvider";
import { clearBudgetForCategory, useBudgetStore } from "@/src/stores/budgetStore";
import { HOME_CATEGORY_DEFAULTS, HOME_COLOR_FALLBACKS } from "@/src/constants/homeCategoryDefaults";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DEFAULT_CATEGORY_ICON_NAME, resolveIconByName } from "@/src/utils/categoryIcons";
import { getAppPreference, setAppPreference } from "@/src/utils/preferences";
import {
  categoriesForMonth,
  paymentSumsByCategoryForMonth,
  paymentSumsByCategoryNameForMonth,
} from "@/src/utils/queries";
import { drizzle, useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useSQLiteContext } from "expo-sqlite";
const HOME_CATEGORY_ORDER_KEY_PREFIX = "home_category_order";
const HOME_LAYOUT_STYLE_KEY = "home_layout_style_v1";

const normalizeToken = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const arraysEqual = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);
const isHexColor = (value: string | null | undefined): value is string =>
  !!value && /^#[0-9a-fA-F]{6}$/.test(value);

type CategoryPresetOption = {
  name: string;
  iconName: string;
  color: string;
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
  const { isDark } = useAppTheme();
  const drawer = useAppDrawer();
  const { pushModal } = useGuardedModalPush();
  const insets = useSafeAreaInsets();

  const dbExpo = useSQLiteContext();
  const db = useMemo(() => drizzle(dbExpo), [dbExpo]);
  const { budgetOverrides } = useBudgetStore();
  const [isAddCategoryVisible, setAddCategoryVisible] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [selectedCategoryPreset, setSelectedCategoryPreset] = useState<string | null>(null);
  const [selectedCategoryColor, setSelectedCategoryColor] = useState(HOME_COLOR_FALLBACKS[0]);
  const [categoryOrderIds, setCategoryOrderIds] = useState<string[] | null>(null);
  const [isCategoryOrderHydrated, setIsCategoryOrderHydrated] = useState(false);
  const [homeLayoutStyle, setHomeLayoutStyle] = useState<HomeLayoutStyle>("grid");
  const [isCategoryEditing, setIsCategoryEditing] = useState(false);
  const latestAvailableMonth = useMemo(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    [],
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(latestAvailableMonth);
  const previousMonth = useMemo(
    () => new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    [currentMonth],
  );
  const currentMonthTitle = (() => {
    const monthLabel = currentMonth.toLocaleString("en-US", { month: "long" });
    const isCurrentYear = currentMonth.getFullYear() === new Date().getFullYear();
    return isCurrentYear
      ? `Your ${monthLabel} Spending.`
      : `Your ${monthLabel} ${currentMonth.getFullYear()} Spending.`;
  })();
  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      return next.getTime() > latestAvailableMonth.getTime() ? prev : next;
    });
  };
  const categoryOrderKey = useMemo(
    () => `${HOME_CATEGORY_ORDER_KEY_PREFIX}_${currentMonth.getTime()}`,
    [currentMonth],
  );

  const categoriesQuery = useMemo(
    () => categoriesForMonth(db, currentMonth),
    [db, currentMonth],
  );
  const currentMonthPaymentSumsQuery = useMemo(
    () => paymentSumsByCategoryForMonth(db, currentMonth),
    [currentMonth, db],
  );
  const previousMonthPaymentSumsByNameQuery = useMemo(
    () => paymentSumsByCategoryNameForMonth(db, previousMonth),
    [db, previousMonth],
  );

  const { data: categoriesData } = useLiveQuery(categoriesQuery);
  const { data: paymentSumsData } = useLiveQuery(currentMonthPaymentSumsQuery);
  const { data: previousMonthPaymentSumsByNameData } = useLiveQuery(previousMonthPaymentSumsByNameQuery);
  const paymentSumsByCategoryId = useMemo(
    () => new Map(paymentSumsData.map((row) => [row.categoryId, Number(row.totalSumCents)])),
    [paymentSumsData],
  );
  const previousMonthSpendingByCategoryToken = useMemo(() => {
    const spendingByToken = new Map<string, number>();

    previousMonthPaymentSumsByNameData.forEach((item) => {
      const token = normalizeToken(item.categoryName);
      if (!token) return;

      const spendCents = Number(item.totalSumCents);
      spendingByToken.set(token, (spendingByToken.get(token) ?? 0) + spendCents);
    });

    return spendingByToken;
  }, [previousMonthPaymentSumsByNameData]);
  const expenseItems = useMemo<ExpenseItem[]>(
    () =>
      categoriesData.map((item) => {
        const circleColor = item.color;
        const icon = resolveIconByName(item.icon);
        const categoryTotalCents = paymentSumsByCategoryId.get(item.id) ?? 0;
        const categoryTotal = Number((categoryTotalCents / 100).toFixed(2));
        const categoryTotalNoDecimals = Math.round(categoryTotalCents / 100);
        const previousMonthSpendCents =
          previousMonthSpendingByCategoryToken.get(normalizeToken(item.categoryName)) ?? 0;
        const trendPercent =
          previousMonthSpendCents > 0
            ? ((categoryTotalCents - previousMonthSpendCents) / previousMonthSpendCents) * 100
            : null;
        const budget = budgetOverrides[String(item.id)] ?? 0;
        const budgetUsageRatio = budget > 0 ? categoryTotal / budget : null;

        return {
          id: String(item.id),
          userId: item.userId,
          name: item.categoryName,
          amount: categoryTotalNoDecimals,
          circleColor,
          backgroundColor: withAlpha(circleColor, 0.4),
          icon,
          budgetUsageRatio,
          trendPercent,
          kind: "category",
        };
      }),
    [budgetOverrides, categoriesData, paymentSumsByCategoryId, previousMonthSpendingByCategoryToken],
  );
  const persistCategoryOrder = useCallback(
    async (nextOrderIds: string[]) => {
      try {
        await setAppPreference(
          dbExpo,
          categoryOrderKey,
          JSON.stringify(nextOrderIds),
        );
      } catch (error) {
        console.error("Failed to persist category order", error);
      }
    },
    [categoryOrderKey, dbExpo],
  );

  useEffect(() => {
    let isMounted = true;
    setIsCategoryOrderHydrated(false);

    const loadPersistedCategoryOrder = async () => {
      try {
        const value = await getAppPreference(dbExpo, categoryOrderKey, "");
        if (!isMounted) return;

        if (!value) {
          setCategoryOrderIds([]);
          setIsCategoryOrderHydrated(true);
          return;
        }

        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            const normalized = parsed
              .map((value) => String(value))
              .filter((value) => value.length > 0);
            setCategoryOrderIds(normalized);
            setIsCategoryOrderHydrated(true);
            return;
          }
        } catch {
          // Fallback handled below.
        }

        setCategoryOrderIds([]);
        setIsCategoryOrderHydrated(true);
      } catch (error) {
        console.error("Failed to load category order", error);
        if (isMounted) {
          setCategoryOrderIds([]);
          setIsCategoryOrderHydrated(true);
        }
      }
    };

    void loadPersistedCategoryOrder();
    return () => {
      isMounted = false;
    };
  }, [categoryOrderKey, dbExpo]);

  useEffect(() => {
    let isMounted = true;

    const loadHomeLayoutStyle = async () => {
      try {
        const value = await getAppPreference(dbExpo, HOME_LAYOUT_STYLE_KEY, "grid");

        if (!isMounted) return;
        if (value === "grid" || value === "masonry") {
          setHomeLayoutStyle(value);
          return;
        }
        setHomeLayoutStyle("grid");
      } catch (error) {
        console.error("Failed to load home layout style", error);
        if (isMounted) {
          setHomeLayoutStyle("grid");
        }
      }
    };

    void loadHomeLayoutStyle();
    return () => {
      isMounted = false;
    };
  }, [dbExpo]);

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
        name: "New Budget",
        kind: "add",
      },
    ],
    [orderedExpenseItems],
  );
  const totalExpenseNoDecimals = Math.round(expenseItems.reduce((acc, item) => acc + Number(item.amount), 0));
  const existingCategoryTokens = useMemo(
    () => new Set(categoriesData.map((item) => normalizeToken(item.categoryName))),
    [categoriesData],
  );
  const categoryPresetOptions = useMemo<CategoryPresetOption[]>(() => {
    const deduped = new Map<string, CategoryPresetOption>();

    categoriesData.forEach((row) => {
      const token = normalizeToken(row.categoryName);
      if (!token || deduped.has(token)) return;
      deduped.set(token, {
        name: row.categoryName,
        iconName: row.icon ?? DEFAULT_CATEGORY_ICON_NAME,
        color: isHexColor(row.color) ? row.color : HOME_COLOR_FALLBACKS[0],
      });
    });

    HOME_CATEGORY_DEFAULTS.forEach((row) => {
      const token = normalizeToken(row.name);
      if (!token || deduped.has(token)) return;
      deduped.set(token, row);
    });

    return Array.from(deduped.values());
  }, [categoriesData]);
  const categoryColorOptions = useMemo(() => {
    const colors = new Set<string>();

    categoriesData.forEach((row) => {
      if (isHexColor(row.color)) {
        colors.add(row.color);
      }
    });

    HOME_COLOR_FALLBACKS.forEach((color) => colors.add(color));
    return Array.from(colors);
  }, [categoriesData]);
  const availablePresetCount = categoryPresetOptions
    .filter((option) => !existingCategoryTokens.has(normalizeToken(option.name)))
    .length;
  const selectedPresetOption =
    categoryPresetOptions.find((option) => option.name === selectedCategoryPreset) ?? null;
  const SelectedPresetIcon = resolveIconByName(selectedPresetOption?.iconName);

  const openAddCategoryModal = () => {
    const defaultColor = categoryColorOptions[categoriesData.length % categoryColorOptions.length] ?? HOME_COLOR_FALLBACKS[0];
    const firstAvailablePreset =
      categoryPresetOptions.find((option) => !existingCategoryTokens.has(normalizeToken(option.name)))?.name ?? null;
    setIsCategoryEditing(false);
    setSelectedCategoryPreset(firstAvailablePreset);
    setSelectedCategoryColor(defaultColor);
    setAddCategoryVisible(true);
  };
  const closeAddCategoryModal = () => {
    setAddCategoryVisible(false);
    setIsCreatingCategory(false);
  };
  const handleSelectPresetCategory = (presetName: string) => {
    setSelectedCategoryPreset(presetName);
    const presetColor = categoryPresetOptions.find((option) => option.name === presetName)?.color;
    if (presetColor) {
      setSelectedCategoryColor(presetColor);
    }
  };
  const handleCategoryOrderCommit = (nextCategoryIds: string[]) => {
    setCategoryOrderIds(nextCategoryIds);
    void persistCategoryOrder(nextCategoryIds);
  };
  const handleCategoryOrderStart = () => {
    setIsCategoryEditing(true);
  };
  const handleCreateCategory = async () => {
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
    const color = selectedCategoryColor || HOME_COLOR_FALLBACKS[categoriesData.length % HOME_COLOR_FALLBACKS.length];
    const iconName = selectedPresetOption?.iconName ?? DEFAULT_CATEGORY_ICON_NAME;
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
  };
  const handleOpenAddExpense = (item: ExpenseItem) => {
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
  };
  const handleLongPressCategory = (item: ExpenseItem) => {
    if (item.kind !== "category") {
      return;
    }
    setIsCategoryEditing(true);
  };
  const handleDeleteCategory = (item: ExpenseItem) => {
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
            } catch (error) {
              console.error("Failed deleting category", error);
              Alert.alert("Unable to delete", "Please try again.");
            }
          },
        },
      ],
    );
  };
  const handleDismissEditing = () => {
    if (!isCategoryEditing) {
      return;
    }
    setIsCategoryEditing(false);
  };

  
  return (
    <>
      <TopBar
        title={currentMonthTitle}
        onMenuPress={drawer.open}
        onPrevPress={handlePreviousMonth}
        onNextPress={handleNextMonth}
      />
      <View style={styles.contentDismissArea}>
        {isCategoryEditing ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismissEditing} />
        ) : null}
        <View style={styles.contentForeground} pointerEvents="box-none">
          <Text style={styles.expenseTotal}>
            Expense ${totalExpenseNoDecimals}
          </Text>
          {isCategoryOrderHydrated ? (
            <ExpenseGrid
              items={gridItems}
              layoutStyle={homeLayoutStyle}
              onPressItem={handleOpenAddExpense}
              onLongPressItem={handleLongPressCategory}
              onDeleteItem={handleDeleteCategory}
              isEditing={isCategoryEditing}
              onReorderStart={handleCategoryOrderStart}
              onReorderCommit={handleCategoryOrderCommit}
              onBackgroundPress={handleDismissEditing}
            />
          ) : (
            <View style={styles.gridLoading}>
              <ActivityIndicator size="small" color={isDark ? "#F3F4F6" : "#111827"} />
            </View>
          )}
        </View>
      </View>
      <Modal visible={isAddCategoryVisible} transparent animationType="fade" onRequestClose={closeAddCategoryModal}>
        <Pressable style={styles.categoryModalOverlay} onPress={closeAddCategoryModal}>
          <Pressable
            style={[styles.categoryModalSheet, isDark ? styles.categoryModalSheetDark : null]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={[styles.categoryModalHeader, isDark ? styles.categoryModalHeaderDark : null]}>
              <View style={styles.categoryModalHeaderText}>
                <Text style={[styles.categoryModalTitle, isDark ? styles.categoryModalTitleDark : null]}>New Category</Text>
                <Text style={[styles.categoryModalSubtitle, isDark ? styles.categoryModalSubtitleDark : null]}>
                  Choose a category and a color
                </Text>
              </View>
              <Pressable
                style={[styles.categoryModalCloseButton, isDark ? styles.categoryModalCloseButtonDark : null]}
                onPress={closeAddCategoryModal}
              >
                <X size={18} color={isDark ? "#F3F4F6" : "#111827"} />
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
              <Text style={[styles.modalSectionLabel, isDark ? styles.modalSectionLabelDark : null]}>Pick a category</Text>
              <View style={styles.presetGrid}>
                {categoryPresetOptions.map((option) => {
                  const isSelected = selectedCategoryPreset === option.name;
                  const isTaken = existingCategoryTokens.has(normalizeToken(option.name));
                  const IconComponent = resolveIconByName(option.iconName);
                  return (
                    <Pressable
                      key={option.name}
                      style={[
                        styles.presetChip,
                        isDark ? styles.presetChipDark : null,
                        isSelected ? styles.presetChipActive : null,
                        isTaken ? styles.presetChipDisabled : null,
                      ]}
                      onPress={() => handleSelectPresetCategory(option.name)}
                      disabled={isTaken}
                    >
                      <View
                        style={[
                          styles.presetChipIconWrap,
                          isDark ? styles.presetChipIconWrapDark : null,
                          isSelected ? styles.presetChipIconWrapActive : null,
                        ]}
                      >
                        <IconComponent
                          size={14}
                          color={isTaken ? "#9CA3AF" : isSelected ? "#FFFFFF" : isDark ? "#E5E7EB" : "#111827"}
                        />
                      </View>
                      <Text
                        style={[
                          styles.presetChipText,
                          isDark ? styles.presetChipTextDark : null,
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
                <Text style={[styles.presetUnavailableText, isDark ? styles.presetUnavailableTextDark : null]}>
                  All predefined categories are already added.
                </Text>
              ) : null}

              <Text style={[styles.modalSectionLabel, isDark ? styles.modalSectionLabelDark : null]}>Pick a color</Text>
              <View style={styles.colorPalette}>
                {categoryColorOptions.map((color) => {
                  const isSelected = selectedCategoryColor === color;
                  return (
                    <Pressable
                      key={color}
                      style={[
                        styles.colorSwatchOuter,
                        isDark ? styles.colorSwatchOuterDark : null,
                        isSelected ? styles.colorSwatchOuterActive : null,
                      ]}
                      onPress={() => setSelectedCategoryColor(color)}
                    >
                      <View style={[styles.colorSwatchInner, { backgroundColor: color }]} />
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.modalSectionLabel, isDark ? styles.modalSectionLabelDark : null]}>Preview</Text>
              <View style={[styles.previewCard, isDark ? styles.previewCardDark : null]}>
                <View style={[styles.previewIconWrap, { backgroundColor: selectedCategoryColor }]}>
                  <SelectedPresetIcon size={16} color="#FFFFFF" />
                </View>
                <View style={styles.previewCopy}>
                  <Text style={[styles.previewName, isDark ? styles.previewNameDark : null]}>
                    {selectedCategoryPreset ?? "Select a category"}
                  </Text>
                  <Text style={[styles.previewHint, isDark ? styles.previewHintDark : null]}>
                    This will be added for the current month
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View
              style={[
                styles.categoryModalActions,
                isDark ? styles.categoryModalActionsDark : null,
                { paddingBottom: Math.max(18, insets.bottom + 10) },
              ]}
            >
              <Pressable style={[styles.modalGhostButton, isDark ? styles.modalGhostButtonDark : null]} onPress={closeAddCategoryModal}>
                <Text style={[styles.modalGhostText, isDark ? styles.modalGhostTextDark : null]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalPrimaryButton,
                  isCreatingCategory || !selectedCategoryPreset ? styles.modalPrimaryButtonDisabled : null,
                ]}
                onPress={handleCreateCategory}
                disabled={isCreatingCategory || !selectedCategoryPreset}
              >
                <Text style={styles.modalPrimaryText}>{isCreatingCategory ? "Adding..." : "New Budget"}</Text>
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
  const { appColors } = useAppTheme();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={[styles.fontLoading, { backgroundColor: appColors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.background, { backgroundColor: appColors.background }]}>
      <SafeArea>
        <HomeContent />
      </SafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: "#ffffffff",
    height: "100%",
  },
  fontLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffffff",
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
  gridLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
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
  categoryModalSheetDark: {
    backgroundColor: "#111827",
    borderColor: "#374151",
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
  categoryModalHeaderDark: {
    borderBottomColor: "#374151",
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
  categoryModalTitleDark: {
    color: "#F9FAFB",
  },
  categoryModalSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  categoryModalSubtitleDark: {
    color: "#9CA3AF",
  },
  categoryModalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryModalCloseButtonDark: {
    backgroundColor: "#1F2937",
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
  modalSectionLabelDark: {
    color: "#F3F4F6",
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
  presetChipDark: {
    borderColor: "#374151",
    backgroundColor: "#1F2937",
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
  presetChipIconWrapDark: {
    backgroundColor: "#111827",
  },
  presetChipIconWrapActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  presetChipTextDark: {
    color: "#E5E7EB",
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
  presetUnavailableTextDark: {
    color: "#9CA3AF",
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
  colorSwatchOuterDark: {
    borderColor: "#4B5563",
    backgroundColor: "#111827",
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
  previewCardDark: {
    borderColor: "#374151",
    backgroundColor: "#1F2937",
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
  previewNameDark: {
    color: "#F9FAFB",
  },
  previewHint: {
    marginTop: 2,
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "500",
  },
  previewHintDark: {
    color: "#9CA3AF",
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
  categoryModalActionsDark: {
    borderTopColor: "#374151",
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
  modalGhostButtonDark: {
    borderColor: "#4B5563",
    backgroundColor: "#111827",
  },
  modalGhostText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700",
  },
  modalGhostTextDark: {
    color: "#E5E7EB",
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
