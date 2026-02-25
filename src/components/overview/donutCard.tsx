import React, { useMemo, useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager, Animated } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import * as d3 from "d3-shape";
import { Minimize2, Maximize2, Pencil } from "lucide-react-native";
import { CATEGORY_STYLES, IconKey } from "@/src/components/overview/category";
// we enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type SummaryItem = {
  id: string;
  title: string;
  spent?: number;
  budget: number;
  icon: IconKey; // ✅ use the key, not Icon+color
};

type Props = {
  label?: string;          // "Monthly"
  items: SummaryItem[];
  daysInPeriod?: number;   // 31 default
  onLeftPress?: () => void;
  onRightPress?: () => void;
};

export default function MonthlySummaryCard({

  label = "Monthly",
  items,
  daysInPeriod = 31,
  onLeftPress,
  onRightPress,
}: Props) {
  const total = useMemo(() => items.reduce((s, i) => s + i.budget, 0), [items]);
  const perDay = useMemo(() => (daysInPeriod > 0 ? total / daysInPeriod : 0), [total, daysInPeriod]);

const data = useMemo(
  () =>
    items.map((i) => ({
      value: i.budget,
      color: CATEGORY_STYLES[i.icon].color,
    })),
  [items]
);

  const [collapsed, setCollapsed] = useState(false);

  // One Animated.Value per row (0 = hidden, 1 = shown)
  const rowAnims = useRef(items.map(() => new Animated.Value(1))).current;

  // If items length changes, ensure we have enough anim values
  useEffect(() => {
    if (rowAnims.length < items.length) {
      for (let i = rowAnims.length; i < items.length; i++) {
        rowAnims.push(new Animated.Value(collapsed ? 0 : 1));
      }
    }
  }, [items.length, collapsed, rowAnims]);

  //animate the minimize icon rotation
    const animateRows = (toValue: 0 | 1, cb?: () => void) => {
    const anims = rowAnims
      .slice(0, items.length)
      .map((a) =>
        Animated.timing(a, {
          toValue,
          duration: 180,
          useNativeDriver: true,
        })
      );

    Animated.stagger(35, toValue === 1 ? anims : anims.reverse()).start(() => cb?.());
  };

  const handleLeftPress = () => {
    if (!collapsed) {
      // 1) animate rows out
      animateRows(0, () => {
        // 2) animate the card height change when rows are removed
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCollapsed(true);
      });
    } else {
      // 1) animate the card height change when rows are added back
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCollapsed(false);

      // 2) then animate rows in
      requestAnimationFrame(() => animateRows(1));
    }
  };

  return (
    <View style={styles.card}>
      {/* Top corner buttons */}
    <Pressable style={styles.cornerBtn} onPress={handleLeftPress} hitSlop={10}>
      {collapsed ? (
        <Maximize2 size={14} color="#5E6C37" strokeWidth={2.5} />
      ) : (
        <Minimize2 size={14} color="#5E6C37" strokeWidth={2.5} />
      )}
    </Pressable>

      <Pressable style={[styles.cornerBtn, { right: 16, left: undefined }]} onPress={onRightPress} hitSlop={10}>
        <Pencil size={14} color="#5E6C37" strokeWidth={2.5} />
      </Pressable>

      {/* Header area: donut + totals */}
      <View style={styles.headerRow}>
        <Donut size={100} strokeWidth={12} data={data} />

        <View style={styles.totals}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.total}>${formatMoney(total)}</Text>
          <Text style={styles.perDay}>~${formatMoney(perDay)} per day</Text>
        </View>
      </View>

      {/* Rows */}
      {!collapsed && (
        <View>
          {items.map((item, idx) => {
            const pct = total > 0 ? (item.budget / total) * 100 : 0;
            const Icon = CATEGORY_STYLES[item.icon].Icon;

            const anim = rowAnims[idx];
            const opacity = anim;
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-8, 0],
            });

            return (
              <Animated.View
                key={item.id}
                style={{ opacity, transform: [{ translateY }] }}
              >
                <View style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Icon size={24} color={CATEGORY_STYLES[item.icon].color} strokeWidth={2.5} />
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowPct}>{pct.toFixed(2)}%</Text>
                  </View>

                  <Text style={styles.rowAmount}>${formatMoney(item.budget)}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ---------------- Donut ---------------- */

function Donut({
  size,
  strokeWidth,
  data,
}: {
  size: number;
  strokeWidth: number;
  data: { value: number; color: string }[];
}) {
  const radius = size / 2;
  const innerRadius = radius - strokeWidth;

  const arcs = useMemo(() => {
    const pie = d3.pie<{ value: number; color: string }>().value((d) => d.value).sort(null);
    return pie(data);
  }, [data]);

  const arcGen = useMemo(
    () =>
      d3
        .arc<d3.PieArcDatum<{ value: number; color: string }>>()
        .outerRadius(radius)
        .innerRadius(innerRadius)
        .padAngle(0.02),
    [radius, innerRadius]
  );

  return (
    <Svg width={size} height={size}>
      <G x={radius} y={radius}>
        {arcs.map((a, idx) => (
          <Path key={idx} d={arcGen(a) || ""} fill={a.data.color} />
        ))}
      </G>
    </Svg>
  );
}

/* ---------------- Utils ---------------- */

function formatMoney(n: number) {
  // simple formatting; customize to RON later if you want
  return n.toFixed(2).replace(/\.00$/, "");
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    width: "92%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 8,
  },

  cornerBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 30,
    height: 30,
    borderRadius: 18,
    backgroundColor: "rgba(94,108,55,0.18)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 12,
  },

  totals: {
    marginLeft: 16,
    flex: 1,
    alignItems: "center",
  },

  label: {
    color: "rgba(0,0,0,0.45)",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },

  total: {
    fontSize: 32,
    fontWeight: "900",
    color: "#000",

  },

  perDay: {
    color: "rgba(0,0,0,0.35)",
    fontSize: 18,
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },

  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  rowTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#000",
    marginLeft: 6,
  },

  rowPct: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(0,0,0,0.35)",
    marginLeft: 6,
  },

  rowAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
});
