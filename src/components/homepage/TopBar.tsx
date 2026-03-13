import { ChevronLeft, ChevronRight, Menu } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/src/providers/AppThemeProvider";

type TopBarProps = {
  title?: string;
  onMenuPress?: () => void;
  onPrevPress?: () => void;
  onNextPress?: () => void;
};

export function TopBar({
  title = "This Month",
  onMenuPress,
  onPrevPress,
  onNextPress,
}: TopBarProps) {
  const { isDark } = useAppTheme();
  const iconColor = isDark ? "#c2c2c2" : "#1F1F1F";

  return (
    <View style={[styles.container, isDark ? styles.containerDark : null]}>
      <Pressable
        accessibilityLabel="Open menu"
        onPress={onMenuPress}
        hitSlop={8}
        style={styles.iconButton}
      >
        <Menu size={22} color={iconColor} />
      </Pressable>

      <View style={styles.titleWrap}>
        <Pressable
          accessibilityLabel="Previous period"
          onPress={onPrevPress}
          hitSlop={8}
          style={styles.navButton}
        >
          <ChevronLeft size={18} color={iconColor} />
        </Pressable>
        <Text style={[styles.title, isDark ? styles.titleDark : null]}>{title}</Text>
        <Pressable
          accessibilityLabel="Next period"
          onPress={onNextPress}
          hitSlop={8}
          style={styles.navButton}
        >
          <ChevronRight size={18} color={iconColor} />
        </Pressable>
      </View>

      <View style={styles.rightSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  containerDark: {
    backgroundColor: "#0B0F14",
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  navButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f1f1f",
  },
  titleDark: {
    color: "#F3F4F6",
  },
  rightSpacer: {
    width: 36,
    height: 36,
  },
});
