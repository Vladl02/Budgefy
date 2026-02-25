import { AppText } from "@/src/app/(tabs)";
import { StyleSheet, Text, View } from "react-native";

import {
  Briefcase,
  Car,
  ChevronRight, // Bills/Utilities
  Gamepad2, // Pets
  Gift, // Entertainment
  GraduationCap,
  Heart,
  Home, // Work/Salary
  Music, // Education
  PawPrint, // Health
  Plane,
  ShoppingBag,
  ShoppingCart, // Subscriptions
  Smartphone,
  Utensils, // Phone
  Wifi, // Travel
  Zap, // Bills/Utilities
} from "lucide-react-native";

// Expanded Category Styles
export const CATEGORY_STYLES = {
  shopping: { Icon: ShoppingBag, color: "#F36A63" },
  food: { Icon: Utensils, color: "#F4C85B" },
  home: { Icon: Home, color: "#F2A15A" },
  transport: { Icon: Car, color: "#5B8CFF" },
  grocery: { Icon: ShoppingCart, color: "#B08AF6" },
  
  // New Categories
  health: { Icon: Heart, color: "#FF3B30" },
  travel: { Icon: Plane, color: "#5AC8FA" },
  bills: { Icon: Zap, color: "#FFCC00" },
  entertainment: { Icon: Gamepad2, color: "#AF52DE" },
  education: { Icon: GraduationCap, color: "#34C759" },
  pets: { Icon: PawPrint, color: "#A2845E" },
  gift: { Icon: Gift, color: "#FF2D55" },
  work: { Icon: Briefcase, color: "#8E8E93" },
  music: { Icon: Music, color: "#E056FD" },
  tech: { Icon: Smartphone, color: "#30B0C7" },
  internet: { Icon: Wifi, color: "#007AFF" },
} as const;

export type IconKey = keyof typeof CATEGORY_STYLES;
export type CategoryKey = keyof typeof CATEGORY_STYLES;

type CategoryCardProps = {
  title: string;
  spent: number;
  budget: number;
  icon: CategoryKey;
  color?: string;
};

export default function CategoryCard({ title, spent, budget, icon, color }: CategoryCardProps) {
  const remaining = Math.max(budget - spent, 0);
  const progress = budget > 0 ? Math.min(spent / budget, 1) : 0;

  const style = CATEGORY_STYLES[icon] || CATEGORY_STYLES.shopping;
  const activeColor = color || style.color;
  const IconComponent = style.Icon;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.leftTop}>
          <View style={styles.iconContainer}>
            <IconComponent size={22} strokeWidth={2.5} color={activeColor} />
          </View>
          <View style={styles.titleRow}>
            <AppText style={styles.titleText}>{title}</AppText>
            <ChevronRight size={18} strokeWidth={3} color="#000" />
          </View>
        </View>
        <View style={styles.budgetPill}>
          <Text style={styles.budgetText}>${budget}</Text>
        </View>
      </View>

      <View style={styles.midRow}>
        <Text style={styles.meta}>
          Spent: <Text style={styles.metaBold}>${spent}</Text>
        </Text>
        <Text style={styles.meta}>
          Remaining: <Text style={styles.metaBold}>${remaining}</Text>
        </Text>
      </View>

      <View style={styles.progressWrapper}>
        <View
          style={[
            styles.progressGlow,
            {
              width: `${progress * 100}%`,
              backgroundColor: activeColor,
              shadowColor: activeColor,
              shadowRadius: progress > 0.9 ? 14 : 8,
              shadowOpacity: progress > 0.9 ? 1 : 0.8,
            },
          ]}
        />
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: activeColor,
                opacity: progress < 0.9 ? 0.8 : 1,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "92%",
    borderRadius: 10,
    backgroundColor: "#fff",
    alignSelf: "center",
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 6,
    marginTop: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  leftTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
    marginRight: 4,
  },
  budgetPill: {
    backgroundColor: "#F6F6F6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  iconContainer: {
    padding: 4,
    marginRight: 5,
  },
  budgetText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
  },
  midRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  meta: {
    fontSize: 15,
    color: "#000",
  },
  metaBold: {
    fontWeight: "900",
  },
  progressWrapper: {
    position: "relative",
    height: 12,
    justifyContent: "center",
    marginTop: 6,
  },
  progressGlow: {
    position: "absolute",
    height: 8,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#EEE",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
});
