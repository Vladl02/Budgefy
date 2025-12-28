import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown } from "lucide-react-native";

type ReportsDropdownProps<T extends string> = {
  label: string;
  value: T;
  options: readonly T[];
  onSelect: (value: T) => void;
  width?: number;
  beforeOpen?: (trigger: View | null, open: () => void) => void;
};

export default function ReportsDropdown<T extends string>({
  label,
  value,
  options,
  onSelect,
  width,
  beforeOpen,
}: ReportsDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const ref = useRef<View>(null);

  // 0 = closed (down), 1 = open (up)
  const chevronAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(chevronAnim, {
      toValue: open ? 1 : 0,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, chevronAnim]);

  const openDropdown = () => {
    (ref.current as any)?.measureInWindow((x: number, y: number, w: number, h: number) => {
      setPos({ x, y, w, h });
      setOpen(true);
    });
  };

  const closeDropdown = () => setOpen(false);

  return (
    <>
      <Pressable
            style={[styles.pill, width != null ? { width } : null]}
            onPress={() => {
                if (beforeOpen) {
                beforeOpen(ref.current, openDropdown);
                } else {
                openDropdown();
                }
            }}
            >
        <View ref={ref} style={styles.pillInner}>
          <Text style={styles.pillText}>
            {label}: {value}
          </Text>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: chevronAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "180deg"],
                  }),
                },
              ],
            }}
          >
            <ChevronDown size={20} strokeWidth={2} color="#000" />
          </Animated.View>
        </View>
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={closeDropdown}>
        <Pressable style={styles.overlay} onPress={closeDropdown}>
          <View
            style={[
              styles.menu,
              {
                top: pos.y + pos.h + 8,
                left: pos.x,
                width: pos.w || width || 180,
              },
            ]}
          >
            {options.map((opt) => (
              <Pressable
                key={opt}
                style={styles.item}
                onPress={() => {
                  onSelect(opt);
                  closeDropdown();
                }}
              >
                <Text style={styles.itemText}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 30,
    backgroundColor: "rgba(149, 149, 149, 0.52)",
    borderRadius: 30,
    marginHorizontal: 5,
  },
pillInner: {
  height: 30,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 10,
  gap: 3,
},
  pillText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
  },

  overlay: {
    flex: 1,
  },
  menu: {
    position: "absolute",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 999,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  itemText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
});