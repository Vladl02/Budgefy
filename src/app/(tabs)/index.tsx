import { AppDrawer, useAppDrawer } from "@/src/components/homepage/AppDrawer";
import { ExpenseGrid, type ExpenseItem } from "@/src/components/homepage/ExpenseGrid";
import { TopBar } from "@/src/components/homepage/TopBar";
import { SafeArea } from "@/src/components/SafeArea";
import { useGuardedModalPush } from "@/src/hooks/guardForModals";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import type { LucideIcon } from "lucide-react-native";
import {
  Banknote,
  BookOpen,
  Bus,
  CircleHelp,
  Coffee,
  Droplets,
  Film,
  PiggyBank,
  ShoppingCart,
  Utensils,
} from "lucide-react-native";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { categoriesForMonth, paymentSumsByCategory } from "@/src/utils/queries";
import { drizzle, useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useSQLiteContext } from "expo-sqlite";

const ICONS: Record<string, LucideIcon> = {
  Banknote,
  BookOpen,
  Bus,
  Coffee,
  Droplets,
  Film,
  PiggyBank,
  ShoppingCart,
  Utensils,
};

const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return hex;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function HomeContent() {
  const drawer = useAppDrawer();
  const { pushModal } = useGuardedModalPush();

  const dbExpo = useSQLiteContext();
  const db = drizzle(dbExpo);
  const currentMonth = useMemo(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    [],
  );

  const categoriesQuery = useMemo(
    () => categoriesForMonth(db, currentMonth),
    [db, currentMonth],
  );
  const paymentsQuery = useMemo(
    () => paymentSumsByCategory(db),
    [db],
  );

  const { data: categoriesData } = useLiveQuery(categoriesQuery);
  const { data: paymentSumsData } = useLiveQuery(paymentsQuery);
  const paymentSumsByCategoryId = useMemo(
    () => new Map(paymentSumsData.map((row) => [row.categoryId, Number(row.totalSumCents)])),
    [paymentSumsData],
  );
  const expenseItems = useMemo<ExpenseItem[]>(
    () =>
      categoriesData.map((item) => {
        const circleColor = item.color;
        const icon = ICONS[item.icon] ?? CircleHelp;
        const categoryTotalCents = paymentSumsByCategoryId.get(item.id) ?? 0;
        const categoryTotalNoDecimals = Math.round(categoryTotalCents / 100);

        return {
          id: String(item.id),
          userId: item.userId,
          name: item.categoryName,
          amount: categoryTotalNoDecimals,
          circleColor,
          backgroundColor: withAlpha(circleColor, 0.4),
          icon,
        };
      }),
    [categoriesData, paymentSumsByCategoryId],
  );
  const totalExpenseNoDecimals = useMemo(
    () => Math.round(expenseItems.reduce((acc, item) => acc + Number(item.amount), 0)),
    [expenseItems],
  );

  const handleOpenAddExpense = useCallback(
    (item: ExpenseItem) => {
      pushModal({
        pathname: "/(modals)/addExpense",
        params: {
          category: item.name,
          categoryId: item.id,
          categoryUserId: String(item.userId),
        },
      });
    },
    [pushModal],
  );

  
  return (
    <>
      <TopBar
        title="This Month"
        onMenuPress={drawer.open}
        onPrevPress={() => {}}
        onNextPress={() => {}}
      />
      <Text style={styles.expenseTotal}>
        Expense ${totalExpenseNoDecimals}
      </Text>
      <ExpenseGrid
        items={expenseItems}
        onPressItem={handleOpenAddExpense}
      />
    </>
  );
}

// Custom Text component to apply global font style
export function AppText(props: any) {
  return (
    <Text {...props} style={[{ fontFamily: "Inter_600Bold" }, props.style]} />
  );
}

export default function HomeScreen() {

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })
  if (!fontsLoaded) {
    return (
      <View style={styles.fontLoading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <SafeArea>
        <AppDrawer>
          <HomeContent />
        </AppDrawer>
      </SafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: "#ffffffff",
    height: "100%",
  },
  fontLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffffff",
  },
  expenseTotal: {
    textAlign: "center",
    paddingTop: 4,
    paddingBottom: 4,
  },
});
