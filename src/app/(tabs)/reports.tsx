import { ReceiptDetailModal } from "@/src/components/Reports/ReceiptDetailModal";
import { SelectionModal } from "@/src/components/Reports/SelectionModal";
import { STATUS_CONFIG } from "@/src/components/Reports/constants";
import type { ReceiptItem } from "@/src/components/Reports/types";
import { CATEGORY_STYLES, resolveCategoryIconKey } from "@/src/components/overview/category";
import { categories as categoriesTable, payments as paymentsTable } from "@/src/db/schema";
import { useAppTheme } from "@/src/providers/AppThemeProvider";
import { useProcessingReceiptsStore } from "@/src/stores/receiptProcessingStore";
import { useIsFocused } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { desc, eq, sql } from "drizzle-orm";
import { drizzle, useLiveQuery } from "drizzle-orm/expo-sqlite";
import { LinearGradient } from "expo-linear-gradient";
import { useSQLiteContext } from "expo-sqlite";
import type { LucideIcon } from "lucide-react-native";
import {
  ChevronDown,
  ChevronRight,
  Info,
  Minus,
  ReceiptText,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
const MONTH_LABEL_FORMAT: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };
const TRANSACTION_DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
const DATE_METHOD_SEPARATOR = " - ";

const formatMonthLabel = (date: Date): string => date.toLocaleDateString("en-US", MONTH_LABEL_FORMAT);
const formatGroupDateLabel = (date: Date): string =>
  date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
const formatTransactionDateLabel = (date: Date | string): string =>
  getSafeDate(date).toLocaleDateString("en-GB", TRANSACTION_DATE_FORMAT);
