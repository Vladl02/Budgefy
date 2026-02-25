import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable, Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { ChartPie, House, ScanLine, Scroll, Settings, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ICONS_BY_ROUTE = {
  index: House,
  reports: Scroll,
  scan: ScanLine,
  overview: ChartPie,
  settings: Settings,
} as const;


export function MyTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const [isScanOpen, setIsScanOpen] = useState(false);
  
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.tabbar, { backgroundColor: colors.card, bottom:  insets.bottom+10}]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;
        const isCenter = route.name === "scan";
        const isCenterActive = isCenter ? true : isFocused;
        const Icon = ICONS_BY_ROUTE[route.name as keyof typeof ICONS_BY_ROUTE];
        const iconColor = isCenter || isFocused ? "#ffffffff" : "#000000ff";
        const labelColor = isCenter || isFocused ? "#ffffffff" : "#000000ff";
        
        const labelNode =
          typeof label === "function"
            ? label({
                focused: isCenterActive,
                color: labelColor,
                position: "below-icon",
                children: route.name,
              })
            : label;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (isCenter) {
            if (!event.defaultPrevented) {
              setIsScanOpen(true);
            }
            return;
          }

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <View key={route.key} style={[styles.tabItem, isCenter && styles.tabItemCenter]}>
            <Pressable
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [
                styles.iconBubble,
                isCenter && styles.iconBubbleCenter,
                !isCenter && isFocused && styles.iconBubbleActive,
                isCenterActive && isCenter && styles.iconBubbleCenterActive,
                pressed && styles.iconBubblePressed,
              ]}
            >
              {Icon ? <Icon size={22} color={iconColor} /> : null}
              {typeof labelNode === "string" ? (
              <Text
                style={[
                  styles.label,
                  isCenter && styles.labelCenter,
                  { color: labelColor },
                ]}
              >
                {labelNode}
              </Text>
            ) : (
              labelNode
            )}
            </Pressable>
          </View>
        );
      })}
      <Modal
        visible={isScanOpen}
        animationType="slide"
        onRequestClose={() => setIsScanOpen(false)}
      >
        <View style={styles.modalHeader}>
          <PlatformPressable onPress={() => setIsScanOpen(false)} style={styles.modalClose}>
            <X size={20} color="#3B3B3B" />
          </PlatformPressable>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  tabbar: {
    position: "absolute",
    left: 18,
    right: 18,
    height: 65,
    borderRadius: 36,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    overflow: "visible",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabItemCenter: {
    marginTop: -18,
    marginLeft: 10,
    marginRight: 10,
  },
  iconBubble: {
    width: 65,
    height: 55,
    borderRadius: 30,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconBubblePressed: {
    opacity: 0.85,
  },
  iconBubbleActive: {
    backgroundColor: "#1F1F1F",
    borderRadius: 30,
  },
  iconBubbleCenter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#efdcc6ff",
    overflow: "hidden",
  },
  iconBubbleCenterActive: {
    backgroundColor: "#000000ff",
    borderRadius: 32,
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
  },
  labelCenter: {
    marginTop: 1,
  },
  modalHeader: {
    height: 56,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFEFEF",
  },
});
