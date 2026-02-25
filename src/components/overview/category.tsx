import { View, Text, StyleSheet } from "react-native";
import { AppText } from "@/src/app/(tabs)";

import {
  ShoppingBag,
  ShoppingCart,
  ChevronRight,
  Utensils,
  Home,
  Car,
} from "lucide-react-native";

export const CATEGORY_STYLES = {
  shopping: { Icon: ShoppingBag, color: "#F36A63" },
  food: { Icon: Utensils, color: "#F4C85B" },
  home: { Icon: Home, color: "#F2A15A" },
  transport: { Icon: Car, color: "#5B8CFF" },
  grocery: { Icon: ShoppingCart, color: "#B08AF6" },
} as const;

export type IconKey = keyof typeof CATEGORY_STYLES;

export type CategoryKey = keyof typeof CATEGORY_STYLES;

type CategoryCardProps = {
  title: string;
  spent: number;
  budget: number;
  icon: CategoryKey;
};


export default function CategoryCard({ title, spent, budget, icon }: CategoryCardProps) {
  const remaining = Math.max(budget - spent, 0);
  const progress = budget > 0 ? Math.min(spent / budget, 1) : 0;

  const { Icon, color } = CATEGORY_STYLES[icon];

  return (
    <View style={styles.card}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.leftTop}>
          <View style={styles.iconContainer}>
            <Icon size={22} strokeWidth={2.5} color={color} />
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

      {/* Middle row */}
      <View style={styles.midRow}>
        <Text style={styles.meta}>
          Spent: <Text style={styles.metaBold}>${spent}</Text>
        </Text>

        <Text style={styles.meta}>
          Remaining: <Text style={styles.metaBold}>${remaining}</Text>
        </Text>
      </View>

      <View style={styles.progressWrapper}>
  {/* Glow layer */}
  <View
    style={[
      styles.progressGlow,
      {
        width: `${progress * 100}%`,
        backgroundColor: color,
        shadowColor: color,
        shadowRadius: progress > 0.9 ? 14 : 8,
        shadowOpacity: progress > 0.9 ? 1 : 0.8,
      },
    ]}
  />

  {/* Actual bar */}
  <View style={styles.progressTrack}>
    <View
      style={[
        styles.progressFill,
        {
          width: `${progress * 100}%`,
          backgroundColor: color,
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
    paddingHorizontal: 5,
    paddingVertical: 5,
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
  remainingZero: {
  color: "#FF3B30", // iOS 
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

  // iOS glow
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.8,
  shadowRadius: 4,

  // Android glow (best possible)
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