const withAlpha = (hexColor: string, alpha: number): string => {
  const normalized = hexColor.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(17, 24, 39, ${alpha})`;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
const CURRENCY_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};
const TOTAL_SPEND_ANIMATION_DELAY_MS = 140;
const TOTAL_SPEND_ANIMATION_DURATION_MS = 820;
const MONTH_SWITCH_FALLBACK_MS = 420;
const formatCurrencyValue = (value: number): string => value.toLocaleString("en-US", CURRENCY_FORMAT_OPTIONS);
let lastKnownTotalSpendValue: number | null = null;
const parseAmountValue = (rawAmount: string): number => {
  const sanitized = rawAmount.replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  if (!sanitized) return 0;

  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");
  let normalized = sanitized;

  if (lastComma >= 0 && lastDot >= 0) {
    // Use the last separator as decimal, and strip the other separator as thousands.
    if (lastComma > lastDot) {
      normalized = sanitized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = sanitized.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    normalized = sanitized.replace(",", ".");
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
const parseReceiptAmount = (amount: string): number => parseAmountValue(amount);
const toMonthStart = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const getSafeDate = (value: Date | number | string | null | undefined): Date => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value >= 1_000_000_000_000 ? value : value * 1000;
    const parsedFromNumber = new Date(ms);
    return Number.isNaN(parsedFromNumber.getTime()) ? new Date() : parsedFromNumber;
  }

  if (typeof value === "string" && /^\d{10,13}$/.test(value.trim())) {
    const numeric = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(numeric)) {
      const ms = value.trim().length === 13 ? numeric : numeric * 1000;
      const parsedFromNumericString = new Date(ms);
      if (!Number.isNaN(parsedFromNumericString.getTime())) {
        return parsedFromNumericString;
      }
    }
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yearRaw, monthRaw, dayRaw] = value.split("-");
    const year = Number.parseInt(yearRaw, 10);
    const month = Number.parseInt(monthRaw, 10);
    const day = Number.parseInt(dayRaw, 10);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  const parsed = value instanceof Date ? value : value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};
const toLocalNoonTimestamp = (value: Date | string): number => {
  const safeDate = getSafeDate(value);
  return new Date(safeDate.getFullYear(), safeDate.getMonth(), safeDate.getDate(), 12, 0, 0, 0).getTime();
};
const toLocalDateKey = (value: Date | number | string | null | undefined): string => {
  const safeDate = getSafeDate(value);
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
type ReceiptGroup = {
  id: string;
  fullDate: string;
  label: string;
  items: ReceiptItem[];
};

type TotalSpendAnimationProps = {
  committedTotalSpendDisplay: string;
  incomingTotalSpendDisplay: string | null;
  totalSpendSizerText: string;
  outgoingTotalOpacity: Animated.AnimatedInterpolation<number> | number;
  incomingTotalOpacity: Animated.AnimatedInterpolation<number> | number;
  outgoingTotalTranslateY: Animated.AnimatedInterpolation<number> | number;
  incomingTotalTranslateY: Animated.AnimatedInterpolation<number> | number;
  outgoingTotalBlur: Animated.AnimatedInterpolation<number> | number;
  incomingTotalBlur: Animated.AnimatedInterpolation<number> | number;
};

type ReportsListHeaderProps = {
  isDark: boolean;
  currentMonthLabel: string;
  onOpenMonthPicker: () => void;
  totalSpend: TotalSpendAnimationProps;
  processingWidget: React.ReactNode;
  trendColor: string;
  trendBackgroundColor: string;
  trendLabel: string;
  TrendIcon: LucideIcon;
  onOpenTrendInfo: () => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
};

function ReportsListHeader({
  isDark,
  currentMonthLabel,
  onOpenMonthPicker,
  totalSpend,
  processingWidget,
  trendColor,
  trendBackgroundColor,
  trendLabel,
  TrendIcon,
  onOpenTrendInfo,
  searchQuery,
  onSearchQueryChange,
}: ReportsListHeaderProps) {
  return (
    <>
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <Text style={[styles.pageTitle, isDark ? styles.pageTitleDark : null]}>History</Text>
          <TouchableOpacity
            style={[styles.headerBadge, isDark ? styles.headerBadgeDark : null]}
            activeOpacity={0.85}
            onPress={onOpenMonthPicker}
          >
            <View style={styles.headerBadgeDot} />
            <Text style={[styles.headerBadgeText, isDark ? styles.headerBadgeTextDark : null]}>{currentMonthLabel}</Text>
            <ChevronDown size={14} color={isDark ? "#E5E7EB" : "#111827"} style={styles.headerBadgeIcon} />
          </TouchableOpacity>
        </View>

        <View style={[styles.summaryCard, isDark ? styles.summaryCardDark : null]}>
          <View style={styles.summaryMain}>
            <Text style={[styles.summaryLabel, isDark ? styles.summaryLabelDark : null]}>Total Spend</Text>
            <View style={styles.summaryAmountRow}>
              <Text style={[styles.summaryAmountCurrency, isDark ? styles.summaryAmountTextDark : null]}>RON</Text>
              <View style={styles.summaryAmountViewport}>
                <Text style={[styles.summaryAmountNumber, styles.summaryAmountSizer, isDark ? styles.summaryAmountTextDark : null]}>
                  {totalSpend.totalSpendSizerText}
                </Text>
                {totalSpend.incomingTotalSpendDisplay ? (
                  <>
                    <Animated.Text
                      style={[
                        styles.summaryAmountNumber,
                        styles.summaryAmountAnimatedLayer,
                        isDark ? styles.summaryAmountTextDark : null,
                        {
                          opacity: totalSpend.outgoingTotalOpacity,
                          transform: [{ translateY: totalSpend.outgoingTotalTranslateY }],
                          textShadowRadius: totalSpend.outgoingTotalBlur,
                        },
                      ]}
                    >
                      {totalSpend.committedTotalSpendDisplay}
                    </Animated.Text>
                    <Animated.Text
                      style={[
                        styles.summaryAmountNumber,
                        styles.summaryAmountAnimatedLayer,
                        isDark ? styles.summaryAmountTextDark : null,
                        {
                          opacity: totalSpend.incomingTotalOpacity,
                          transform: [{ translateY: totalSpend.incomingTotalTranslateY }],
                          textShadowRadius: totalSpend.incomingTotalBlur,
                        },
                      ]}
                    >
                      {totalSpend.incomingTotalSpendDisplay}
                    </Animated.Text>
                  </>
                ) : (
                  <Text style={[styles.summaryAmountNumber, styles.summaryAmountAnimatedLayer, isDark ? styles.summaryAmountTextDark : null]}>
                    {totalSpend.committedTotalSpendDisplay}
                  </Text>
                )}
              </View>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onOpenTrendInfo}
            style={[styles.trendBadge, { backgroundColor: trendBackgroundColor }]}
          >
            <TrendIcon size={13} color={trendColor} />
            <Text
              numberOfLines={1}
              style={[styles.trendText, { color: trendColor }]}
            >
              {trendLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {processingWidget ? <View style={styles.processingWidgetWrap}>{processingWidget}</View> : null}
      </View>

      <View style={styles.controlsSection}>
        <View style={[styles.searchBar, isDark ? styles.searchBarDark : null]}>
          <Search size={20} color="#8E8E93" />
          <TextInput
            style={[styles.searchInput, isDark ? styles.searchInputDark : null]}
            placeholder="Search receipts, items, merchants..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>
    </>
  );
}

type ReceiptRowProps = {
  receipt: ReceiptItem;
  isDark: boolean;
  isLast: boolean;
  onOpen: (receipt: ReceiptItem) => void;
};

type ProcessingStatusWidgetProps = {
  processingReceipt: ReceiptItem | null;
  latestResultReceipt: ReceiptItem | null;
  isDark: boolean;
};

function ProcessingStatusWidget({ processingReceipt, latestResultReceipt, isDark }: ProcessingStatusWidgetProps) {
  const scanProgress = useRef(new Animated.Value(0)).current;
  const isScanning = Boolean(processingReceipt);
  const activeReceipt = processingReceipt ?? latestResultReceipt;

  useEffect(() => {
    if (!isScanning) {
      return;
    }
    scanProgress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(scanProgress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [isScanning, scanProgress]);

  if (!activeReceipt) {
    return null;
  }

  const scanTranslateX = scanProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 120],
  });
  const pulseOpacity = scanProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.35, 0.85, 0.35],
  });

  return (
    <View style={[styles.processingWidgetCard, isDark ? styles.processingWidgetCardDark : null]}>
      <View style={[styles.processingWidgetIconWrap, isDark ? styles.processingWidgetIconWrapDark : null]}>
        {isScanning ? (
          <ActivityIndicator size="small" color={isDark ? "#93C5FD" : "#2563EB"} />
        ) : (
          <Text style={[styles.processingWidgetDoneIcon, isDark ? styles.processingWidgetDoneIconDark : null]}>✓</Text>
        )}
      </View>
      <View style={styles.processingWidgetBody}>
        <Text style={[styles.processingWidgetTitle, isDark ? styles.processingWidgetTitleDark : null]} numberOfLines={1}>
          {isScanning ? "Scanning receipt..." : "Receipt added"}
        </Text>
        <Text style={[styles.processingWidgetSubtitle, isDark ? styles.processingWidgetSubtitleDark : null]} numberOfLines={1}>
          {activeReceipt.comment?.trim() || (isScanning ? "Analyzing items..." : "Saved to history")}
        </Text>
        {isScanning ? (
          <Animated.View style={[styles.processingWidgetTrack, isDark ? styles.processingWidgetTrackDark : null, { opacity: pulseOpacity }]}>
            <Animated.View
              style={[
                styles.processingWidgetSweep,
                isDark ? styles.processingWidgetSweepDark : null,
                { transform: [{ translateX: scanTranslateX }] },
              ]}
            />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

function ReceiptRow({ receipt, isDark, isLast, onOpen }: ReceiptRowProps) {
  const statusConfig = STATUS_CONFIG[receipt.status] || STATUS_CONFIG.processed;
  const transactionDateLabel = formatTransactionDateLabel(receipt.fullDate);
  const isManualEntry = receipt.sourceType === "manual";
  const categoryColor = receipt.categoryColor ?? "#8E8E93";
  const categoryIconBg = withAlpha(categoryColor, isDark ? 0.22 : 0.14);
  const categoryIconKey = resolveCategoryIconKey(receipt.categoryIconName, receipt.category);
  const CategoryIcon = CATEGORY_STYLES[categoryIconKey].Icon;

  return (
    <View key={receipt.id}>
      <TouchableOpacity
        activeOpacity={0.72}
        onPress={() => onOpen(receipt)}
        style={styles.groupRowPressable}
      >
        <View style={styles.groupRow}>
          <View
            style={[
              styles.groupIconContainer,
              isDark ? styles.groupIconContainerDark : null,
              isManualEntry ? { backgroundColor: categoryIconBg, borderColor: withAlpha(categoryColor, 0.45), borderWidth: 1 } : null,
            ]}
          >
            {isManualEntry ? (
              <CategoryIcon size={20} color={categoryColor} />
            ) : (
              <ReceiptText size={20} color={isDark ? "#E5E7EB" : "#111111"} />
            )}
          </View>

          <View style={styles.groupTextColumn}>
            <Text style={[styles.groupTitleText, isDark ? styles.groupTitleTextDark : null]} numberOfLines={1}>
              {receipt.title}
            </Text>
            <Text style={[styles.groupMetaText, isDark ? styles.groupMetaTextDark : null]} numberOfLines={1}>
              {transactionDateLabel}
            </Text>
          </View>

          <View style={styles.groupSpacer} />

          <View style={styles.groupRightColumn}>
            <Text style={[styles.groupAmountText, isDark ? styles.groupAmountTextDark : null]}>{receipt.amount}</Text>
            <View style={[styles.groupStatusPill, { backgroundColor: statusConfig.bg }]}>
              <View style={[styles.groupStatusDot, { backgroundColor: statusConfig.color }]} />
              <Text style={[styles.groupStatusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
          </View>
          <ChevronRight size={14} color={isDark ? "#6B7280" : "#B8BDC7"} style={styles.groupChevron} />
        </View>
      </TouchableOpacity>

      {isLast ? null : <View style={[styles.groupRowDivider, isDark ? styles.groupRowDividerDark : null]} />}
    </View>
  );
}

type ReceiptGroupSectionProps = {
  group: ReceiptGroup;
  isDark: boolean;
  onOpen: (receipt: ReceiptItem) => void;
};

function ReceiptGroupSection({ group, isDark, onOpen }: ReceiptGroupSectionProps) {
  return (
    <View style={styles.groupWrap}>
      <Text style={[styles.groupDateLabel, isDark ? styles.groupDateLabelDark : null]}>{group.label}</Text>
      <View style={[styles.groupCard, isDark ? styles.groupCardDark : null]}>
        {group.items.map((receipt, index) => (
          <ReceiptRow
            key={receipt.id}
            receipt={receipt}
            isDark={isDark}
            isLast={index === group.items.length - 1}
            onOpen={onOpen}
          />
        ))}
      </View>
    </View>
  );
}

export default function Reports() {
  const isFocused = useIsFocused();
  const { isDark } = useAppTheme();
  const { processingReceipts } = useProcessingReceiptsStore();
  const [receiptEdits, setReceiptEdits] = useState<Record<string, ReceiptItem>>({});
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showTrendInfo, setShowTrendInfo] = useState(false);
  const [selectedMonthStart, setSelectedMonthStart] = useState<Date>(() => toMonthStart(new Date()));
  const [isMonthSwitching, setIsMonthSwitching] = useState(false);
  const [showTopScrollBlur, setShowTopScrollBlur] = useState(false);
  const [showBottomScrollBlur, setShowBottomScrollBlur] = useState(false);
  const pendingMonthStartRef = useRef<Date | null>(null);
  const monthSwitchStartUpdatedAtRef = useRef<number>(0);
  const monthSwitchCommittedRef = useRef(false);
  const monthSwitchTargetStartMsRef = useRef<number | null>(null);
  const monthSwitchFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listViewportHeightRef = useRef(0);
  const listContentHeightRef = useRef(0);

  const dbExpo = useSQLiteContext();
  const db = useMemo(() => drizzle(dbExpo), [dbExpo]);

  const monthWindowPaymentsQuery = useMemo(
    () => {
      const paymentMonthKeyExpr = sql<string>`strftime('%Y-%m', ${paymentsTable.timedAt}, 'unixepoch', 'localtime')`;

      return db
        .select({
          paymentId: paymentsTable.id,
          sumCents: paymentsTable.sum,
          marketName: paymentsTable.marketName,
          sourceType: paymentsTable.sourceType,
          paymentDate: paymentsTable.timedAt,
          receiptPhotoLink: paymentsTable.receiptPhotoLink,
          categoryName: categoriesTable.categoryName,
          categoryColor: categoriesTable.color,
          categoryIcon: categoriesTable.icon,
          monthKey: paymentMonthKeyExpr,
        })
        .from(paymentsTable)
        .leftJoin(categoriesTable, eq(paymentsTable.categoryId, categoriesTable.id))
        .orderBy(desc(paymentsTable.timedAt), desc(paymentsTable.id));
    },
    [db],
  );
  const {
    data: monthWindowPaymentsData,
    updatedAt: monthWindowPaymentsUpdatedAt,
  } = useLiveQuery(monthWindowPaymentsQuery);

  const categoriesQuery = useMemo(
    () =>
      db
        .select({
          id: categoriesTable.id,
          categoryName: categoriesTable.categoryName,
          color: categoriesTable.color,
          monthStart: categoriesTable.monthStart,
        })
        .from(categoriesTable)
        .where(eq(categoriesTable.monthStart, selectedMonthStart))
        .orderBy(categoriesTable.id),
    [db, selectedMonthStart],
  );
  const {
    data: categoriesData,
    updatedAt: categoriesUpdatedAt,
  } = useLiveQuery(categoriesQuery);

  const paymentMonthsQuery = useMemo(
    () => {
      const yearExpr = sql<number>`cast(strftime('%Y', ${paymentsTable.timedAt}, 'unixepoch', 'localtime') as integer)`;
      const monthExpr = sql<number>`cast(strftime('%m', ${paymentsTable.timedAt}, 'unixepoch', 'localtime') as integer)`;

      return db
        .select({ year: yearExpr, month: monthExpr })
        .from(paymentsTable)
        .groupBy(yearExpr, monthExpr)
        .orderBy(desc(yearExpr), desc(monthExpr));
    },
    [db],
  );
  const {
    data: paymentMonthsData,
    updatedAt: paymentMonthsUpdatedAt,
  } = useLiveQuery(paymentMonthsQuery);
  const isInitialDataLoading =
    !monthWindowPaymentsUpdatedAt || !categoriesUpdatedAt || !paymentMonthsUpdatedAt;
  const isReportsLoading = isInitialDataLoading || isMonthSwitching;

  const dbReceipts = useMemo<ReceiptItem[]>(() => {
    const selectedMonthKey = `${selectedMonthStart.getFullYear()}-${String(selectedMonthStart.getMonth() + 1).padStart(2, "0")}`;
    return monthWindowPaymentsData
      .filter((payment) => payment.monthKey === selectedMonthKey)
      .map((payment) => {
        const safeDate = getSafeDate(payment.paymentDate as Date | number | string | null | undefined);
        const fullDate = toLocalDateKey(safeDate);
        const shortDate = safeDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const amount = Number(payment.sumCents ?? 0) / 100;
        const category = payment.categoryName?.trim() || "General";
        const merchant = payment.marketName?.trim() || category;

        return {
          id: `db-${payment.paymentId}`,
          title: merchant,
          date: `${shortDate}${DATE_METHOD_SEPARATOR}Card`,
          amount: `RON ${amount.toFixed(2)}`,
          fullDate,
          category,
          currency: "RON",
          comment: "",
          fullPage: false,
          receiptPhotoUri: payment.receiptPhotoLink ?? null,
          status: "processed",
          sourceType: payment.sourceType ?? "manual",
          categoryIconName: payment.categoryIcon ?? null,
          categoryColor: payment.categoryColor ?? null,
        };
      });
  }, [monthWindowPaymentsData, selectedMonthStart]);

  const receipts = useMemo(
    () => dbReceipts.map((item) => ({ ...item, ...(receiptEdits[item.id] ?? {}) })),
    [dbReceipts, receiptEdits],
  );

  const monthReceipts = useMemo(() => {
    return receipts
      .sort((a, b) => getSafeDate(b.fullDate).getTime() - getSafeDate(a.fullDate).getTime());
  }, [receipts]);

  const totalSpendValue = useMemo(() => {
    return monthReceipts.reduce((sum, item) => {
      const numericAmount = parseReceiptAmount(item.amount);
      return sum + numericAmount;
    }, 0);
  }, [monthReceipts]);
  const [committedTotalSpendValue, setCommittedTotalSpendValue] = useState<number>(
    () => lastKnownTotalSpendValue ?? totalSpendValue,
  );
  const [incomingTotalSpendValue, setIncomingTotalSpendValue] = useState<number | null>(null);
  const committedTotalSpendRef = useRef<number>(lastKnownTotalSpendValue ?? totalSpendValue);
  const incomingTotalSpendRef = useRef<number | null>(null);
  const pendingTotalSpendValue = useRef<number | null>(null);
  const totalSpendFlowProgress = useRef(new Animated.Value(1)).current;

  const animateTotalSpend = useCallback(
    (nextValue: number) => {
      const baseValue = incomingTotalSpendRef.current ?? committedTotalSpendRef.current;
      const normalizedBase = Math.round((baseValue + Number.EPSILON) * 100) / 100;
      const normalizedNext = Math.round((nextValue + Number.EPSILON) * 100) / 100;
      const hasMeaningfulDelta = Math.abs(normalizedBase - normalizedNext) >= 0.005;

      totalSpendFlowProgress.stopAnimation();

      if (!hasMeaningfulDelta) {
        totalSpendFlowProgress.setValue(1);
        committedTotalSpendRef.current = normalizedNext;
        incomingTotalSpendRef.current = null;
        setCommittedTotalSpendValue(normalizedNext);
        setIncomingTotalSpendValue(null);
        lastKnownTotalSpendValue = normalizedNext;
        return;
      }

      committedTotalSpendRef.current = normalizedBase;
      incomingTotalSpendRef.current = normalizedNext;
      setCommittedTotalSpendValue(normalizedBase);
      setIncomingTotalSpendValue(normalizedNext);
      totalSpendFlowProgress.setValue(0);

      Animated.timing(totalSpendFlowProgress, {
        toValue: 1,
        delay: TOTAL_SPEND_ANIMATION_DELAY_MS,
        duration: TOTAL_SPEND_ANIMATION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished) {
          return;
        }

        committedTotalSpendRef.current = normalizedNext;
        incomingTotalSpendRef.current = null;
        setCommittedTotalSpendValue(normalizedNext);
        setIncomingTotalSpendValue(null);
        lastKnownTotalSpendValue = normalizedNext;
      });
    },
    [totalSpendFlowProgress],
  );

  useEffect(() => {
    if (showMonthPicker) {
      return;
    }

    const pendingMonthStart = pendingMonthStartRef.current;
    if (!pendingMonthStart) {
      return;
    }
    pendingMonthStartRef.current = null;
    monthSwitchCommittedRef.current = true;
    setIsMonthSwitching(true);
    setSelectedMonthStart((prev) =>
      prev.getTime() === pendingMonthStart.getTime() ? prev : pendingMonthStart,
    );
  }, [monthWindowPaymentsUpdatedAt, showMonthPicker]);

  useEffect(() => {
    if (!isMonthSwitching) {
      return;
    }

    if (!monthSwitchCommittedRef.current) {
      return;
    }

    if (monthSwitchTargetStartMsRef.current !== null && monthSwitchTargetStartMsRef.current !== selectedMonthStart.getTime()) {
      return;
    }

    const updatedAtMs = monthWindowPaymentsUpdatedAt?.getTime();
    if (!updatedAtMs || updatedAtMs === monthSwitchStartUpdatedAtRef.current) {
      return;
    }
    setIsMonthSwitching(false);
    monthSwitchCommittedRef.current = false;
    monthSwitchTargetStartMsRef.current = null;
  }, [isMonthSwitching, monthWindowPaymentsUpdatedAt, selectedMonthStart]);

  useEffect(() => {
    if (!isMonthSwitching) {
      if (monthSwitchFallbackTimeoutRef.current) {
        clearTimeout(monthSwitchFallbackTimeoutRef.current);
        monthSwitchFallbackTimeoutRef.current = null;
      }
      return;
    }

    if (!monthSwitchCommittedRef.current) {
      return;
    }

    if (monthSwitchFallbackTimeoutRef.current) {
      clearTimeout(monthSwitchFallbackTimeoutRef.current);
    }

    monthSwitchFallbackTimeoutRef.current = setTimeout(() => {
      setIsMonthSwitching(false);
      monthSwitchCommittedRef.current = false;
      monthSwitchTargetStartMsRef.current = null;
      monthSwitchFallbackTimeoutRef.current = null;
    }, MONTH_SWITCH_FALLBACK_MS);

    return () => {
      if (monthSwitchFallbackTimeoutRef.current) {
        clearTimeout(monthSwitchFallbackTimeoutRef.current);
        monthSwitchFallbackTimeoutRef.current = null;
      }
    };
  }, [isMonthSwitching, selectedMonthStart]);

  useEffect(() => {
    if (!isFocused || isMonthSwitching) {
      pendingTotalSpendValue.current = totalSpendValue;
      return;
    }

    const targetValue = pendingTotalSpendValue.current ?? totalSpendValue;
    pendingTotalSpendValue.current = null;
    animateTotalSpend(targetValue);
  }, [animateTotalSpend, isFocused, isMonthSwitching, totalSpendValue]);

  useEffect(() => {
    return () => {
      totalSpendFlowProgress.stopAnimation();
      if (monthSwitchFallbackTimeoutRef.current) {
        clearTimeout(monthSwitchFallbackTimeoutRef.current);
      }
    };
  }, [totalSpendFlowProgress]);

  const committedTotalSpendDisplay = formatCurrencyValue(committedTotalSpendValue);
  const incomingTotalSpendDisplay = incomingTotalSpendValue === null ? null : formatCurrencyValue(incomingTotalSpendValue);
  const totalSpendSizerText =
    incomingTotalSpendDisplay && incomingTotalSpendDisplay.length >= committedTotalSpendDisplay.length
      ? incomingTotalSpendDisplay
      : committedTotalSpendDisplay;
  const outgoingTotalTranslateY = totalSpendFlowProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -34] });
  const incomingTotalTranslateY = totalSpendFlowProgress.interpolate({ inputRange: [0, 1], outputRange: [34, 0] });
  const outgoingTotalOpacity = totalSpendFlowProgress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.15, 0] });
  const incomingTotalOpacity = totalSpendFlowProgress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.05, 0.45, 1] });
  const outgoingTotalBlur = totalSpendFlowProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 8] });
  const incomingTotalBlur = totalSpendFlowProgress.interpolate({ inputRange: [0, 1], outputRange: [9, 0] });

  const previousMonthDbTotalValue = useMemo(
    () => {
      const previousMonth = new Date(selectedMonthStart.getFullYear(), selectedMonthStart.getMonth() - 1, 1);
      const previousMonthKey = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}`;

      return monthWindowPaymentsData.reduce((sum, payment) => {
        if (payment.monthKey !== previousMonthKey) return sum;
        return sum + Number(payment.sumCents ?? 0) / 100;
      }, 0);
    },
    [monthWindowPaymentsData, selectedMonthStart],
  );
  const previousMonthTotalSpendValue = previousMonthDbTotalValue;

  const trendDifferenceValue = totalSpendValue - previousMonthTotalSpendValue;
  const trendDirection = trendDifferenceValue > 0 ? "up" : trendDifferenceValue < 0 ? "down" : "flat";
  const trendColor = trendDirection === "up" ? "#FF3B30" : trendDirection === "down" ? "#16A34A" : "#6B7280";
  const trendBackgroundColor =
    trendDirection === "up" ? "#FFECEC" : trendDirection === "down" ? "#E8F9EE" : "#F3F4F6";
  const TrendIcon = trendDirection === "down" ? TrendingDown : trendDirection === "flat" ? Minus : TrendingUp;
  const trendSign = trendDifferenceValue > 0 ? "+" : trendDifferenceValue < 0 ? "-" : "";
  const trendAbsValue = Math.abs(trendDifferenceValue).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const trendLabel = `${trendSign}RON ${trendAbsValue}`;
  const activeProcessingReceipt =
    processingReceipts.find((item) => item.status === "processing") ?? null;
  const latestResultProcessingReceipt =
    processingReceipts.find((item) => item.status !== "processing") ?? null;
  const processingWidget = (
    <ProcessingStatusWidget
      processingReceipt={activeProcessingReceipt}
      latestResultReceipt={latestResultProcessingReceipt}
      isDark={isDark}
    />
  );

  const filteredReceipts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return monthReceipts;
    }

    return monthReceipts.filter((item) =>
      [item.title, item.category, item.amount, item.date, item.status]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [monthReceipts, searchQuery]);

  const groupedReceipts = useMemo<ReceiptGroup[]>(() => {
    const groupsByDate = new Map<string, ReceiptGroup>();
    const orderedGroups: ReceiptGroup[] = [];

    filteredReceipts.forEach((item) => {
      const key = item.fullDate;
      const existingGroup = groupsByDate.get(key);

      if (existingGroup) {
        existingGroup.items.push(item);
        return;
      }

      const group: ReceiptGroup = {
        id: `group-${key}`,
        fullDate: key,
        label: formatGroupDateLabel(getSafeDate(item.fullDate)),
        items: [item],
      };

      groupsByDate.set(key, group);
      orderedGroups.push(group);
    });

    return orderedGroups;
  }, [filteredReceipts]);
  const categoryOptions = useMemo(() => {
    if (categoriesData.length > 0) {
      return categoriesData.map((item) => item.categoryName);
    }
    const fallback = Array.from(new Set(receipts.map((item) => item.category))).filter(Boolean);
    return fallback.length > 0 ? fallback : ["General"];
  }, [categoriesData, receipts]);

  const categoryAccentMap = useMemo(
    () =>
      categoriesData.reduce<Record<string, string>>((acc, item) => {
        acc[item.categoryName] = item.color;
        return acc;
      }, {}),
    [categoriesData],
  );

  const currentMonthLabel = formatMonthLabel(selectedMonthStart);

  const availableMonthStarts = useMemo(() => {
    const monthMap = new Map<string, Date>();
    const addMonth = (date: Date) => {
      const monthStart = toMonthStart(date);
      monthMap.set(`${monthStart.getFullYear()}-${monthStart.getMonth()}`, monthStart);
    };

    addMonth(selectedMonthStart);
    addMonth(new Date());
    receipts.forEach((item) => addMonth(getSafeDate(item.fullDate)));
    paymentMonthsData.forEach((item) => {
      const year = Number(item.year);
      const month = Number(item.month);
      if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
        addMonth(new Date(year, month - 1, 1));
      }
    });

    return Array.from(monthMap.values()).sort((a, b) => b.getTime() - a.getTime());
  }, [paymentMonthsData, receipts, selectedMonthStart]);

  const monthOptions = availableMonthStarts.map((date) => formatMonthLabel(date));
  const emptyStateMessage = searchQuery.trim().length > 0 ? "No receipts match your search." : "No receipts found for this month.";
  const listData = isReportsLoading ? [] : groupedReceipts;

  const monthStartByLabel = useMemo(() => {
    const map = new Map<string, Date>();
    availableMonthStarts.forEach((date) => map.set(formatMonthLabel(date), date));
    return map;
  }, [availableMonthStarts]);

  function handleOpenReceipt(item: ReceiptItem) {
    if (item.status === "processing") {
      return;
    }
    setSelectedReceipt(item);
    setModalVisible(true);
  }

  function handleSaveReceipt(updatedItem: ReceiptItem) {
    setReceiptEdits((prev) => ({ ...prev, [updatedItem.id]: updatedItem }));

    if (updatedItem.id.startsWith("db-")) {
      const paymentId = Number(updatedItem.id.replace("db-", ""));
      if (Number.isFinite(paymentId) && paymentId > 0) {
        const parsedAmount = parseReceiptAmount(updatedItem.amount);
        const amountInCents = Math.max(0, Math.round((parsedAmount + Number.EPSILON) * 100));
        const marketName = updatedItem.title.trim() || null;
        const receiptPhotoLink = updatedItem.receiptPhotoUri?.trim() || null;
        const timedAtSeconds = Math.floor(toLocalNoonTimestamp(updatedItem.fullDate) / 1000);
        const categoryName = updatedItem.category.trim();

        void dbExpo.runAsync(
          `UPDATE payments
           SET sum = ?,
               market_name = ?,
               receipt_photo_link = ?,
               timed_at = ?,
               category_id = COALESCE(
                 (SELECT id FROM categories WHERE category_name = ? ORDER BY id DESC LIMIT 1),
                 category_id
               )
           WHERE id = ?`,
          [amountInCents, marketName, receiptPhotoLink, timedAtSeconds, categoryName, paymentId],
        ).catch((error) => {
          console.error("Failed to persist receipt update:", error);
        });
      }
    }

    setSelectedReceipt(updatedItem);
    setModalVisible(false);
  }

  function handleMonthSelect(label: string) {
    const month = monthStartByLabel.get(label);
    if (month) {
      const normalizedMonth = toMonthStart(month);
      if (normalizedMonth.getTime() === selectedMonthStart.getTime()) {
        return;
      }
      if (monthSwitchFallbackTimeoutRef.current) {
        clearTimeout(monthSwitchFallbackTimeoutRef.current);
        monthSwitchFallbackTimeoutRef.current = null;
      }
      monthSwitchCommittedRef.current = false;
      monthSwitchTargetStartMsRef.current = normalizedMonth.getTime();
      monthSwitchStartUpdatedAtRef.current = monthWindowPaymentsUpdatedAt?.getTime() ?? 0;
      pendingMonthStartRef.current = normalizedMonth;
    }
  }

  function updateScrollEdgeBlur(offsetY: number) {
    const viewportHeight = listViewportHeightRef.current;
    const contentHeight = listContentHeightRef.current;
    if (viewportHeight <= 0 || contentHeight <= 0) {
      setShowTopScrollBlur(false);
      setShowBottomScrollBlur(false);
      return;
    }

    const canScroll = contentHeight - viewportHeight > 8;
    const topVisible = canScroll && offsetY > 3;
    const remaining = contentHeight - (offsetY + viewportHeight);
    const bottomVisible = canScroll && remaining > 3;

    setShowTopScrollBlur((prev) => (prev === topVisible ? prev : topVisible));
    setShowBottomScrollBlur((prev) => (prev === bottomVisible ? prev : bottomVisible));
  }

  function handleListLayout(height: number) {
    listViewportHeightRef.current = height;
    updateScrollEdgeBlur(0);
  }

  function handleListContentSizeChange(height: number) {
    listContentHeightRef.current = height;
    updateScrollEdgeBlur(0);
  }

  function handleListScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    updateScrollEdgeBlur(event.nativeEvent.contentOffset.y);
  }

  const totalSpendAnimation: TotalSpendAnimationProps = {
    committedTotalSpendDisplay,
    incomingTotalSpendDisplay,
    totalSpendSizerText,
    outgoingTotalOpacity,
    incomingTotalOpacity,
    outgoingTotalTranslateY,
    incomingTotalTranslateY,
    outgoingTotalBlur,
    incomingTotalBlur,
  };

  return (
    <View style={[styles.background, isDark ? styles.backgroundDark : null]}>
      <View style={styles.page}>
        <FlashList
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReceiptGroupSection
              group={item}
              isDark={isDark}
              onOpen={handleOpenReceipt}
            />
          )}
          onLayout={(event) => handleListLayout(event.nativeEvent.layout.height)}
          onContentSizeChange={(_width, height) => handleListContentSizeChange(height)}
          onScroll={handleListScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <ReportsListHeader
                isDark={isDark}
                currentMonthLabel={currentMonthLabel}
                onOpenMonthPicker={() => setShowMonthPicker(true)}
                totalSpend={totalSpendAnimation}
                processingWidget={processingWidget}
                trendColor={trendColor}
                trendBackgroundColor={trendBackgroundColor}
                trendLabel={trendLabel}
                TrendIcon={TrendIcon}
                onOpenTrendInfo={() => setShowTrendInfo(true)}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
              />
            </>
          }
          ListEmptyComponent={
            isReportsLoading ? (
              <View style={styles.listLoadingWrap}>
                <ActivityIndicator size="large" color={isDark ? "#E5E7EB" : "#111827"} />
              </View>
            ) : (
              <View style={styles.emptyStateWrap}>
                <Text style={[styles.emptyStateText, isDark ? styles.emptyStateTextDark : null]}>{emptyStateMessage}</Text>
              </View>
            )
          }
        />

        <LinearGradient
          pointerEvents="none"
          colors={
            isDark
              ? ["rgba(0,0,0,0.9)", "rgba(0,0,0,0)"]
              : ["rgba(248,249,250,0.96)", "rgba(248,249,250,0)"]
          }
          style={[styles.scrollBlurTop, !showTopScrollBlur ? styles.scrollBlurHidden : null]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={
            isDark
              ? ["rgba(0,0,0,0)", "rgba(0,0,0,0.9)"]
              : ["rgba(248,249,250,0)", "rgba(248,249,250,0.96)"]
          }
          style={[styles.scrollBlurBottom, !showBottomScrollBlur ? styles.scrollBlurHidden : null]}
        />
      </View>

      <ReceiptDetailModal
        visible={modalVisible}
        item={selectedReceipt}
        categoryOptions={categoryOptions}
        categoryAccentMap={categoryAccentMap}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveReceipt}
      />

      <SelectionModal
        visible={showMonthPicker}
        title="Select Month"
        options={monthOptions}
        selected={currentMonthLabel}
        onClose={() => setShowMonthPicker(false)}
        onSelect={handleMonthSelect}
      />

      <Modal visible={showTrendInfo} transparent animationType="fade" onRequestClose={() => setShowTrendInfo(false)}>
        <TouchableOpacity style={styles.trendInfoOverlay} activeOpacity={1} onPress={() => setShowTrendInfo(false)}>
          <View style={styles.trendInfoCard}>
            <View style={styles.trendInfoHeaderRow}>
              <View style={styles.trendInfoTitleWrap}>
                <View style={styles.trendInfoTitleIcon}>
                  <Info size={14} color="#111827" />
                </View>
                <View>
                  <Text style={styles.trendInfoTitle}>Monthly Trend</Text>
                  <Text style={styles.trendInfoSubtitle}>How to read this indicator</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowTrendInfo(false)} style={styles.trendInfoCloseBtn} hitSlop={8}>
                <X size={16} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.trendInfoFormulaCard}>
              <Text style={styles.trendInfoFormulaLabel}>Formula</Text>
              <Text style={styles.trendInfoFormulaText}>Difference = selected month spend - previous month spend</Text>
            </View>

            <View style={styles.trendInfoLegendCard}>
              <View style={styles.trendInfoLegendRow}>
                <View style={[styles.trendInfoLegendIconWrap, { backgroundColor: "#FFECEC" }]}>
                  <TrendingUp size={14} color="#FF3B30" />
                </View>
                <Text style={styles.trendInfoLegendText}>Red + up icon: spend increased vs last month.</Text>
              </View>
              <View style={styles.trendInfoLegendRow}>
                <View style={[styles.trendInfoLegendIconWrap, { backgroundColor: "#E8F9EE" }]}>
                  <TrendingDown size={14} color="#16A34A" />
                </View>
                <Text style={styles.trendInfoLegendText}>Green + down icon: spend decreased vs last month.</Text>
              </View>
              <View style={styles.trendInfoLegendRow}>
                <View style={[styles.trendInfoLegendIconWrap, { backgroundColor: "#F3F4F6" }]}>
                  <Minus size={14} color="#6B7280" />
                </View>
                <Text style={styles.trendInfoLegendText}>Gray + flat icon: no change month-over-month.</Text>
              </View>
            </View>

            <Text style={styles.trendInfoHint}>Tap anywhere outside to close.</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}


