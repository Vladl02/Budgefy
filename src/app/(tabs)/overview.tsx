import React, { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

// Components
import CategoryCard from "@/src/components/overview/category";
import MonthlySummaryCard from "@/src/components/overview/donutCard";
import EditBudgetModal, { SummaryItem } from "@/src/components/overview/EditBudgetModal";
import { SafeArea } from "@/src/components/SafeArea";

const DATA: SummaryItem[] = [
  { id: "1", title: "Shopping", spent: 14, budget: 56, icon: "shopping"},
  { id: "2", title: "Food & Drinks", spent: 14, budget: 76.5, icon: "food" },
  { id: "3", title: "Home Bills", spent: 14, budget: 76.5, icon: "home" },
  { id: "4", title: "Transport", spent: 25, budget: 55, icon: "transport" },
  { id: "5", title: "Groceries", spent: 89, budget: 100, icon: "grocery" },
];

export default function Overview() {
  const [items, setItems] = useState<SummaryItem[]>(DATA);
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
            color={item.color}
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
