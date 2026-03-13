import { ReceiptDetailModal } from "@/src/components/Reports/ReceiptDetailModal";
import { ReportCard } from "@/src/components/Reports/ReportCard";
import { SelectionModal } from "@/src/components/Reports/SelectionModal";
import type { ReceiptItem } from "@/src/components/Reports/types";
import { categories as categoriesTable, payments as paymentsTable, users } from "@/src/db/schema";
import { useAppTheme } from "@/src/providers/AppThemeProvider";
import { useIsFocused } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { drizzle, useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useSQLiteContext } from "expo-sqlite";
import {
  ChevronDown,
  Info,
  Minus,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";


import { SafeArea } from "@/src/components/SafeArea";
const FILTER_OPTIONS = ["All", "Receipts", "Cash", "Card", "Needs Action"] as const;
const MONTH_LABEL_FORMAT: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };
const DATE_METHOD_SEPARATOR = " - ";

const formatMonthLabel = (date: Date): string => date.toLocaleDateString("en-US", MONTH_LABEL_FORMAT);
const CURRENCY_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};
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
const isInMonth = (value: Date, monthStart: Date): boolean =>
  value.getFullYear() === monthStart.getFullYear() && value.getMonth() === monthStart.getMonth();
const getSafeDate = (value: Date | number | string | null | undefined): Date => {
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

const INITIAL_DATA: ReceiptItem[] = [
  {
    id: "1",
    title: "Media Galaxy",
    date: "Dec 27 - Cash",
    amount: "RON 429.90",
    fullDate: "2025-12-27",
    category: "Tech",
    currency: "RON",
    comment: "",
    fullPage: false,
    status: "processed",
  },
  {
    id: "2",
    title: "Kaufland",
    date: "Dec 21 - Card",
    amount: "RON 85.50",
    fullDate: "2025-12-21",
    category: "Groceries",
    currency: "RON",
    comment: "",
    fullPage: false,
    status: "processed",
  },
  {
    id: "3",
    title: "Lidl",
    date: "Nov 29 - Card",
    amount: "RON 142.40",
    fullDate: "2025-11-29",
    category: "Groceries",
    currency: "RON",
    comment: "",
    fullPage: true,
    status: "processed",
  },
  {
    id: "4",
    title: "Altex",
    date: "Nov 11 - Cash",
    amount: "RON 560",
    fullDate: "2025-11-11",
    category: "Tech",
    currency: "RON",
    comment: "",
    fullPage: false,
    status: "failed",
  },
  {
    id: "5",
    title: "Darwin",
    date: "Nov 8 - Card",
    amount: "RON 1450.69",
    fullDate: "2025-11-08",
    category: "Tech",
    currency: "RON",
    comment: "",
    fullPage: true,
    status: "needs action",
  },
  {
    id: "6",
    title: "Metro",
    date: "Nov 2 - Cash",
    amount: "RON 245.30",
    fullDate: "2025-11-02",
    category: "Wholesale",
    currency: "RON",
    comment: "",
    fullPage: false,
    status: "needs action",
  },
  {
    id: "10",
    title: "Metro",
    date: "Jan 2 - Cash",
    amount: "RON 245.30",
    fullDate: "2026-01-02",
    category: "Wholesale",
    currency: "RON",
    comment: "",
    fullPage: false,
    status: "needs action",
  },
  {
    id: "12",
    title: "Media Galaxy",
    date: "Jan 2 - Cash",
    amount: "RON 645.30",
    fullDate: "2026-01-02",
    category: "Tech",
    currency: "RON",
    comment: "",
    fullPage: false,
    status: "processed",
  },
  {
    id: "7",
    title: "Altex",
    date: "Feb 1 - Cash",
    amount: "RON 245.30",
    fullDate: "2026-02-01",
    category: "Wholesale",
    currency: "RON",
    comment: "",
    fullPage: false,
    status: "failed",
  },
  {
    id: "8",
    title: "Kaufland",
    date: "Feb 4 - Cash",
    amount: "RON 30.50",
    fullDate: "2026-02-04",
    category: "Wholesale",
    currency: "RON",
    comment: "",
    fullPage: false,
    status: "processed",
  },
  {
    id: "9",
    title: "F64",
    date: "Feb 10 - Card",
    amount: "RON 350.50",
    fullDate: "2026-02-10",
    category: "Tech",
    currency: "RON",
    comment: "",
    fullPage: false,
    status: "needs action",
  },
  {
    id: "11",
    title: "Carturesti",
    date: "Feb 22 - Cash",
    amount: "RON 240.30",
    fullDate: "2026-02-22",
    category: "Wholesale",
    currency: "RON",
    comment: "",
    fullPage: false,
    status: "processed",
  },
];

export default function Reports() {
  const isFocused = useIsFocused();
  const { isDark } = useAppTheme();
  const [receiptEdits, setReceiptEdits] = useState<Record<string, ReceiptItem>>({});
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<(typeof FILTER_OPTIONS)[number]>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showTrendInfo, setShowTrendInfo] = useState(false);
  const [selectedMonthStart, setSelectedMonthStart] = useState<Date>(() => toMonthStart(new Date()));
  const selectedMonthEnd = useMemo(
    () => new Date(selectedMonthStart.getFullYear(), selectedMonthStart.getMonth() + 1, 1),
    [selectedMonthStart],
  );
  const previousMonthStart = useMemo(
    () => new Date(selectedMonthStart.getFullYear(), selectedMonthStart.getMonth() - 1, 1),
    [selectedMonthStart],
  );

  const dbExpo = useSQLiteContext();
  const db = useMemo(() => drizzle(dbExpo), [dbExpo]);
  const activeUserSubquery = useMemo(
    () =>
      db
        .select({ id: users.id })
        .from(users)
        .orderBy(users.id)
        .limit(1)
        .as("active_user"),
    [db],
  );

  const monthWindowPaymentsQuery = useMemo(
    () =>
      db
        .select({
          paymentId: paymentsTable.id,
          sumCents: paymentsTable.sum,
          marketName: paymentsTable.marketName,
          createdAt: paymentsTable.createdAt,
          receiptPhotoLink: paymentsTable.receiptPhotoLink,
          categoryName: categoriesTable.categoryName,
        })
        .from(paymentsTable)
        .innerJoin(activeUserSubquery, eq(paymentsTable.userId, activeUserSubquery.id))
        .leftJoin(categoriesTable, eq(paymentsTable.categoryId, categoriesTable.id))
        .where(and(gte(paymentsTable.createdAt, previousMonthStart), lt(paymentsTable.createdAt, selectedMonthEnd)))
        .orderBy(desc(paymentsTable.createdAt), desc(paymentsTable.id)),
    [activeUserSubquery, db, previousMonthStart, selectedMonthEnd],
  );
  const { data: monthWindowPaymentsData } = useLiveQuery(monthWindowPaymentsQuery);
  const selectedMonthPaymentsData = useMemo(
    () =>
      monthWindowPaymentsData.filter((payment) =>
        isInMonth(getSafeDate(payment.createdAt as Date | number | string | null | undefined), selectedMonthStart),
      ),
    [monthWindowPaymentsData, selectedMonthStart],
  );

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
        .innerJoin(activeUserSubquery, eq(categoriesTable.userId, activeUserSubquery.id))
        .where(eq(categoriesTable.monthStart, selectedMonthStart))
        .orderBy(categoriesTable.id),
    [activeUserSubquery, db, selectedMonthStart],
  );
  const { data: categoriesData } = useLiveQuery(categoriesQuery);

  const paymentMonthsQuery = useMemo(
    () => {
      const monthStartExpr = sql<number>`
        (cast(strftime('%s', strftime('%Y-%m-01', ${paymentsTable.createdAt} / 1000, 'unixepoch')) as integer) * 1000)
      `;

      return db
        .select({ monthStart: monthStartExpr })
        .from(paymentsTable)
        .innerJoin(activeUserSubquery, eq(paymentsTable.userId, activeUserSubquery.id))
        .groupBy(monthStartExpr)
        .orderBy(desc(monthStartExpr));
    },
    [activeUserSubquery, db],
  );
  const { data: paymentMonthsData } = useLiveQuery(paymentMonthsQuery);

  const dbReceipts = useMemo<ReceiptItem[]>(() => {
    return selectedMonthPaymentsData.map((payment) => {
      const safeDate = getSafeDate(payment.createdAt as Date | number | string | null | undefined);
      const fullDate = safeDate.toISOString().slice(0, 10);
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
      };
    });
  }, [selectedMonthPaymentsData]);

  const seededReceipts = useMemo(
    () => INITIAL_DATA.map((item) => ({ ...item, ...(receiptEdits[item.id] ?? {}) })),
    [receiptEdits],
  );

  const receipts = useMemo(
    () => [
      ...seededReceipts,
      ...dbReceipts.map((item) => ({ ...item, ...(receiptEdits[item.id] ?? {}) })),
    ],
    [dbReceipts, receiptEdits, seededReceipts],
  );

  const sortedReceipts = useMemo(
    () => [...receipts].sort((a, b) => getSafeDate(b.fullDate).getTime() - getSafeDate(a.fullDate).getTime()),
    [receipts],
  );

  const monthFilteredReceipts = useMemo(
    () => sortedReceipts.filter((item) => isInMonth(getSafeDate(item.fullDate), selectedMonthStart)),
    [sortedReceipts, selectedMonthStart],
  );

  const totalSpendValue = useMemo(() => {
    return monthFilteredReceipts.reduce((sum, item) => {
      const numericAmount = parseReceiptAmount(item.amount);
      return sum + numericAmount;
    }, 0);
  }, [monthFilteredReceipts]);
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
        delay: 110,
        duration: 650,
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
    if (!isFocused) {
      pendingTotalSpendValue.current = totalSpendValue;
      return;
    }

    const targetValue = pendingTotalSpendValue.current ?? totalSpendValue;
    pendingTotalSpendValue.current = null;
    animateTotalSpend(targetValue);
  }, [animateTotalSpend, isFocused, totalSpendValue]);

  useEffect(() => {
    return () => {
      totalSpendFlowProgress.stopAnimation();
    };
  }, [totalSpendFlowProgress]);

  const committedTotalSpendDisplay = useMemo(() => formatCurrencyValue(committedTotalSpendValue), [committedTotalSpendValue]);
  const incomingTotalSpendDisplay = useMemo(
    () => (incomingTotalSpendValue === null ? null : formatCurrencyValue(incomingTotalSpendValue)),
    [incomingTotalSpendValue],
  );
  const totalSpendSizerText = useMemo(() => {
    if (!incomingTotalSpendDisplay) {
      return committedTotalSpendDisplay;
    }

    return incomingTotalSpendDisplay.length >= committedTotalSpendDisplay.length
      ? incomingTotalSpendDisplay
      : committedTotalSpendDisplay;
  }, [committedTotalSpendDisplay, incomingTotalSpendDisplay]);
  const outgoingTotalTranslateY = useMemo(
    () => totalSpendFlowProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }),
    [totalSpendFlowProgress],
  );
  const incomingTotalTranslateY = useMemo(
    () => totalSpendFlowProgress.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }),
    [totalSpendFlowProgress],
  );
  const outgoingTotalOpacity = useMemo(
    () => totalSpendFlowProgress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.15, 0] }),
    [totalSpendFlowProgress],
  );
  const incomingTotalOpacity = useMemo(
    () => totalSpendFlowProgress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.05, 0.45, 1] }),
    [totalSpendFlowProgress],
  );
  const outgoingTotalBlur = useMemo(
    () => totalSpendFlowProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }),
    [totalSpendFlowProgress],
  );
  const incomingTotalBlur = useMemo(
    () => totalSpendFlowProgress.interpolate({ inputRange: [0, 1], outputRange: [9, 0] }),
    [totalSpendFlowProgress],
  );

  const previousMonthDbTotalValue = useMemo(
    () =>
      monthWindowPaymentsData.reduce((sum, payment) => {
        const paymentDate = getSafeDate(payment.createdAt as Date | number | string | null | undefined);
        if (!isInMonth(paymentDate, previousMonthStart)) return sum;
        return sum + Number(payment.sumCents ?? 0) / 100;
      }, 0),
    [monthWindowPaymentsData, previousMonthStart],
  );
  const previousMonthSeededTotalValue = useMemo(
    () =>
      seededReceipts
        .filter((item) => isInMonth(getSafeDate(item.fullDate), previousMonthStart))
        .reduce((sum, item) => sum + parseReceiptAmount(item.amount), 0),
    [previousMonthStart, seededReceipts],
  );

  const previousMonthTotalSpendValue = previousMonthSeededTotalValue + previousMonthDbTotalValue;

  const trendDifferenceValue = totalSpendValue - previousMonthTotalSpendValue;
  const trendDirection = trendDifferenceValue > 0 ? "up" : trendDifferenceValue < 0 ? "down" : "flat";
  const trendColor = trendDirection === "up" ? "#FF3B30" : trendDirection === "down" ? "#16A34A" : "#6B7280";
  const trendBackgroundColor =
    trendDirection === "up" ? "#FFECEC" : trendDirection === "down" ? "#E8F9EE" : "#F3F4F6";
  const TrendIcon = trendDirection === "down" ? TrendingDown : trendDirection === "flat" ? Minus : TrendingUp;

  const trendLabel = useMemo(() => {
    const sign = trendDifferenceValue > 0 ? "+" : trendDifferenceValue < 0 ? "-" : "";
    const absValue = Math.abs(trendDifferenceValue).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${sign}RON ${absValue}`;
  }, [trendDifferenceValue]);

  const filteredReceipts = useMemo(() => {
    const filterMatched =
      activeFilter === "All" || activeFilter === "Receipts"
        ? monthFilteredReceipts
        : activeFilter === "Needs Action"
          ? monthFilteredReceipts.filter((item) => item.status === "needs action")
          : monthFilteredReceipts.filter((item) => item.date.includes(activeFilter));

    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return filterMatched;
    }

    return filterMatched.filter((item) =>
      [item.title, item.category, item.amount, item.date, item.status]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [activeFilter, monthFilteredReceipts, searchQuery]);

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

  const currentMonthLabel = useMemo(() => formatMonthLabel(selectedMonthStart), [selectedMonthStart]);

  const availableMonthStarts = useMemo(() => {
    const monthMap = new Map<string, Date>();
    const addMonth = (date: Date) => {
      const monthStart = toMonthStart(date);
      monthMap.set(`${monthStart.getFullYear()}-${monthStart.getMonth()}`, monthStart);
    };

    addMonth(selectedMonthStart);
    addMonth(new Date());
    receipts.forEach((item) => addMonth(getSafeDate(item.fullDate)));
    paymentMonthsData.forEach((item) =>
      addMonth(getSafeDate(item.monthStart as Date | number | string | null | undefined)),
    );

    return Array.from(monthMap.values()).sort((a, b) => b.getTime() - a.getTime());
  }, [paymentMonthsData, receipts, selectedMonthStart]);

  const monthOptions = useMemo(() => availableMonthStarts.map((date) => formatMonthLabel(date)), [availableMonthStarts]);
  const emptyStateMessage = useMemo(
    () => (searchQuery.trim().length > 0 ? "No receipts match your search." : "No receipts found for this month."),
    [searchQuery],
  );

  const monthStartByLabel = useMemo(() => {
    const map = new Map<string, Date>();
    availableMonthStarts.forEach((date) => map.set(formatMonthLabel(date), date));
    return map;
  }, [availableMonthStarts]);

  const handleOpenReceipt = useCallback((item: ReceiptItem) => {
    setSelectedReceipt(item);
    setModalVisible(true);
  }, []);

  const handleSaveReceipt = useCallback(
    (updatedItem: ReceiptItem) => {
      setReceiptEdits((prev) => ({ ...prev, [updatedItem.id]: updatedItem }));

      if (updatedItem.id.startsWith("db-")) {
        const paymentId = Number(updatedItem.id.replace("db-", ""));
        if (Number.isFinite(paymentId) && paymentId > 0) {
          const parsedAmount = parseReceiptAmount(updatedItem.amount);
          const amountInCents = Math.max(0, Math.round((parsedAmount + Number.EPSILON) * 100));
          const marketName = updatedItem.title.trim() || null;
          const receiptPhotoLink = updatedItem.receiptPhotoUri?.trim() || null;
          const createdAtMs = toLocalNoonTimestamp(updatedItem.fullDate);
          const categoryName = updatedItem.category.trim();

          void dbExpo.runAsync(
            `UPDATE payments
             SET sum = ?,
                 market_name = ?,
                 receipt_photo_link = ?,
                 created_at = ?,
                 category_id = COALESCE(
                   (SELECT id FROM categories WHERE category_name = ? ORDER BY id DESC LIMIT 1),
                   category_id
                 )
             WHERE id = ?`,
            [amountInCents, marketName, receiptPhotoLink, createdAtMs, categoryName, paymentId],
          ).catch((error) => {
            console.error("Failed to persist receipt update:", error);
          });
        }
      }

      setSelectedReceipt(updatedItem);
      setModalVisible(false);
    },
    [dbExpo],
  );

  const handleMonthSelect = useCallback(
    (label: string) => {
      const month = monthStartByLabel.get(label);
      if (month) {
        setSelectedMonthStart(toMonthStart(month));
      }
      setShowMonthPicker(false);
    },
    [monthStartByLabel],
  );

  const keyExtractor = useCallback((item: ReceiptItem) => item.id, []);

  const renderReceiptItem = useCallback(
    ({ item }: { item: ReceiptItem }) => (
      <TouchableOpacity activeOpacity={0.7} onPress={() => handleOpenReceipt(item)}>
        <ReportCard
          title={item.title}
          date={item.date}
          amount={item.amount}
          status={item.status}
          receiptPhotoUri={item.receiptPhotoUri}
        />
      </TouchableOpacity>
    ),
    [handleOpenReceipt],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.controlsSection}>
        <View style={[styles.searchBar, isDark ? styles.searchBarDark : null]}>
          <Search size={20} color="#8E8E93" />
          <TextInput
            style={[styles.searchInput, isDark ? styles.searchInputDark : null]}
            placeholder="Search reports..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_OPTIONS.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                isDark ? styles.filterChipDark : null,
                activeFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  isDark ? styles.filterTextDark : null,
                  activeFilter === filter && styles.filterTextActive,
                ]}
              >{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    ),
    [activeFilter, isDark, searchQuery],
  );

  return (
    <View style={[styles.background, isDark ? styles.backgroundDark : null]}>
      <SafeArea style={styles.page}>
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <Text style={[styles.pageTitle, isDark ? styles.pageTitleDark : null]}>Reports</Text>
            <TouchableOpacity
             
              style={[styles.headerBadge, isDark ? styles.headerBadgeDark : null]}
             
              activeOpacity={0.85}
             
              onPress={() => setShowMonthPicker(true)}
            
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
                    {totalSpendSizerText}
                  </Text>
                  {incomingTotalSpendDisplay ? (
                    <>
                      <Animated.Text
                        style={[
                          styles.summaryAmountNumber,
                          styles.summaryAmountAnimatedLayer,
                          isDark ? styles.summaryAmountTextDark : null,
                          {
                            opacity: outgoingTotalOpacity,
                            transform: [{ translateY: outgoingTotalTranslateY }],
                            textShadowRadius: outgoingTotalBlur,
                          },
                        ]}
                      >
                        {committedTotalSpendDisplay}
                      </Animated.Text>
                      <Animated.Text
                        style={[
                          styles.summaryAmountNumber,
                          styles.summaryAmountAnimatedLayer,
                          isDark ? styles.summaryAmountTextDark : null,
                          {
                            opacity: incomingTotalOpacity,
                            transform: [{ translateY: incomingTotalTranslateY }],
                            textShadowRadius: incomingTotalBlur,
                          },
                        ]}
                      >
                        {incomingTotalSpendDisplay}
                      </Animated.Text>
                    </>
                  ) : (
                    <Text style={[styles.summaryAmountNumber, styles.summaryAmountAnimatedLayer, isDark ? styles.summaryAmountTextDark : null]}>
                      {committedTotalSpendDisplay}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowTrendInfo(true)}
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
        </View>

        <FlashList
          data={filteredReceipts}
          keyExtractor={keyExtractor}
          renderItem={renderReceiptItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.emptyStateWrap}>
              <Text style={[styles.emptyStateText, isDark ? styles.emptyStateTextDark : null]}>{emptyStateMessage}</Text>
            </View>
          }
        />
      </SafeArea>

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
  backgroundDark: { backgroundColor: "#0B0F14" },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
    marginBottom: 14,
  },
  page: { flex: 1 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    paddingHorizontal: 20,
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
  pageTitle: { fontSize: 32, fontWeight: "900", color: "#111827", letterSpacing: -0.8 },
  pageTitleDark: {
    color: "#F9FAFB",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerBadgeDark: {
    backgroundColor: "#111827",
    borderColor: "#374151",
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
    width: "95%",
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
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
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#374151",
  },
  summaryMain: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
    marginLeft: -8,
  },
  summaryLabel: { fontSize: 14, color: "#8E8E93", fontWeight: "600", marginBottom: 6 },
  summaryLabelDark: { color: "#9CA3AF" },
  summaryAmountRow: {
    flexDirection: "row",
    alignItems: "center",
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
    marginTop: -8,
    marginRight: -12,
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

  controlsSection: { paddingHorizontal: 20, marginBottom: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  searchBarDark: {
    backgroundColor: "#111827",
    borderColor: "#374151",
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: "#1A1A1A" },
  searchInputDark: { color: "#F3F4F6" },
  filterScroll: { paddingRight: 20 },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 100,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  filterChipDark: {
    backgroundColor: "#111827",
    borderColor: "#374151",
  },
  filterChipActive: { backgroundColor: "#1A1A1A", borderColor: "#1A1A1A" },
  filterText: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  filterTextDark: { color: "#E5E7EB" },
  filterTextActive: { color: "#fff" },

  listContent: { paddingTop: 10, paddingBottom: 100 },
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


