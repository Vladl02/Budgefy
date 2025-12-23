import { router, type Href } from "expo-router";
import React, { createContext, useContext, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import ReanimatedDrawerLayout, {
    DrawerPosition,
    DrawerType,
    type DrawerLayoutMethods,
} from "react-native-gesture-handler/ReanimatedDrawerLayout";

type DrawerApi = {
  open: () => void;
  close: () => void;
};

const DrawerContext = createContext<DrawerApi | null>(null);

export function useAppDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useAppDrawer must be used inside <AppDrawer />");
  return ctx;
}

export function AppDrawer({ children }: { children: React.ReactNode }) {
  const drawerRef = useRef<DrawerLayoutMethods | null>(null);

  const api = useMemo(
    () => ({
      open: () => drawerRef.current?.openDrawer(),
      close: () => drawerRef.current?.closeDrawer(),
    }),
    []
  );

  const goModal = (href: Href) => {
    api.close();
    router.push(href);
  };

  const renderDrawerContent = () => (
    <View style={styles.drawer}>
      <Text style={styles.title}>Menu</Text>

      <Pressable style={styles.item} onPress={() => goModal("/(modals)/help")}>
        <Text style={styles.itemText}>Help</Text>
      </Pressable>
    </View>
  );

  return (
    <DrawerContext.Provider value={api}>
      <ReanimatedDrawerLayout
        ref={drawerRef}
        drawerWidth={280}
        drawerPosition={DrawerPosition.LEFT}
        drawerType={DrawerType.FRONT}
        overlayColor="rgba(0,0,0,0.35)"
        edgeWidth={30}
        renderNavigationView={renderDrawerContent}
      >
        {children}
      </ReanimatedDrawerLayout>
    </DrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  item: { paddingVertical: 12 },
  itemText: { fontSize: 16 },
});