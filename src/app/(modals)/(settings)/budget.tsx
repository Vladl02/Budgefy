import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useRouter } from "expo-router";

// --- Imports ---
import { SlidingSheet } from "@/src/components/SlidingSheet";
import CategoryCard from "@/src/components/overview/category";
import MonthlySummaryCard from "@/src/components/overview/donutCard";
// Import the new separate component
import EditBudgetModal, { SummaryItem } from "@/src/components/overview/EditBudgetModal";

// --- Initial Data ---
const INITIAL_DATA: SummaryItem[] = [
  { id: "1", title: "Shopping", spent: 14, budget: 56, icon: "shopping" },
  { id: "2", title: "Food & Drinks", spent: 14, budget: 76.5, icon: "food" },
  { id: "3", title: "Home Bills", spent: 14, budget: 76.5, icon: "home" },
  { id: "4", title: "Transport", spent: 25, budget: 55, icon: "transport" },
  { id: "5", title: "Groceries", spent: 89, budget: 100, icon: "grocery" },
];

export default function BudgetSheet() {
  const router = useRouter();

  // Main State
  const [items, setItems] = useState(INITIAL_DATA);
  const [isEditModalVisible, setEditModalVisible] = useState(false);

  // Derived State
  const totalSpent = items.reduce((sum, item) => sum + item.spent, 0);

  // Handlers
  const handleDismiss = () => router.back();
  
  const handleSaveBudget = (newItems: SummaryItem[]) => {
    setItems(newItems);
  };

  return (
    <View style={styles.screenWrapper}>
      <SlidingSheet
        onDismiss={handleDismiss}
        heightPercent={0.85}
        backdropOpacity={0.4}
      >
        {() => (
          <View style={styles.sheetContainer}>
            <Text style={styles.sheetTitle}>Monthly Budget</Text>

            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              // Header: Donut Chart + Totals
              ListHeaderComponent={
                <View style={styles.headerComponent}>
                  <MonthlySummaryCard
                    items={items}
                    daysInPeriod={31}
                    // Trigger the modal
                    onRightPress={() => setEditModalVisible(true)}
                  />
                  <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total Spent</Text>
                    <Text style={styles.totalValue}>${totalSpent.toFixed(2)}</Text>
                  </View>
                </View>
              }
              // Items
              renderItem={({ item }) => (
                <CategoryCard
                  title={item.title}
                  spent={item.spent}
                  budget={item.budget}
                  icon={item.icon}
                  color={item.color}
                />
              )}
            />

            {/* Render the Separate Component */}
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
    paddingHorizontal: 0,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1F1F",
    textAlign: "center",
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  headerComponent: {
    marginBottom: 24,
    gap: 16,
  },
  totalContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F1F1F",
  },
});
