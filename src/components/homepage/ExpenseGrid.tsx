import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import ExpenseBox from "./ExpenseBox";

export type ExpenseItem = {
  id: string;
  userId: number;
  amount: string | number;
  backgroundColor: string;
  circleColor: string;
  icon: LucideIcon;
  name: string;
  iconColor?: string;
};

type ExpenseGridProps = {
  items: ExpenseItem[];
  onPressItem?: (item: ExpenseItem) => void;
};

export function ExpenseGrid({ items, onPressItem }: ExpenseGridProps) {
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={3}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <ExpenseBox
            amount={item.amount}
            backgroundColor={item.backgroundColor}
            circleColor={item.circleColor}
            icon={item.icon}
            name={item.name}
            iconColor={item.iconColor}
            onPress={() => onPressItem?.(item)}
          />
        </View>
      )}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: {
    justifyContent: "space-between",
  },
  item: {
    marginBottom: 12,
  },
});
