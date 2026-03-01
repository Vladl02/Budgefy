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
import { useBudgetStore } from "@/src/stores/budgetStore";

type SortMode = "budget" | "spent" | "alphabetical";

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "budget", label: "Most Budget" },
  { key: "spent", label: "Most Spent" },
  { key: "alphabetical", label: "A-Z" },
];

export default function Overview() {
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

  const totalSpent = useMemo(() => items.reduce((sum, item) => sum + item.spent, 0), [items]);
  const totalBudget = useMemo(() => items.reduce((sum, item) => sum + item.budget, 0), [items]);
  const remainingBudget = Math.max(totalBudget - totalSpent, 0);
  const spendRatio = totalBudget > 0 ? Math.min(totalSpent / totalBudget, 1) : 0;
  const thisMonthLabel = useMemo(
    () => new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    [],
  );
  const topSpendingCategory = useMemo(() => {
    if (items.length === 0) return null;
    return [...items].sort((a, b) => b.spent - a.spent)[0];
  }, [items]);
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
    <SafeArea style={styles.safeArea}>
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
            <Text style={styles.emptyStateTitle}>No categories for this month</Text>
            <Text style={styles.emptyStateSubtitle}>Add categories from Home to populate Overview.</Text>
          </View>
        }
        // Render Header (Summary + Donut)
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroEyebrow}>Overview</Text>
                  <Text style={styles.heroTitle}>Budget Snapshot</Text>
                  <Text style={styles.heroSubtitle}>Track your monthly budget performance</Text>
                </View>
                <View style={styles.monthPill}>
                  <Text style={styles.monthPillText}>{thisMonthLabel}</Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Spent</Text>
                  <Text style={styles.metricValue}>${totalSpent.toFixed(2)}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Remaining</Text>
                  <Text style={styles.metricValue}>${remainingBudget.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${spendRatio * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>{Math.round(spendRatio * 100)}% of monthly budget used</Text>
              </View>

              <View style={styles.topCategoryRow}>
                <Text style={styles.topCategoryLabel}>Top category</Text>
                <Text style={styles.topCategoryValue}>
                  {topSpendingCategory ? `${topSpendingCategory.title} · $${topSpendingCategory.spent.toFixed(2)}` : "No data"}
                </Text>
              </View>
            </View>

            <MonthlySummaryCard
              items={items}
              daysInPeriod={31}
              onRightPress={() => setEditModalVisible(true)}
              onCategoryPress={openQuickBudget}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <Text style={styles.sectionSubtitle}>Detailed allocation by budget bucket</Text>
              <View style={styles.sortRow}>
                {SORT_OPTIONS.map((option) => {
                  const isActive = sortMode === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      style={({ pressed }) => [
                        styles.sortChip,
                        isActive ? styles.sortChipActive : null,
                        pressed ? styles.sortChipPressed : null,
                      ]}
                      onPress={() => setSortMode(option.key)}
                    >
                      <Text style={[styles.sortChipText, isActive ? styles.sortChipTextActive : null]}>
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
          <View style={styles.quickBudgetCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.quickBudgetTitle}>Set Budget</Text>
            <Text style={styles.quickBudgetSubtitle}>{quickBudgetTarget?.title ?? "Category"}</Text>

            <View style={styles.quickBudgetInputWrap}>
              <Text style={styles.quickBudgetCurrency}>$</Text>
              <TextInput
                style={styles.quickBudgetInput}
                value={quickBudgetInput}
                onChangeText={setQuickBudgetInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>

            <View style={styles.quickBudgetActions}>
              <TouchableOpacity style={styles.quickBudgetGhostBtn} onPress={closeQuickBudget}>
                <Text style={styles.quickBudgetGhostText}>Cancel</Text>
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
  heroTitle: {
    marginTop: 2,
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
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
  metricLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  metricValue: {
    marginTop: 4,
    fontSize: 18,
    color: "#111827",
    fontWeight: "800",
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
  topCategoryLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  topCategoryValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "700",
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
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
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
  emptyStateSubtitle: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
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
  quickBudgetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  quickBudgetSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
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
  quickBudgetCurrency: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginRight: 6,
  },
  quickBudgetInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
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
  quickBudgetGhostText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700",
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
