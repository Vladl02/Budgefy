import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type ExpenseBoxProps = {
  amount: string | number;
  backgroundColor: string;
  circleColor: string;
  icon: LucideIcon;
  name: string;
  iconColor?: string;
  onPress?: () => void;
};

export default function ExpenseBox({
  amount,
  backgroundColor,
  circleColor,
  icon: Icon,
  name,
  iconColor = "#2E2E2E",
  onPress,
}: ExpenseBoxProps) {
  return (
    <Pressable onPress={onPress} style={[styles.container, { backgroundColor }]}>
      <Text style={styles.name}>{name}</Text>
      <View style={[styles.iconCircle, { backgroundColor: circleColor }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <Text style={styles.amount}>${amount}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 106,
    height: 140,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2B2B2B",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  amount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2B2B2B",
  },
});
