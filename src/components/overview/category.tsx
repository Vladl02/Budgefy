import { AppText } from "@/src/app/(tabs)";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
  PiggyBank,
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
  savings: { Icon: PiggyBank, color: "#4FD27E" },
  
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

const ICON_ALIASES: Record<string, IconKey> = {
  shoppingbag: "shopping",
  shoppingcart: "grocery",
  cart: "grocery",
  bus: "transport",
  car: "transport",
  droplets: "bills",
  zap: "bills",
  wifi: "internet",
  coffee: "food",
  utensils: "food",
  film: "entertainment",
  gamepad2: "entertainment",
  banknote: "work",
  piggybank: "savings",
  bookopen: "education",
  graduationcap: "education",
  smartphone: "tech",
  heart: "health",
  pawprint: "pets",
  gift: "gift",
  plane: "travel",
  home: "home",
  music: "music",
  briefcase: "work",
};

const normalizeToken = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

export const resolveCategoryIconKey = (
  rawIcon: string | null | undefined,
  categoryName: string | null | undefined,
): IconKey => {
  const normalizedIcon = normalizeToken(rawIcon);
  const normalizedCategory = normalizeToken(categoryName);

  if (normalizedCategory === "groceries") return "grocery";
  if (normalizedCategory === "transport") return "transport";
  if (normalizedCategory === "utilities") return "bills";
  if (normalizedCategory === "health") return "health";
  if (normalizedCategory === "restaurants") return "food";
  if (normalizedCategory === "entertainment") return "entertainment";
  if (normalizedCategory === "shopping") return "shopping";
  if (normalizedCategory === "education") return "education";
  if (normalizedCategory === "savings") return "savings";

  if (/(groc|supermarket|market)/.test(normalizedCategory)) return "grocery";
  if (/(transport|commute|fuel|gas|ride|taxi|bus|train)/.test(normalizedCategory)) return "transport";
  if (/(utilit|bill|internet|electric|water|phone|wifi)/.test(normalizedCategory)) return "bills";
  if (/(health|medical|doctor|pharma|fitness|wellness)/.test(normalizedCategory)) return "health";
  if (/(restaurant|food|dining|meal|drink|coffee)/.test(normalizedCategory)) return "food";
  if (/(entertain|movie|cinema|game|stream)/.test(normalizedCategory)) return "entertainment";
  if (/(educat|school|course|book|study|tuition)/.test(normalizedCategory)) return "education";
  if (/(shop|clothes|fashion|accessories)/.test(normalizedCategory)) return "shopping";
  if (/(saving|invest|retire|emergencyfund|goal)/.test(normalizedCategory)) return "savings";
  if (/(pet|animal|vet)/.test(normalizedCategory)) return "pets";
  if (/(gift|present)/.test(normalizedCategory)) return "gift";
  if (/(travel|trip|flight|hotel|vacation)/.test(normalizedCategory)) return "travel";
  if (/(salary|work|job|career|income)/.test(normalizedCategory)) return "work";
  if (/(music|audio)/.test(normalizedCategory)) return "music";
  if (/(tech|device|phone|gadget|electronics)/.test(normalizedCategory)) return "tech";
  if (/(home|rent|mortgage|house)/.test(normalizedCategory)) return "home";

  if (rawIcon && rawIcon in CATEGORY_STYLES) {
    return rawIcon as IconKey;
  }

  if (normalizedIcon && ICON_ALIASES[normalizedIcon]) {
    return ICON_ALIASES[normalizedIcon];
  }

  return "shopping";
};

type CategoryCardProps = {
  title: string;
  spent: number;
  budget: number;
  hasBudget?: boolean;
  icon: CategoryKey;
  color?: string;
  onBudgetPress?: () => void;
  onPress?: () => void;
};

export default function CategoryCard({
  title,
  spent,
  budget,
  hasBudget = false,
  icon,
  color,
  onBudgetPress,
  onPress,
}: CategoryCardProps) {
  const remaining = Math.max(budget - spent, 0);
  const progress = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const formatAmount = (value: number) =>
    value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const style = CATEGORY_STYLES[icon] || CATEGORY_STYLES.shopping;
  const activeColor = color || style.color;
  const IconComponent = style.Icon;

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={styles.leftTop}>
          <View style={[styles.iconContainer, { backgroundColor: `${activeColor}20` }]}>
            <IconComponent size={22} strokeWidth={2.5} color={activeColor} />
          </View>
          <View style={styles.titleRow}>
            <AppText style={styles.titleText}>{title}</AppText>
            <ChevronRight size={16} strokeWidth={3} color="#374151" />
          </View>
        </View>
        <Pressable
          style={styles.budgetPill}
          onPress={(event) => {
            event.stopPropagation();
            onBudgetPress?.();
          }}
          hitSlop={8}
        >
          <Text style={styles.budgetText}>{hasBudget ? `$${formatAmount(budget)}` : "Set"}</Text>
        </Pressable>
      </View>

      <View style={styles.midRow}>
        <Text style={styles.meta}>
          Spent: <Text style={styles.metaBold}>${formatAmount(spent)}</Text>
        </Text>
        <Text style={styles.meta}>
          Remaining: <Text style={styles.metaBold}>${formatAmount(remaining)}</Text>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "92%",
    borderRadius: 18,
    backgroundColor: "#fff",
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E9ECF3",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardPressed: {
    transform: [{ scale: 0.992 }],
    opacity: 0.94,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  leftTop: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginRight: 4,
    flexShrink: 1,
  },
  budgetPill: {
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  budgetText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  midRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  meta: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
  },
  metaBold: {
    color: "#111827",
    fontWeight: "800",
  },
  progressWrapper: {
    position: "relative",
    height: 10,
    justifyContent: "center",
    marginTop: 4,
  },
  progressGlow: {
    position: "absolute",
    height: 6,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 6,
    elevation: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#ECEFF5",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
});
