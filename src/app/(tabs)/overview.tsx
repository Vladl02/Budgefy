import CategoryCard, { IconKey } from "@/src/components/overview/category";
import { SafeArea } from "@/src/components/SafeArea";
import { View, Text, FlatList, StyleSheet } from "react-native";
import MonthlySummaryCard from "@/src/components/overview/donutCard";

const DATA: {
  id: string;
  title: string;
  spent: number;
  budget: number;
  icon: IconKey;
}[] = [
  { id: "1", title: "Shopping", spent: 14, budget: 56, icon: "shopping" },
  { id: "2", title: "Food & Drinks", spent: 14, budget: 76.5, icon: "food" },
  { id: "3", title: "Home Bills", spent: 14, budget: 76.5, icon: "home" },
  { id: "4", title: "Transport", spent: 25, budget: 55, icon: "transport" },
  { id: "5", title: "Groceries", spent: 89, budget: 100, icon: "grocery" },
];

const totalSpent = DATA.reduce((sum, item) => sum + item.spent, 0);

export default function Overview() {
  return (
    <SafeArea>
      <FlatList
        data={DATA}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CategoryCard
            title={item.title}
            spent={item.spent}
            budget={item.budget}
            icon={item.icon}
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.expenseTotal}>Total Expenses: ${totalSpent}</Text>
            <MonthlySummaryCard items={DATA} daysInPeriod={31} />
          </View>
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
  },
  expenseTotal: {
    textAlign: "center",
    paddingTop: 4,
    paddingBottom: 4,
  },
});
