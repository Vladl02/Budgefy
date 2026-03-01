import type { LucideIcon } from "lucide-react-native";
import { Plus, X } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, type GestureResponderEvent, View } from "react-native";

type ExpenseBoxProps = {
  amount?: string | number;
  backgroundColor?: string;
  circleColor?: string;
  icon?: LucideIcon;
  name: string;
  iconColor?: string;
  isAddCard?: boolean;
  isEditing?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
};

export default function ExpenseBox({
  amount,
  backgroundColor,
  circleColor,
  icon: Icon,
  name,
  iconColor = "#2E2E2E",
  isAddCard = false,
  isEditing = false,
  onPress,
  onLongPress,
  onDelete,
}: ExpenseBoxProps) {
  const didLongPress = React.useRef(false);

  const handlePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    onPress?.();
  };

  const handleLongPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    didLongPress.current = true;
    onLongPress?.();
  };

  const handleAddCardPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onPress?.();
  };

  if (isAddCard) {
    return (
      <Pressable
        onPress={handleAddCardPress}
        style={({ pressed }) => [styles.container, styles.addContainer, pressed ? styles.addPressed : null]}
      >
        <Text style={styles.addTitle}>{name}</Text>
        <View style={styles.addIconCircle}>
          <Plus size={20} color="#111827" />
        </View>
        <Text style={styles.addHint}>Tap to create</Text>
      </Pressable>
    );
  }

  if (isEditing) {
    return (
      <View style={[styles.container, { backgroundColor: backgroundColor ?? "#F5F5F5" }]}>
        <Pressable
          style={styles.deleteButton}
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            onDelete?.();
          }}
        >
          <X size={11} color="#FFFFFF" strokeWidth={3} />
        </Pressable>
        <Text style={styles.name}>{name}</Text>
        <View style={[styles.iconCircle, { backgroundColor: circleColor ?? "#E5E7EB" }]}>
          {Icon ? <Icon size={20} color={iconColor} /> : null}
        </View>
        <Text style={styles.amount}>${amount ?? 0}</Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={220}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: backgroundColor ?? "#F5F5F5" },
        pressed ? styles.cardPressed : null,
      ]}
    >
      <Text style={styles.name}>{name}</Text>
      <View style={[styles.iconCircle, { backgroundColor: circleColor ?? "#E5E7EB" }]}>
        {Icon ? <Icon size={20} color={iconColor} /> : null}
      </View>
      <Text style={styles.amount}>${amount ?? 0}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: 106,
    height: 140,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  deleteButton: {
    position: "absolute",
    top: -6,
    right: -6,
    zIndex: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  addContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
  },
  addPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  addTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  addIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  addHint: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
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
