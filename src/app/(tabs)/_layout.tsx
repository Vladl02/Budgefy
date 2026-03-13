import { Tabs } from "expo-router";
import { MyTabBar } from "../../components/TabBar";
import { useAppTheme } from "@/src/providers/AppThemeProvider";

export default function TabLayout() {
  const { appColors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: appColors.background },
      }}
      tabBar={(props) => <MyTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="reports" options={{ title: "Reports" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="overview" options={{ title: "Overview" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
