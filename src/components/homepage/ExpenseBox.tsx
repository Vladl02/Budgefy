import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import { Plus, X } from "lucide-react-native";
import React from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, type GestureResponderEvent, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useAppTheme } from "@/src/providers/AppThemeProvider";

const DEFAULT_CARD_WIDTH = 106;
const DEFAULT_CARD_HEIGHT = 140;

const blendHexWithWhite = (hex: string, amount: number): string => {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return hex;
  }

  const clampAmount = Math.max(0, Math.min(amount, 1));
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * clampAmount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

type ExpenseBoxProps = {
  amount?: string | number;
  backgroundColor?: string;
  circleColor?: string;
  icon?: LucideIcon;
  name: string;
  iconColor?: string;
  budgetUsageRatio?: number | null;
  trendPercent?: number | null;
  isAddCard?: boolean;
  isEditing?: boolean;
  cardWidth?: number;
  cardHeight?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
  interactionMode?: "native" | "passive";
  isPressedVisual?: boolean;
};

function ExpenseBox({
  amount,
  backgroundColor,
  circleColor,
  icon: Icon,
  name,
  iconColor = "#1F2937",
  budgetUsageRatio = null,
  trendPercent = null,
  isAddCard = false,
  isEditing = false,
  cardWidth = DEFAULT_CARD_WIDTH,
  cardHeight = DEFAULT_CARD_HEIGHT,
  onPress,
  onLongPress,
  onDelete,
  interactionMode = "native",
  isPressedVisual = false,
}: ExpenseBoxProps) {
  const { isDark } = useAppTheme();
  const isAndroid = Platform.OS === "android";
  const showGlassGradient = !isAndroid;
  const didLongPress = React.useRef(false);
  const ringSize = 52;
  const ringStrokeWidth = 3;
  const ringRadius = (ringSize - ringStrokeWidth) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const hasBudgetProgress = typeof budgetUsageRatio === "number" && Number.isFinite(budgetUsageRatio);
  const clampedProgress = hasBudgetProgress
    ? Math.max(0, Math.min(budgetUsageRatio as number, 1))
    : 0;
  const progressDashOffset = ringCircumference * (1 - clampedProgress);
  const progressOpacity = hasBudgetProgress ? Math.max(0.2, clampedProgress) : 0;
  const trackOpacity = hasBudgetProgress ? 0.14 : 0;
  const ringColor = circleColor ?? iconColor;
  const hasTrend = typeof trendPercent === "number" && Number.isFinite(trendPercent);
  const absTrendPercent = hasTrend ? Math.min(999, Math.round(Math.abs(trendPercent as number))) : 0;
  const isTrendUp = hasTrend ? (trendPercent as number) > 0.4 : false;
  const isTrendDown = hasTrend ? (trendPercent as number) < -0.4 : false;
  const trendArrow = isTrendUp ? "\u2191" : isTrendDown ? "\u2193" : "\u2192";
  const trendColor = isTrendUp ? "#EF4444" : isTrendDown ? "#10B981" : isDark ? "#9CA3AF" : "#6B7280";
  const trendBgColor = isDark ? "rgba(17,24,39,0.62)" : "rgba(255,255,255,0.74)";

  const cardTint = backgroundColor ?? (isDark ? "rgba(25,32,45,0.7)" : "rgba(248,249,252,0.75)");
  const cardSurfaceColor = isAndroid
    ? circleColor
      ? blendHexWithWhite(circleColor, isDark ? 0.42 : 0.68)
      : isDark
        ? "rgb(40, 52, 71)"
        : "rgb(243, 246, 251)"
    : null;
  const iconBadgeColor = isAndroid
    ? circleColor ?? (isDark ? "rgb(55, 65, 81)" : "rgb(255, 255, 255)")
    : circleColor ?? (isDark ? "rgba(31,41,55,0.6)" : "rgba(255,255,255,0.58)");

  const handlePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    onPress?.();
  };

  const handleLongPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    if (!onLongPress) {
      return;
    }
    didLongPress.current = true;
    onLongPress?.();
  };
  const deleteVisibility = React.useRef(new Animated.Value(isEditing ? 1 : 0)).current;
  const deleteScale = React.useMemo(
    () =>
      deleteVisibility.interpolate({
        inputRange: [0, 1],
        outputRange: [0.7, 1],
      }),
    [deleteVisibility],
  );

  React.useEffect(() => {
    Animated.timing(deleteVisibility, {
      toValue: isEditing ? 1 : 0,
      duration: isEditing ? 70 : 100,
      easing: isEditing ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [deleteVisibility, isEditing]);

  const renderGlassLayers = () => (
    <>
      {!isAndroid ? (
        <View pointerEvents="none" style={[styles.tintLayer, { backgroundColor: cardTint }]} />
      ) : null}
      {showGlassGradient ? (
        <LinearGradient
          pointerEvents="none"
          colors={
            isDark
              ? ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]
              : ["rgba(255,255,255,0.64)", "rgba(255,255,255,0.18)"]
          }
          style={styles.glassGradient}
        />
      ) : null}
    </>
  );

  const renderIcon = () => {
    if (!Icon) return null;
    return (
      <View style={styles.duotoneIconWrap}>
        <Icon size={22} color={iconColor} strokeWidth={1.7} opacity={0.3} />
        <View style={styles.duotoneIconTop}>
          <Icon size={18} color={iconColor} strokeWidth={2.15} />
        </View>
      </View>
    );
  };

  const renderDeleteButton = () => (
    <Animated.View
      pointerEvents={isEditing ? "auto" : "none"}
      style={[
        styles.deleteButtonWrap,
        {
          opacity: deleteVisibility,
          transform: [{ scale: deleteScale }],
        },
      ]}
    >
      <Pressable
        style={styles.deleteButton}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        pressRetentionOffset={{ top: 12, bottom: 12, left: 12, right: 12 }}
        disabled={!isEditing}
        onPress={(event) => {
          event.stopPropagation();
          onDelete?.();
        }}
      >
        <X size={13} color="#FFFFFF" strokeWidth={3} />
      </Pressable>
    </Animated.View>
  );

  const isPassive = interactionMode === "passive";

  if (isAddCard) {
    if (isPassive) {
      return (
        <View
          style={[
            styles.shell,
            { width: cardWidth, height: cardHeight },
            styles.cardBase,
            isDark ? styles.cardBaseDark : styles.cardBaseLight,
            isPressedVisual ? styles.cardPressed : null,
          ]}
        >
          <View style={[styles.surface, cardSurfaceColor ? { backgroundColor: cardSurfaceColor } : null]}>
            {renderGlassLayers()}
            <View style={[styles.content, styles.addCard]}>
              <View style={[styles.addPlusCircle, isDark ? styles.addPlusCircleDark : null]}>
                <Plus size={20} color={isDark ? "#E5E7EB" : "#1F2937"} />
              </View>
              <Text style={[styles.addTitle, isDark ? styles.addTitleDark : null]} numberOfLines={2}>
                {name}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onPress?.();
        }}
        style={({ pressed }) => [
          styles.shell,
          { width: cardWidth, height: cardHeight },
          styles.cardBase,
          isDark ? styles.cardBaseDark : styles.cardBaseLight,
          pressed ? styles.cardPressed : null,
        ]}
      >
        <View style={[styles.surface, cardSurfaceColor ? { backgroundColor: cardSurfaceColor } : null]}>
          {renderGlassLayers()}
          <View style={[styles.content, styles.addCard]}>
            <View style={[styles.addPlusCircle, isDark ? styles.addPlusCircleDark : null]}>
              <Plus size={20} color={isDark ? "#E5E7EB" : "#1F2937"} />
            </View>
            <Text style={[styles.addTitle, isDark ? styles.addTitleDark : null]} numberOfLines={2}>
              {name}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  if (isEditing) {
    if (isPassive) {
      return (
        <View
          style={[
            styles.shell,
            { width: cardWidth, height: cardHeight },
            styles.cardBase,
            isDark ? styles.cardBaseDark : styles.cardBaseLight,
            isPressedVisual ? styles.cardPressed : null,
          ]}
        >
          <View style={[styles.surface, cardSurfaceColor ? { backgroundColor: cardSurfaceColor } : null]}>
            {renderGlassLayers()}
            <View style={styles.content}>
              <Text style={[styles.name, isDark ? styles.textDark : null]} numberOfLines={2}>
                {name}
              </Text>
              <View style={styles.iconRingWrap}>
                {hasBudgetProgress ? (
                  <Svg width={ringSize} height={ringSize} style={styles.progressRing}>
                    <Circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      stroke={ringColor}
                      strokeOpacity={trackOpacity}
                      strokeWidth={ringStrokeWidth}
                      fill="none"
                    />
                    <Circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      stroke={ringColor}
                      strokeOpacity={progressOpacity}
                      strokeWidth={ringStrokeWidth}
                      strokeLinecap="round"
                      strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                      strokeDashoffset={progressDashOffset}
                      fill="none"
                      transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                    />
                  </Svg>
                ) : null}
                <View style={[styles.iconCircle, { backgroundColor: iconBadgeColor }]}>{renderIcon()}</View>
              </View>
              <Text style={[styles.amount, isDark ? styles.textDark : null]} numberOfLines={1}>
                ${amount ?? 0}
              </Text>
            </View>
          </View>
          {renderDeleteButton()}
        </View>
      );
    }

    return (
      <Pressable
        onPress={handlePress}
        style={[
          styles.shell,
          { width: cardWidth, height: cardHeight },
          styles.cardBase,
          isDark ? styles.cardBaseDark : styles.cardBaseLight,
        ]}
      >
        <View style={[styles.surface, cardSurfaceColor ? { backgroundColor: cardSurfaceColor } : null]}>
          {renderGlassLayers()}
          <View style={styles.content}>
            <Text style={[styles.name, isDark ? styles.textDark : null]} numberOfLines={2}>
              {name}
            </Text>
            <View style={styles.iconRingWrap}>
              {hasBudgetProgress ? (
                <Svg width={ringSize} height={ringSize} style={styles.progressRing}>
                  <Circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    stroke={ringColor}
                    strokeOpacity={trackOpacity}
                    strokeWidth={ringStrokeWidth}
                    fill="none"
                  />
                  <Circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    stroke={ringColor}
                    strokeOpacity={progressOpacity}
                    strokeWidth={ringStrokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                    strokeDashoffset={progressDashOffset}
                    fill="none"
                    transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                  />
                </Svg>
              ) : null}
              <View style={[styles.iconCircle, { backgroundColor: iconBadgeColor }]}>{renderIcon()}</View>
            </View>
            <Text style={[styles.amount, isDark ? styles.textDark : null]} numberOfLines={1}>
              ${amount ?? 0}
            </Text>
          </View>
        </View>
        {renderDeleteButton()}
      </Pressable>
    );
  }

  if (isPassive) {
    return (
      <View
        style={[
          styles.shell,
          { width: cardWidth, height: cardHeight },
          styles.cardBase,
          isDark ? styles.cardBaseDark : styles.cardBaseLight,
          isPressedVisual ? styles.cardPressed : null,
        ]}
      >
        <View style={[styles.surface, cardSurfaceColor ? { backgroundColor: cardSurfaceColor } : null]}>
          {renderGlassLayers()}
          <View style={styles.content}>
            <Text style={[styles.name, isDark ? styles.textDark : null]} numberOfLines={2}>
              {name}
            </Text>
            <View style={styles.iconRingWrap}>
              {hasBudgetProgress ? (
                <Svg width={ringSize} height={ringSize} style={styles.progressRing}>
                  <Circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    stroke={ringColor}
                    strokeOpacity={trackOpacity}
                    strokeWidth={ringStrokeWidth}
                    fill="none"
                  />
                  <Circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    stroke={ringColor}
                    strokeOpacity={progressOpacity}
                    strokeWidth={ringStrokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                    strokeDashoffset={progressDashOffset}
                    fill="none"
                    transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                  />
                </Svg>
              ) : null}
              <View style={[styles.iconCircle, { backgroundColor: iconBadgeColor }]}>{renderIcon()}</View>
            </View>
            <Text style={[styles.amount, isDark ? styles.textDark : null]} numberOfLines={1}>
              ${amount ?? 0}
            </Text>
          </View>
        </View>
        {hasTrend ? (
          <View style={[styles.trendBadge, { backgroundColor: trendBgColor }]}>
            <Text style={[styles.trendBadgeText, { color: trendColor }]}>
              {trendArrow} {absTrendPercent}%
            </Text>
          </View>
        ) : null}
        {renderDeleteButton()}
      </View>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      delayLongPress={200}
      style={({ pressed }) => [
        styles.shell,
        { width: cardWidth, height: cardHeight },
        styles.cardBase,
        isDark ? styles.cardBaseDark : styles.cardBaseLight,
        pressed ? styles.cardPressed : null,
      ]}
    >
      <View style={[styles.surface, cardSurfaceColor ? { backgroundColor: cardSurfaceColor } : null]}>
        {renderGlassLayers()}
        <View style={styles.content}>
          <Text style={[styles.name, isDark ? styles.textDark : null]} numberOfLines={2}>
            {name}
          </Text>
          <View style={styles.iconRingWrap}>
            {hasBudgetProgress ? (
              <Svg width={ringSize} height={ringSize} style={styles.progressRing}>
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={ringRadius}
                  stroke={ringColor}
                  strokeOpacity={trackOpacity}
                  strokeWidth={ringStrokeWidth}
                  fill="none"
                />
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={ringRadius}
                  stroke={ringColor}
                  strokeOpacity={progressOpacity}
                  strokeWidth={ringStrokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                  strokeDashoffset={progressDashOffset}
                  fill="none"
                  transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                />
              </Svg>
            ) : null}
            <View style={[styles.iconCircle, { backgroundColor: iconBadgeColor }]}>{renderIcon()}</View>
          </View>
          <Text style={[styles.amount, isDark ? styles.textDark : null]} numberOfLines={1}>
            ${amount ?? 0}
          </Text>
        </View>
      </View>
      {hasTrend ? (
        <View style={[styles.trendBadge, { backgroundColor: trendBgColor }]}>
          <Text style={[styles.trendBadgeText, { color: trendColor }]}>
            {trendArrow} {absTrendPercent}%
          </Text>
        </View>
      ) : null}
      {renderDeleteButton()}
    </Pressable>
  );
}

export default React.memo(ExpenseBox);

const styles = StyleSheet.create({
  shell: {
    position: "relative",
    width: DEFAULT_CARD_WIDTH,
    height: DEFAULT_CARD_HEIGHT,
    borderRadius: 22,
    borderCurve: "continuous",
  },
  surface: {
    flex: 1,
    borderRadius: 22,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardBase: {
    borderWidth: 1,
  },
  cardBaseLight: {
    borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 6,
  },
  cardBaseDark: {
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 8,
  },
  tintLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  glassGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardPressed: {
    transform: [{ scale: 0.992 }],
    opacity: 0.985,
  },
  deleteButtonWrap: {
    position: "absolute",
    top: -8,
    right: -8,
    zIndex: 10,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  trendBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 9,
    paddingHorizontal: 6,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  trendBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.2,
  },
  addCard: {
    justifyContent: "center",
    gap: 12,
  },
  addPlusCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPlusCircleDark: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.14)",
  },
  addTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#374151",
    textAlign: "center",
    lineHeight: 15,
  },
  addTitleDark: {
    color: "#D1D5DB",
  },
  name: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 15,
    color: "#2B2B2B",
    textAlign: "center",
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRingWrap: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRing: {
    position: "absolute",
  },
  duotoneIconWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  duotoneIconTop: {
    position: "absolute",
    top: 3,
    left: 3,
  },
  amount: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#1F2937",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.15,
  },
  textDark: {
    color: "#F3F4F6",
  },
});
