import React, { useMemo, useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager, Animated } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import * as d3 from "d3-shape";
import { Minimize2, Maximize2, Pencil } from "lucide-react-native";
import { CATEGORY_STYLES, IconKey } from "@/src/components/overview/category";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type SummaryItem = {
  id: string;
  title: string;
  spent?: number;
  budget: number;
  icon: IconKey; 
  color?: string; // 1. Added optional color prop
};

type Props = {
  label?: string;
  items: SummaryItem[];
  daysInPeriod?: number;
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

  // 2. Updated Data Memo to prefer item.color
  const data = useMemo(
    () =>
      items.map((i) => {
        // Fallback to dictionary style if item.color or item.icon is missing
        const style = CATEGORY_STYLES[i.icon] || CATEGORY_STYLES.shopping;
        return {
          value: i.budget,
          color: i.color || style.color, // Prefer the custom color
        };
      }),
    [items]
  );

  const [collapsed, setCollapsed] = useState(false);
  const rowAnims = useRef(items.map(() => new Animated.Value(1))).current;

  // Sync animations if items change
  useEffect(() => {
    if (rowAnims.length < items.length) {
      for (let i = rowAnims.length; i < items.length; i++) {
        rowAnims.push(new Animated.Value(collapsed ? 0 : 1));
      }
    }
  }, [items.length, collapsed, rowAnims]);

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
      animateRows(0, () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCollapsed(true);
      });
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCollapsed(false);
      requestAnimationFrame(() => animateRows(1));
    }
  };

  return (
    <View style={styles.card}>
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

      {/* Header area */}
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
            
            // 3. Updated render logic to prefer item.color
            const style = CATEGORY_STYLES[item.icon] || CATEGORY_STYLES.shopping;
            const Icon = style.Icon;
            const activeColor = item.color || style.color; // Prefer custom color

            const anim = rowAnims[idx];
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-8, 0],
            });

            return (
              <Animated.View
                key={item.id}
                style={{ opacity: anim, transform: [{ translateY }] }}
              >
                <View style={styles.row}>
                  <View style={styles.rowLeft}>
                    {/* Use activeColor here */}
                    <Icon size={24} color={activeColor} strokeWidth={2.5} />
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
