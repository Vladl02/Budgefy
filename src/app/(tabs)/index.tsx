import { AppDrawer, useAppDrawer } from "@/src/components/homepage/AppDrawer";
import { ExpenseGrid, type ExpenseItem } from "@/src/components/homepage/ExpenseGrid";
import { TopBar } from "@/src/components/homepage/TopBar";
import { SafeArea } from "@/src/components/SafeArea";
import { Banknote, Bus, Coffee, Droplets, Film, ShoppingCart, Utensils } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, } from "@expo-google-fonts/inter";

const EXPENSES: ExpenseItem[] = [
  {
    id: "coffee",
    name: "Coffee",
    amount: 12.5,
    backgroundColor: "#c38fee63",
    circleColor: "#C48FEE",
    icon: Coffee,
  },
  {
    id: "transport",
    name: "Transport",
    amount: 36,
    backgroundColor: "#ffc83c66",
    circleColor: "#FFC83C",
    icon: Bus,
  },
  {
    id: "groceries",
    name: "Groceries",
    amount: 128.2,
    backgroundColor: "#00ddb86c",
    circleColor: "#00DDB7",
    icon: ShoppingCart,
  },
  {
    id: "food",
    name: "Food",
    amount: 72.3,
    backgroundColor: "#ff47537e",
    circleColor: "#FF4752",
    icon: Utensils,
  },
  {
    id: "utilities",
    name: "Utilities",
    amount: 64,
    backgroundColor: "#36a8ff6e",
    circleColor: "#36A8FF",
    icon: Droplets,
  },
  {
    id: "entertainment",
    name: "Movies",
    amount: 22,
    backgroundColor: "#ff98495d",
    circleColor: "#FF9949",
    icon: Film,
  },
  {
    id: "cash",
    name: "Cash",
    amount: 90,
    backgroundColor: "rgba(95, 255, 148, 0.35)",
    circleColor: "rgba(95, 255, 148, 1)",
    icon: Banknote,
  },
  
];

function HomeContent() {
  const drawer = useAppDrawer();

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
      <ExpenseGrid items={EXPENSES} />
    </>
  );
}
{/* Custom Text component to apply global font style */}
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
  if (!fontsLoaded) return null;

  return (
    <View style={styles.background}>
      <SafeArea>
        <AppDrawer>
          <HomeContent/>
        </AppDrawer>
      </SafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: "#ffffffff",
    height: "100%"
  },

  expenseTotal: {
    textAlign: "center",
    paddingTop: 4,
    paddingBottom: 4,
  }
})