// --- STYLES (Main list) ---
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#F8F9FA" },
  backgroundDark: { backgroundColor: "#000000" },
  headerContainer: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    marginBottom: 8,
  },
  page: { flex: 1, paddingTop: 8 },
  scrollBlurTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  scrollBlurBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  scrollBlurHidden: {
    opacity: 0,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 50,
  },
  pageEyebrow: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#6B7280",
    fontWeight: "700",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  pageTitle: { fontSize: 34, fontWeight: "900", color: "#111827", letterSpacing: -0.8},
  pageTitleDark: {
    color: "#F9FAFB",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 32,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerBadgeDark: {
    backgroundColor: "#1C1C1D",
    borderColor: "#2E2E2E",
  },
  headerBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#22C55E",
    marginRight: 8,
  },
  headerBadgeText: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "700",
  },
  headerBadgeTextDark: {
    color: "#E5E7EB",
  },
  headerBadgeIcon: {
    marginLeft: 6,
  },
  summaryCard: {
    width: "100%",
    alignSelf: "stretch",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    paddingBottom:10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  summaryCardDark: {
    backgroundColor: "#1C1C1D",
    borderWidth: 1,
    borderColor: "#2E2E2E",
  },
  summaryMain: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
    marginLeft: -8,
  },
  summaryLabel: { fontSize: 14, color: "#8E8E93", fontWeight: "600", marginTop: 4, marginBottom: 1 },
  summaryLabelDark: { color: "#9CA3AF" },
  summaryAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  summaryAmountCurrency: {
    fontSize: 28,
    lineHeight: 34,
    color: "#1A1A1A",
    fontWeight: "900",
    marginRight: 8,
  },
  summaryAmountViewport: {
    position: "relative",
    height: 38,
    justifyContent: "center",
    overflow: "hidden",
  },
  summaryAmountNumber: {
    fontSize: 28,
    lineHeight: 34,
    color: "#1A1A1A",
    fontWeight: "900",
    textAlign: "left",
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(26, 26, 26, 0.35)",
    textShadowOffset: { width: 0, height: 0 },
  },
  summaryAmountTextDark: {
    color: "#F9FAFB",
    textShadowColor: "rgba(249, 250, 251, 0.35)",
  },
  summaryAmountSizer: {
    opacity: 0,
  },
  summaryAmountAnimatedLayer: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    maxWidth: "52%",
    flexShrink: 1,
    marginTop: -10,
    marginRight: -10,
  },
  trendText: { color: "#34C759", fontWeight: "700", fontSize: 13, marginLeft: 4, flexShrink: 1 },

  trendInfoOverlay: {
    flex: 1,
    backgroundColor: "rgba(3,7,18,0.48)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  trendInfoCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  trendInfoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  trendInfoTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trendInfoTitleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  trendInfoCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  trendInfoTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  trendInfoSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  trendInfoFormulaCard: {
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  trendInfoFormulaLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  trendInfoFormulaText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
    lineHeight: 20,
  },
  trendInfoLegendCard: {
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  trendInfoLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  trendInfoLegendIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  trendInfoLegendText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
    flex: 1,
    lineHeight: 19,
  },
  trendInfoHint: {
    marginTop: 10,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    textAlign: "center",
  },

  controlsSection: { paddingHorizontal: 14, marginBottom: 4 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 999,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  searchBarDark: {
    backgroundColor: "#1C1C1D",
    borderColor: "#2E2E2E",
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: "#1A1A1A" },
  searchInputDark: { color: "#F3F4F6" },
  groupWrap: {
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  groupDateLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 8,
    marginLeft: 15,
  },
  groupDateLabelDark: {
    color: "#9CA3AF",
  },
  groupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F2F2F7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  groupCardDark: {
    backgroundColor: "#1C1C1D",
    borderColor: "#2E2E2E",
  },
  groupRowPressable: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    overflow: "hidden",
  },
  groupIconContainerDark: {
    backgroundColor: "#1C1C1D",
  },
  groupTextColumn: {
    justifyContent: "center",
    flexShrink: 1,
  },
  groupTitleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  groupTitleTextDark: {
    color: "#F9FAFB",
  },
  groupMetaText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#8E8E93",
  },
  groupMetaTextDark: {
    color: "#9CA3AF",
  },
  groupSpacer: {
    flex: 1,
  },
  groupRightColumn: {
    alignItems: "flex-end",
    gap: 6,
    marginLeft: 12,
  },
  groupChevron: {
    marginLeft: 10,
  },
  groupAmountText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  groupAmountTextDark: {
    color: "#F9FAFB",
  },
  groupStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  groupStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  groupStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  processingWidgetWrap: {
    marginTop: 10,
  },
  processingWidgetCard: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#EEF4FF",
  },
  processingWidgetCardDark: {
    backgroundColor: "#0F172A",
  },
  processingWidgetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  processingWidgetIconWrapDark: {
    backgroundColor: "#1E293B",
  },
  processingWidgetDoneIcon: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1D4ED8",
  },
  processingWidgetDoneIconDark: {
    color: "#93C5FD",
  },
  processingWidgetBody: {
    flex: 1,
    minWidth: 0,
  },
  processingWidgetTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E3A8A",
    marginBottom: 2,
  },
  processingWidgetTitleDark: {
    color: "#BFDBFE",
  },
  processingWidgetSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1D4ED8",
    marginBottom: 7,
  },
  processingWidgetSubtitleDark: {
    color: "#93C5FD",
  },
  processingWidgetTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#BFDBFE",
    justifyContent: "center",
  },
  processingWidgetTrackDark: {
    backgroundColor: "#1E3A8A",
  },
  processingWidgetSweep: {
    width: 70,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },
  processingWidgetSweepDark: {
    backgroundColor: "#93C5FD",
  },
  groupRowDivider: {
    height: 1,
    backgroundColor: "#ECEFF3",
    marginHorizontal: 16,
  },
  groupRowDividerDark: {
    backgroundColor: "#2E2E2E",
  },
  listContent: { paddingTop: 4, paddingBottom: 100 },
  listLoadingWrap: {
    paddingVertical: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateWrap: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyStateTextDark: {
    color: "#9CA3AF",
  },
});

