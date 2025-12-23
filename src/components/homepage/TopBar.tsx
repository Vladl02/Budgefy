import { ChevronLeft, ChevronRight, Menu } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Open menu"
        onPress={onMenuPress}
        hitSlop={8}
        style={styles.iconButton}
      >
        <Menu size={22} color="#1f1f1f" />
      </Pressable>

      <View style={styles.titleWrap}>
        <Pressable
          accessibilityLabel="Previous period"
          onPress={onPrevPress}
          hitSlop={8}
          style={styles.navButton}
        >
          <ChevronLeft size={18} color="#1f1f1f" />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Pressable
          accessibilityLabel="Next period"
          onPress={onNextPress}
          hitSlop={8}
          style={styles.navButton}
        >
          <ChevronRight size={18} color="#1f1f1f" />
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
    backgroundColor: "#ffffff",
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
  rightSpacer: {
    width: 36,
    height: 36,
  },
});
