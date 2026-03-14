import { categoriesForMonth, paymentSumsByCategoryForMonth } from "@/src/utils/queries";
import { drizzle, useLiveQuery } from "drizzle-orm/expo-sqlite";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Components
import CategoryCard, {
  resolveCategoryIconKey,
  type IconKey,
} from "@/src/components/overview/category";
import MonthlySummaryCard from "@/src/components/overview/donutCard";
import EditBudgetModal, { SummaryItem } from "@/src/components/overview/EditBudgetModal";
import { useAppTheme } from "@/src/providers/AppThemeProvider";
import { useBudgetStore } from "@/src/stores/budgetStore";

type SortMode = "budget" | "spent" | "remaining" | "alphabetical";

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "budget", label: "Most Budget" },
  { key: "spent", label: "Most Spent" },
  { key: "remaining", label: "Remaining" },
  { key: "alphabetical", label: "A-Z" },
];

export default function Overview() {
  const { isDark } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { budgetOverrides, setAllBudgets, setCategoryBudget, clearCategoryBudget } = useBudgetStore();
  const [sortMode, setSortMode] = useState<SortMode>("spent");
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [quickBudgetTarget, setQuickBudgetTarget] = useState<SummaryItem | null>(null);
  const [quickBudgetInput, setQuickBudgetInput] = useState("");
  const [showTopScrollBlur, setShowTopScrollBlur] = useState(false);
  const [showBottomScrollBlur, setShowBottomScrollBlur] = useState(false);
  const listViewportHeightRef = useRef(0);
  const listContentHeightRef = useRef(0);
  const topBlurVisibleRef = useRef(false);
  const bottomBlurVisibleRef = useRef(false);
  const dbExpo = useSQLiteContext();
  const db = useMemo(() => drizzle(dbExpo), [dbExpo]);
  const currentMonth = useMemo(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    [],
  );
  const categoriesQuery = useMemo(
    () => categoriesForMonth(db, currentMonth),
    [db, currentMonth],
  );
  const paymentsQuery = useMemo(
    () => paymentSumsByCategoryForMonth(db, currentMonth),
    [currentMonth, db],
  );
  const { data: categoriesData } = useLiveQuery(categoriesQuery);
  const { data: paymentSumsData } = useLiveQuery(paymentsQuery);
  const paymentSumsByCategoryId = useMemo(
    () => new Map(paymentSumsData.map((row) => [row.categoryId, Number(row.totalSumCents)])),
    [paymentSumsData],
  );
  const items = useMemo<SummaryItem[]>(
    () =>
      categoriesData.map((item) => {
        const rawSpentCents = paymentSumsByCategoryId.get(item.id) ?? 0;
        const spent = Number((rawSpentCents / 100).toFixed(2));
        const icon: IconKey = resolveCategoryIconKey(item.icon, item.categoryName);
        const budget = budgetOverrides[String(item.id)] ?? 0;

        return {
          id: String(item.id),
          title: item.categoryName,
          spent,
          budget,
          icon,
          color: item.color,
        };
      }),
    [budgetOverrides, categoriesData, paymentSumsByCategoryId],
  );

  const handleSaveBudget = (newItems: SummaryItem[]) => {
    const nextOverrides = newItems.reduce<Record<string, number>>((acc, item) => {
      if (item.budget > 0) {
        acc[item.id] = item.budget;
      }
      return acc;
    }, {});
    setAllBudgets(nextOverrides);
  };
  const openQuickBudget = (item: SummaryItem) => {
    const existing = budgetOverrides[item.id];
    setQuickBudgetTarget(item);
    setQuickBudgetInput(existing && existing > 0 ? existing.toString() : "");
  };
  const closeQuickBudget = () => {
    setQuickBudgetTarget(null);
    setQuickBudgetInput("");
  };
  const saveQuickBudget = () => {
    if (!quickBudgetTarget) return;
    const parsed = Number.parseFloat(quickBudgetInput.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert("Invalid budget", "Please enter a value greater than 0.");
      return;
    }
    const value = Number(parsed.toFixed(2));
    setCategoryBudget(quickBudgetTarget.id, value);
    closeQuickBudget();
  };
  const clearQuickBudget = () => {
    if (!quickBudgetTarget) return;
    clearCategoryBudget(quickBudgetTarget.id);
    closeQuickBudget();
  };
  const quickBudgetInputNormalized = quickBudgetInput.trim().replace(",", ".");
  const quickBudgetParsed = Number.parseFloat(quickBudgetInputNormalized);
  const hasValidQuickBudget = Number.isFinite(quickBudgetParsed) && quickBudgetParsed > 0;
  const currentQuickBudget = quickBudgetTarget ? Number((budgetOverrides[quickBudgetTarget.id] ?? 0).toFixed(2)) : 0;
  const nextQuickBudget = hasValidQuickBudget ? Number(quickBudgetParsed.toFixed(2)) : null;
  const canSaveQuickBudget = !!quickBudgetTarget && nextQuickBudget !== null && nextQuickBudget !== currentQuickBudget;
  const openCategoryDetails = (item: SummaryItem) => {
    router.push({
      pathname: "/category/[categoryId]",
      params: {
        categoryId: item.id,
        categoryName: item.title,
      },
    });
  };

  const listBottomPadding = useMemo(() => insets.bottom + 92, [insets.bottom]);
  const listTopPadding = useMemo(() => insets.top + 12, [insets.top]);
  const sortedItems = useMemo(() => {
    const next = [...items];
    if (sortMode === "budget") {
      return next.sort((a, b) => b.budget - a.budget || b.spent - a.spent || a.title.localeCompare(b.title));
    }
    if (sortMode === "remaining") {
      return next.sort(
        (a, b) =>
          (b.budget - b.spent) - (a.budget - a.spent) ||
          b.budget - a.budget ||
          b.spent - a.spent ||
          a.title.localeCompare(b.title),
      );
    }
    if (sortMode === "alphabetical") {
      return next.sort((a, b) => a.title.localeCompare(b.title));
    }
    return next.sort((a, b) => b.spent - a.spent || b.budget - a.budget || a.title.localeCompare(b.title));
  }, [items, sortMode]);
  const thisMonthLabel = useMemo(
    () => currentMonth.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    [currentMonth],
  );
  const totalBudget = useMemo(
    () => items.reduce((sum, item) => sum + item.budget, 0),
    [items],
  );
  const totalSpent = useMemo(
    () => items.reduce((sum, item) => sum + item.spent, 0),
    [items],
  );
  const remainingBudget = useMemo(
    () => Math.max(totalBudget - totalSpent, 0),
    [totalBudget, totalSpent],
  );
  const spendRatio = useMemo(() => {
    if (totalBudget <= 0) return 0;
    return Math.min(Math.max(totalSpent / totalBudget, 0), 1);
  }, [totalBudget, totalSpent]);
  const topSpendingCategory = useMemo(() => {
    if (items.length === 0) return null;
    return items.reduce<SummaryItem | null>((top, item) => {
      if (!top || item.spent > top.spent) return item;
      return top;
    }, null);
  }, [items]);
  const daysInPeriod = useMemo(
    () => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate(),
    [currentMonth],
  );
  const updateScrollEdgeBlur = useCallback((offsetY: number) => {
    const viewportHeight = listViewportHeightRef.current;
    const contentHeight = listContentHeightRef.current;
    if (viewportHeight <= 0 || contentHeight <= 0) {
      if (topBlurVisibleRef.current) {
        topBlurVisibleRef.current = false;
        setShowTopScrollBlur(false);
      }
      if (bottomBlurVisibleRef.current) {
        bottomBlurVisibleRef.current = false;
        setShowBottomScrollBlur(false);
      }
      return;
    }

    const canScroll = contentHeight - viewportHeight > 8;
    const topVisible = canScroll && offsetY > 3;
    const remaining = contentHeight - (offsetY + viewportHeight);
    const bottomVisible = canScroll && remaining > 3;

    if (topBlurVisibleRef.current !== topVisible) {
      topBlurVisibleRef.current = topVisible;
      setShowTopScrollBlur(topVisible);
    }
    if (bottomBlurVisibleRef.current !== bottomVisible) {
      bottomBlurVisibleRef.current = bottomVisible;
      setShowBottomScrollBlur(bottomVisible);
    }
  }, []);
  const handleListLayout = useCallback((height: number) => {
    if (listViewportHeightRef.current === height) return;
    listViewportHeightRef.current = height;
    updateScrollEdgeBlur(0);
  }, [updateScrollEdgeBlur]);
  const handleListContentSizeChange = useCallback((height: number) => {
    if (listContentHeightRef.current === height) return;
    listContentHeightRef.current = height;
    updateScrollEdgeBlur(0);
  }, [updateScrollEdgeBlur]);
  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      updateScrollEdgeBlur(event.nativeEvent.contentOffset.y);
    },
    [updateScrollEdgeBlur],
  );

  return (
    <View style={[styles.screen, isDark ? styles.screenDark : null]}>
      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: listTopPadding, paddingBottom: listBottomPadding }]}
        onLayout={(event) => handleListLayout(event.nativeEvent.layout.height)}
        onContentSizeChange={(_width, height) => handleListContentSizeChange(height)}
        onScroll={handleListScroll}
        scrollEventThrottle={16}

        // Render List Items
        renderItem={({ item }) => (
          <CategoryCard
            title={item.title}
            spent={item.spent}
            budget={item.budget}
            hasBudget={item.budget > 0}
            icon={item.icon}
            color={item.color}
            onBudgetPress={() => openQuickBudget(item)}
            onPress={() => openCategoryDetails(item)}
          />
        )}
        
        ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateTitle, isDark ? styles.emptyStateTitleDark : null]}>No categories for this month</Text>
            <Text style={[styles.emptyStateSubtitle, isDark ? styles.emptyStateSubtitleDark : null]}>
              Add categories from Home to populate Overview.
            </Text>
          </View>
        }
        // Render Header (Summary + Donut)
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.heroCard, isDark ? styles.heroCardDark : null]}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={[styles.heroEyebrow, isDark ? styles.heroEyebrowDark : null]}>Overview</Text>
                  <Text style={[styles.heroTitle, isDark ? styles.heroTitleDark : null]}>Budget Snapshot</Text>
                  <Text style={[styles.heroSubtitle, isDark ? styles.heroSubtitleDark : null]}>
                    Track your monthly budget performance
                  </Text>
                </View>
                <View style={styles.monthPill}>
                  <Text style={styles.monthPillText}>{thisMonthLabel}</Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <View style={[styles.metricCard, isDark ? styles.metricCardDark : null]}>
                  <Text style={[styles.metricLabel, isDark ? styles.metricLabelDark : null]}>Spent</Text>
                  <Text style={[styles.metricValue, isDark ? styles.metricValueDark : null]}>${totalSpent.toFixed(2)}</Text>
                </View>
                <View style={[styles.metricCard, isDark ? styles.metricCardDark : null]}>
                  <Text style={[styles.metricLabel, isDark ? styles.metricLabelDark : null]}>Remaining</Text>
                  <Text style={[styles.metricValue, isDark ? styles.metricValueDark : null]}>
                    ${remainingBudget.toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.progressWrap}>
                <View style={[styles.progressTrack, isDark ? styles.progressTrackDark : null]}>
                  <View style={[styles.progressFill, { width: `${spendRatio * 100}%` }]} />
                </View>
                <Text style={[styles.progressText, isDark ? styles.progressTextDark : null]}>
                  {Math.round(spendRatio * 100)}% of monthly budget used
                </Text>
              </View>

              <View style={[styles.topCategoryRow, isDark ? styles.topCategoryRowDark : null]}>
                <Text style={[styles.topCategoryLabel, isDark ? styles.topCategoryLabelDark : null]}>Top category</Text>
                <Text style={[styles.topCategoryValue, isDark ? styles.topCategoryValueDark : null]}>
                  {topSpendingCategory ? `${topSpendingCategory.title} - $${topSpendingCategory.spent.toFixed(2)}` : "No data"}
                </Text>
              </View>
            </View>

            <MonthlySummaryCard
              items={items}
              daysInPeriod={daysInPeriod}
              onRightPress={() => setEditModalVisible(true)}
              onCategoryPress={openQuickBudget}
            />

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isDark ? styles.sectionTitleDark : null]}>Categories</Text>
              <Text style={[styles.sectionSubtitle, isDark ? styles.sectionSubtitleDark : null]}>
                Detailed allocation by budget bucket
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.sortRow}
                contentContainerStyle={styles.sortRowContent}
              >
                {SORT_OPTIONS.map((option) => {
                  const isActive = sortMode === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      style={({ pressed }) => [
                        styles.sortChip,
                        isDark ? styles.sortChipDark : null,
                        isActive ? styles.sortChipActive : null,
                        pressed ? styles.sortChipPressed : null,
                      ]}
                      onPress={() => setSortMode(option.key)}
                    >
                      <Text
                        style={[
                          styles.sortChipText,
                          isDark ? styles.sortChipTextDark : null,
                          isActive ? styles.sortChipTextActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        }
      />
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ["rgba(0,0,0,0.9)", "rgba(0,0,0,0)"]
            : ["rgba(246,247,251,0.96)", "rgba(246,247,251,0)"]
        }
        style={[styles.scrollBlurTop, !showTopScrollBlur ? styles.scrollBlurHidden : null]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ["rgba(0,0,0,0)", "rgba(0,0,0,0.9)"]
            : ["rgba(246,247,251,0)", "rgba(246,247,251,0.96)"]
        }
        style={[styles.scrollBlurBottom, !showBottomScrollBlur ? styles.scrollBlurHidden : null]}
      />

      <EditBudgetModal
        visible={isEditModalVisible}
        onClose={() => setEditModalVisible(false)}
        initialItems={items}
        onSave={handleSaveBudget}
      />

      <Modal visible={!!quickBudgetTarget} transparent animationType="fade" onRequestClose={closeQuickBudget}>
        <Pressable style={styles.quickBudgetOverlay} onPress={closeQuickBudget}>
          <View style={[styles.quickBudgetCard, isDark ? styles.quickBudgetCardDark : null]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.quickBudgetTitle, isDark ? styles.quickBudgetTitleDark : null]}>Set Budget</Text>
            <Text style={[styles.quickBudgetSubtitle, isDark ? styles.quickBudgetSubtitleDark : null]}>
              {quickBudgetTarget?.title ?? "Category"}
            </Text>

            <View style={[styles.quickBudgetInputWrap, isDark ? styles.quickBudgetInputWrapDark : null]}>
              <Text style={[styles.quickBudgetCurrency, isDark ? styles.quickBudgetCurrencyDark : null]}>$</Text>
              <TextInput
                style={[styles.quickBudgetInput, isDark ? styles.quickBudgetInputDark : null]}
                value={quickBudgetInput}
                onChangeText={setQuickBudgetInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>

            <View style={styles.quickBudgetActions}>
              <TouchableOpacity
                style={[
                  styles.quickBudgetGhostBtn,
                  isDark ? styles.quickBudgetGhostBtnDark : null,
                  !canSaveQuickBudget ? styles.quickBudgetGhostBtnPrimary : null,
                ]}
                onPress={closeQuickBudget}
              >
                <Text
                  style={[
                    styles.quickBudgetGhostText,
                    isDark ? styles.quickBudgetGhostTextDark : null,
                    !canSaveQuickBudget ? styles.quickBudgetGhostTextPrimary : null,
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBudgetPrimaryBtn, !canSaveQuickBudget ? styles.quickBudgetPrimaryBtnDisabled : null]}
                onPress={saveQuickBudget}
                disabled={!canSaveQuickBudget}
              >
                <Text style={[styles.quickBudgetPrimaryText, !canSaveQuickBudget ? styles.quickBudgetPrimaryTextDisabled : null]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            {(quickBudgetTarget && budgetOverrides[quickBudgetTarget.id] > 0) ? (
              <TouchableOpacity style={styles.quickBudgetClearBtn} onPress={clearQuickBudget}>
                <Text style={styles.quickBudgetClearText}>Remove budget</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#F6F7FB",
    flex: 1,
  },
  screenDark: {
    backgroundColor: "#000000",
  },
  scrollBlurTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  scrollBlurBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  scrollBlurHidden: {
    opacity: 0,
  },
  content: {
    paddingBottom: 28,
  },
  header: {
    gap: 14,
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E9ECF3",
    padding: 14,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  heroCardDark: {
    backgroundColor: "#1C1C1D",
    borderColor: "#000000",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroEyebrowDark: {
    color: "#9CA3AF",
  },
  heroTitle: {
    marginTop: 2,
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.4,
  },
  heroTitleDark: {
    color: "#F9FAFB",
  },
  heroSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  heroSubtitleDark: {
    color: "#9CA3AF",
  },
  monthPill: {
    backgroundColor: "#1C1C1D",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  monthPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  metricRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  metricCardDark: {
    backgroundColor: "#1C1C1D",
    borderColor: "#565656",
  },
  metricLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  metricLabelDark: {
    color: "#9CA3AF",
  },
  metricValue: {
    marginTop: 4,
    fontSize: 18,
    color: "#111827",
    fontWeight: "800",
  },
  metricValueDark: {
    color: "#F9FAFB",
  },
  progressWrap: {
    marginTop: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  progressTrackDark: {
    backgroundColor: "#2f2f2f",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  progressText: {
    marginTop: 6,
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
  },
  progressTextDark: {
    color: "#9CA3AF",
  },
  topCategoryRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F7",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  topCategoryRowDark: {
    borderTopColor: "#374151",
  },
  topCategoryLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  topCategoryLabelDark: {
    color: "#9CA3AF",
  },
  topCategoryValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "700",
  },
  topCategoryValueDark: {
    color: "#F9FAFB",
  },
  sectionHeader: {
    marginTop: 4,
    paddingHorizontal: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  sectionTitleDark: {
    color: "#F3F4F6",
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  sectionSubtitleDark: {
    color: "#9CA3AF",
  },
  sortRow: {
    marginTop: 10,
  },
  sortRowContent: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 8,
  },
  sortChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sortChipDark: {
    borderColor: "#404040",
    backgroundColor: "#1C1C1D",
  },
  sortChipActive: {
    backgroundColor: "#1C1C1D",
    borderColor: "#FFFFFF",
    borderWidth: 1.5,
  },
  sortChipPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  sortChipTextDark: {
    color: "#D1D5DB",
  },
  sortChipTextActive: {
    color: "#FFFFFF",
  },
  emptyState: {
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  emptyStateTitleDark: {
    color: "#F3F4F6",
  },
  emptyStateSubtitle: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
  },
  emptyStateSubtitleDark: {
    color: "#9CA3AF",
  },
  quickBudgetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  quickBudgetCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  quickBudgetCardDark: {
    backgroundColor: "#000000",
    borderColor: "#2e2e2e",
  },
  quickBudgetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  quickBudgetTitleDark: {
    color: "#F9FAFB",
  },
  quickBudgetSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  quickBudgetSubtitleDark: {
    color: "#9CA3AF",
  },
  quickBudgetInputWrap: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  quickBudgetInputWrapDark: {
    borderColor: "#4B5563",
    backgroundColor: "#000000",
  },
  quickBudgetCurrency: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginRight: 6,
  },
  quickBudgetCurrencyDark: {
    color: "#F9FAFB",
  },
  quickBudgetInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  quickBudgetInputDark: {
    color: "#F9FAFB",
  },
  quickBudgetActions: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  quickBudgetGhostBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  quickBudgetGhostBtnDark: {
    borderColor: "#4B5563",
    backgroundColor: "#000000",
  },
  quickBudgetGhostText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700",
  },
  quickBudgetGhostTextDark: {
    color: "#E5E7EB",
  },
  quickBudgetGhostBtnPrimary: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  quickBudgetGhostTextPrimary: {
    color: "#FFFFFF",
  },
  quickBudgetPrimaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  quickBudgetPrimaryBtnDisabled: {
    backgroundColor: "#6B7280",
  },
  quickBudgetPrimaryText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "700",
  },
  quickBudgetPrimaryTextDisabled: {
    color: "#E5E7EB",
  },
  quickBudgetClearBtn: {
    marginTop: 10,
    alignItems: "center",
    paddingVertical: 6,
  },
  quickBudgetClearText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
});
