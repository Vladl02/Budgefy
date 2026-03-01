import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager, Animated, useWindowDimensions } from "react-native";
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
  onCategoryPress?: (item: SummaryItem) => void;
};

const withOpacity = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return hex;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function MonthlySummaryCard({
  label = "Monthly",
  items,
  daysInPeriod = 31,
  onLeftPress,
  onRightPress,
  onCategoryPress,
}: Props) {
  const { width } = useWindowDimensions();
  const isCompactLayout = width < 380;
  const total = useMemo(() => items.reduce((s, i) => s + i.budget, 0), [items]);
  const perDay = useMemo(() => (daysInPeriod > 0 ? total / daysInPeriod : 0), [total, daysInPeriod]);
  const categoryCount = items.length;
  const averageBudget = useMemo(
    () => (categoryCount > 0 ? total / categoryCount : 0),
    [categoryCount, total],
  );
  const hasAnyBudgetSet = useMemo(
    () => items.some((item) => item.budget > 0),
    [items],
  );

  const data = useMemo(
    () => {
      if (hasAnyBudgetSet) {
        return items
          .filter((item) => item.budget > 0)
          .map((i) => {
            const style = CATEGORY_STYLES[i.icon] || CATEGORY_STYLES.shopping;
            return { value: i.budget, color: i.color || style.color };
          });
      }

      return items.map((i) => {
        const style = CATEGORY_STYLES[i.icon] || CATEGORY_STYLES.shopping;
        const baseColor = i.color || style.color;
        return { value: 1, color: withOpacity(baseColor, 0.22) };
      });
    },
    [hasAnyBudgetSet, items],
  );

  const [collapsed, setCollapsed] = useState(true);
  const rowAnims = useRef<Animated.Value[]>([]).current;
  const getRowAnim = (index: number) => {
    if (!rowAnims[index]) {
      rowAnims[index] = new Animated.Value(collapsed ? 0 : 1);
    }
    return rowAnims[index];
  };

  const animateRows = (toValue: 0 | 1, cb?: () => void) => {
    const anims = Array.from({ length: items.length }, (_, idx) => getRowAnim(idx))
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
    onLeftPress?.();
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
      <View style={styles.controlsRow}>
        <Pressable style={styles.controlBtn} onPress={handleLeftPress} hitSlop={10}>
          {collapsed ? (
            <Maximize2 size={14} color="#111827" strokeWidth={2.5} />
          ) : (
            <Minimize2 size={14} color="#111827" strokeWidth={2.5} />
          )}
        </Pressable>
        <Text style={styles.headerTitle}>Monthly Budget</Text>
        <Pressable style={styles.controlBtn} onPress={onRightPress} hitSlop={10}>
          <Pencil size={14} color="#111827" strokeWidth={2.5} />
        </Pressable>
      </View>

      <View style={[styles.summaryRow, isCompactLayout ? styles.summaryRowCompact : null]}>
        <View style={[styles.donutShell, isCompactLayout ? styles.donutShellCompact : null]}>
          <Donut size={isCompactLayout ? 104 : 116} strokeWidth={isCompactLayout ? 12 : 14} data={data} />
          <View style={[styles.donutCenter, isCompactLayout ? styles.donutCenterCompact : null]}>
            <Text style={styles.donutCenterLabel}>Total</Text>
            <Text style={styles.donutCenterValue}>${formatMoney(total)}</Text>
          </View>
        </View>

        <View style={[styles.statsColumn, isCompactLayout ? styles.statsColumnCompact : null]}>
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statKey}>Period</Text>
              <Text style={styles.statVal}>{label}</Text>
            </View>
            <View style={[styles.statCard, styles.statCardGap]}>
              <Text style={styles.statKey}>Per Day</Text>
              <Text style={styles.statVal}>${formatMoney(perDay)}</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statKey}>Categories</Text>
              <Text style={styles.statVal}>{categoryCount}</Text>
            </View>
            <View style={[styles.statCard, styles.statCardGap]}>
              <Text style={styles.statKey}>Average</Text>
              <Text style={styles.statVal}>${formatMoney(averageBudget)}</Text>
            </View>
          </View>
        </View>
      </View>

      {!collapsed && (
        <View style={styles.rowsSection}>
          {items.map((item, idx) => {
            const pct = total > 0 ? (item.budget / total) * 100 : 0;
            const style = CATEGORY_STYLES[item.icon] || CATEGORY_STYLES.shopping;
            const Icon = style.Icon;
            const activeColor = item.color || style.color;

            const anim = getRowAnim(idx);
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-8, 0],
            });

            return (
              <Animated.View key={item.id} style={{ opacity: anim, transform: [{ translateY }] }}>
                <Pressable
                  style={({ pressed }) => [styles.rowCard, pressed ? styles.rowCardPressed : null]}
                  onPress={() => onCategoryPress?.(item)}
                >
                  <View style={styles.rowTop}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.rowIconBubble, { backgroundColor: `${activeColor}20` }]}>
                        <Icon size={18} color={activeColor} strokeWidth={2.5} />
                      </View>
                      <View style={styles.rowTextWrap}>
                        <Text style={styles.rowTitle}>{item.title}</Text>
                        <Text style={styles.rowPct}>{pct.toFixed(1)}% of total</Text>
                      </View>
                    </View>
                    <Text style={styles.rowAmount}>${formatMoney(item.budget)}</Text>
                  </View>
                  <View style={styles.rowBarTrack}>
                    <View
                      style={[
                        styles.rowBarFill,
                        {
                          backgroundColor: activeColor,
                          width: `${Math.min(Math.max(pct, 0), 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </Pressable>
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
        .padAngle(data.length > 1 ? 0.02 : 0),
    [data.length, innerRadius, radius]
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
    borderRadius: 20,
    padding: 14,
    width: "100%",
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: "#E9ECF3",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: "#111827",
    textTransform: "uppercase",
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  summaryRowCompact: {
    flexDirection: "column",
    alignItems: "center",
  },
  donutShell: {
    width: 118,
    height: 118,
    borderRadius: 59,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginRight: 10,
  },
  donutShellCompact: {
    marginRight: 0,
    marginBottom: 12,
  },
  donutCenter: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEF1F6",
  },
  donutCenterCompact: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  donutCenterLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  donutCenterValue: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  statsColumn: {
    flex: 1,
    paddingTop: 4,
  },
  statsColumnCompact: {
    width: "100%",
    paddingTop: 0,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  statCardGap: {
    marginLeft: 8,
  },
  statKey: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statVal: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  rowsSection: {
    marginTop: 10,
  },
  rowCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF1F5",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 8,
  },
  rowCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowIconBubble: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextWrap: {
    marginLeft: 8,
    flex: 1,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  rowPct: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  rowAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  rowBarTrack: {
    marginTop: 8,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#ECEFF5",
    overflow: "hidden",
  },
  rowBarFill: {
    height: "100%",
    borderRadius: 999,
  },
});
