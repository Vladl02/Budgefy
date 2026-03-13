import React, { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { drizzle, useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useSQLiteContext } from "expo-sqlite";
import { categoriesForMonth, paymentSumsByCategory } from "@/src/utils/queries";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Components
import CategoryCard, {
  resolveCategoryIconKey,
  type IconKey,
} from "@/src/components/overview/category";
import MonthlySummaryCard from "@/src/components/overview/donutCard";
import EditBudgetModal, { SummaryItem } from "@/src/components/overview/EditBudgetModal";
import { SafeArea } from "@/src/components/SafeArea";
import { useAppTheme } from "@/src/providers/AppThemeProvider";
import { useBudgetStore } from "@/src/stores/budgetStore";

type SortMode = "budget" | "spent" | "alphabetical";

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "budget", label: "Most Budget" },
  { key: "spent", label: "Most Spent" },
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
  const dbExpo = useSQLiteContext();
  const db = drizzle(dbExpo);
  const currentMonth = useMemo(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    [],
  );
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
  const sortedItems = useMemo(() => {
    const next = [...items];
    if (sortMode === "budget") {
      return next.sort((a, b) => b.budget - a.budget || b.spent - a.spent || a.title.localeCompare(b.title));
    }
    if (sortMode === "alphabetical") {
      return next.sort((a, b) => a.title.localeCompare(b.title));
    }
    return next.sort((a, b) => b.spent - a.spent || b.budget - a.budget || a.title.localeCompare(b.title));
  }, [items, sortMode]);

  return (
    <SafeArea style={[styles.safeArea, isDark ? styles.safeAreaDark : null]}>
      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: listBottomPadding }]}

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
            <MonthlySummaryCard
              items={items}
              daysInPeriod={31}
              onRightPress={() => setEditModalVisible(true)}
              onCategoryPress={openQuickBudget}
            />

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isDark ? styles.sectionTitleDark : null]}>Categories</Text>
              <Text style={[styles.sectionSubtitle, isDark ? styles.sectionSubtitleDark : null]}>
                Detailed allocation by budget bucket
              </Text>
              <View style={styles.sortRow}>
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
              </View>
            </View>
          </View>
        }
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
              <TouchableOpacity style={[styles.quickBudgetGhostBtn, isDark ? styles.quickBudgetGhostBtnDark : null]} onPress={closeQuickBudget}>
                <Text style={[styles.quickBudgetGhostText, isDark ? styles.quickBudgetGhostTextDark : null]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBudgetPrimaryBtn} onPress={saveQuickBudget}>
                <Text style={styles.quickBudgetPrimaryText}>Save</Text>
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
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#F6F7FB",
  },
  safeAreaDark: {
    backgroundColor: "#0B0F14",
  },
  content: {
    paddingTop: 12,
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
    backgroundColor: "#111827",
    borderColor: "#374151",
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
    backgroundColor: "#111827",
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
    backgroundColor: "#1F2937",
    borderColor: "#374151",
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
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#111827",
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
    borderColor: "#374151",
    backgroundColor: "#111827",
  },
  sortChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
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
    backgroundColor: "rgba(15,23,42,0.35)",
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
    backgroundColor: "#111827",
    borderColor: "#374151",
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
    backgroundColor: "#1F2937",
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
    backgroundColor: "#111827",
  },
  quickBudgetGhostText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700",
  },
  quickBudgetGhostTextDark: {
    color: "#E5E7EB",
  },
  quickBudgetPrimaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  quickBudgetPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
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
