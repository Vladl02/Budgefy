import React, { useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";

// Components
import { SafeArea } from "@/src/components/SafeArea";
import CategoryCard from "@/src/components/overview/category"; 
import MonthlySummaryCard from "@/src/components/overview/donutCard";
import EditBudgetModal, { SummaryItem } from "@/src/components/overview/EditBudgetModal";

// 1. Updated Initial Data to include 'color'
const INITIAL_DATA: SummaryItem[] = [
  { id: "1", title: "Shopping", spent: 14, budget: 56, icon: "shopping", color: "#F36A63" },
  { id: "2", title: "Food & Drinks", spent: 14, budget: 76.5, icon: "food", color: "#F4C85B" },
  { id: "3", title: "Home Bills", spent: 14, budget: 76.5, icon: "home", color: "#F2A15A" },
  { id: "4", title: "Transport", spent: 25, budget: 55, icon: "transport", color: "#5B8CFF" },
  { id: "5", title: "Groceries", spent: 89, budget: 100, icon: "grocery", color: "#B08AF6" },
];

export default function Overview() {
  const [items, setItems] = useState<SummaryItem[]>(INITIAL_DATA);
  const [isEditModalVisible, setEditModalVisible] = useState(false);

  // 2. Simple state update (no Async storage)
  const handleSaveBudget = (newItems: SummaryItem[]) => {
    setItems(newItems);
  };

  const totalSpent = items.reduce((sum, item) => sum + item.spent, 0);

  return (
    <SafeArea>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        
        // Render List Items
        renderItem={({ item }) => (
          <CategoryCard
            title={item.title}
            spent={item.spent}
            budget={item.budget}
            icon={item.icon}
            color={item.color} // 3. Pass the color prop
          />
        )}
        
        // Render Header (Donut + Total)
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.expenseTotal}>Total Expenses: ${totalSpent.toFixed(2)}</Text>
            
            <MonthlySummaryCard 
              items={items} 
              daysInPeriod={31}
              onRightPress={() => setEditModalVisible(true)} 
            />
          </View>
        }
      />

      <EditBudgetModal
        visible={isEditModalVisible}
        onClose={() => setEditModalVisible(false)}
        initialItems={items}
        onSave={handleSaveBudget}
      />
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingBottom: 24,
  },
  header: {
    gap: 12,
    marginBottom: 16, 
  },
  expenseTotal: {
    textAlign: "center",
    paddingTop: 4,
    paddingBottom: 4,
    fontSize: 16, 
    fontWeight: "600",
    color: "#333",
  },
});