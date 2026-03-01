import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { drizzle, useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useSQLiteContext } from "expo-sqlite";
import { Sparkles } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SlidingSheet } from "@/src/components/SlidingSheet";
import MonthlySummaryCard from "@/src/components/overview/donutCard";
import EditBudgetModal, { SummaryItem } from "@/src/components/overview/EditBudgetModal";
import { resolveCategoryIconKey, type IconKey } from "@/src/components/overview/category";
import { categoriesForMonth, paymentSumsByCategory } from "@/src/utils/queries";
import { useBudgetStore } from "@/src/stores/budgetStore";

export default function BudgetSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dbExpo = useSQLiteContext();
  const db = drizzle(dbExpo);

  const { budgetOverrides, setAllBudgets } = useBudgetStore();
  const [isEditModalVisible, setEditModalVisible] = useState(false);

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

  const topSpendingCategory = useMemo(() => {
    if (items.length === 0) return null;
    return [...items].sort((a, b) => (b.spent ?? 0) - (a.spent ?? 0))[0];
  }, [items]);
  const handleDismiss = () => router.back();
  const handleSaveBudget = (newItems: SummaryItem[]) => {
    const nextOverrides = newItems.reduce<Record<string, number>>((acc, item) => {
      if (item.budget > 0) {
        acc[item.id] = item.budget;
      }
      return acc;
    }, {});
    setAllBudgets(nextOverrides);
  };

  return (
    <View style={styles.screenWrapper}>
      <SlidingSheet onDismiss={handleDismiss} heightPercent={0.68} backdropOpacity={0.4}>
        {() => (
          <View style={styles.sheetContainer}>
            <Text style={styles.sheetTitle}>Monthly Budget</Text>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.headerComponent}>
                <MonthlySummaryCard
                  items={items}
                  daysInPeriod={31}
                  onRightPress={() => setEditModalVisible(true)}
                />
                <View style={styles.insightCard}>
                  <View style={styles.insightTopRow}>
                    <View style={styles.insightIconWrap}>
                      <Sparkles size={14} color="#57A7FD" />
                    </View>
                    <Text style={styles.insightLabel}>Top Spend Insight</Text>
                  </View>
                  {topSpendingCategory ? (
                    <>
                      <Text style={styles.insightCategory}>{topSpendingCategory.title}</Text>
                      <Text style={styles.insightValue}>
                        Highest category spend this month: ${(topSpendingCategory.spent ?? 0).toFixed(2)}
                      </Text>
                      <View style={styles.insightChipRow}>
                        <View style={[styles.insightColorDot, { backgroundColor: topSpendingCategory.color ?? "#57A7FD" }]} />
                        <Text style={styles.insightChipText}>Most spent category right now</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.insightValue}>No spending data yet for this month.</Text>
                  )}
                </View>
              </View>
            </ScrollView>

            <EditBudgetModal
              visible={isEditModalVisible}
              onClose={() => setEditModalVisible(false)}
              initialItems={items}
              onSave={handleSaveBudget}
            />
          </View>
        )}
      </SlidingSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: "transparent",
  },
  sheetContainer: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1F1F",
    textAlign: "center",
    marginBottom: 8,
  },
  headerComponent: {
    gap: 12,
  },
  insightCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(87,167,253,0.3)",
    backgroundColor: "#0F172A",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  insightTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  insightIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(87,167,253,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9CC8FF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  insightCategory: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  insightValue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "500",
    color: "#D7E3F7",
    lineHeight: 18,
  },
  insightChipRow: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  insightColorDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  insightChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E5E7EB",
  },
});
