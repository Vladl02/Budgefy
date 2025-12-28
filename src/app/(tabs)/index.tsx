import { AppDrawer, useAppDrawer } from "@/src/components/homepage/AppDrawer";
import { ExpenseGrid, type ExpenseItem } from "@/src/components/homepage/ExpenseGrid";
import { TopBar } from "@/src/components/homepage/TopBar";
import { SafeArea } from "@/src/components/SafeArea";
import { useGuardedModalPush } from "@/src/hooks/guardForModals";
import { Banknote, Bus, Coffee, Droplets, Film, ShoppingCart, Utensils } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

const EXPENSES: ExpenseItem[] = [
  {
    id: "coffee",
    name: "Coffee",
    amount: 12.5,
    backgroundColor: "#F7F1E5",
    circleColor: "#EADDC8",
    icon: Coffee,
  },
  {
    id: "transport",
    name: "Transport",
    amount: 36,
    backgroundColor: "#EAF3F7",
    circleColor: "#CFE3EE",
    icon: Bus,
  },
  {
    id: "groceries",
    name: "Groceries",
    amount: 128.2,
    backgroundColor: "#F1F7EE",
    circleColor: "#D8EBCF",
    icon: ShoppingCart,
  },
  {
    id: "food",
    name: "Food",
    amount: 72.3,
    backgroundColor: "#FCECEC",
    circleColor: "#F4C9C9",
    icon: Utensils,
  },
  {
    id: "utilities",
    name: "Utilities",
    amount: 64,
    backgroundColor: "#EDF2FF",
    circleColor: "#D4E0FF",
    icon: Droplets,
  },
  {
    id: "entertainment",
    name: "Movies",
    amount: 22,
    backgroundColor: "#FFF3E6",
    circleColor: "#FFE0BF",
    icon: Film,
  },
  {
    id: "cash",
    name: "Cash",
    amount: 90,
    backgroundColor: "#E9F6F1",
    circleColor: "#CAEADD",
    icon: Banknote,
  },
];

function HomeContent() {
  const drawer = useAppDrawer();
  const { pushModal } = useGuardedModalPush();

  return (
    <>
      <TopBar
        title="This Month"
        onMenuPress={drawer.open}
        onPrevPress={() => {}}
        onNextPress={() => {}}
      />
      <Text style={styles.expenseTotal}>
        Expense 47$
      </Text>
      <ExpenseGrid
        items={EXPENSES}
        onPressItem={(item) =>
          pushModal({
            pathname: "/(modals)/addExpense",
            params: { category: item.name },
          })
        }
      />
    </>
  );
}

export default function HomeScreen() {
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
  expenseTotal: {
    textAlign: "center",
    paddingTop: 4,
    paddingBottom: 4,
  },
});
