import { ReceiptDetailModal } from "@/src/components/Reports/ReceiptDetailModal";
import { SelectionModal } from "@/src/components/Reports/SelectionModal";
import { STATUS_CONFIG } from "@/src/components/Reports/constants";
import type { ReceiptItem } from "@/src/components/Reports/types";
import { categories as categoriesTable, payments as paymentsTable, users } from "@/src/db/schema";
import { useAppTheme } from "@/src/providers/AppThemeProvider";
import { useProcessingReceiptsStore } from "@/src/stores/receiptProcessingStore";
import { useIsFocused } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { drizzle, useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useSQLiteContext } from "expo-sqlite";
import {
  Baby,
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  Bus,
  Car,
  ChevronRight,
  ChevronDown,
  CircleHelp,
  Coffee,
  Droplets,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  House,
  Info,
  Minus,
  PawPrint,
  Phone,
  PiggyBank,
  Plane,
  ReceiptText,
  Search,
  ShieldPlus,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Stethoscope,
  Trash2,
  Tv,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wrench,
  X,
  Zap,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
import { Swipeable } from "react-native-gesture-handler";
const MONTH_LABEL_FORMAT: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };
const TRANSACTION_DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
const DATE_METHOD_SEPARATOR = " - ";
const ICONS_BY_NAME: Record<string, LucideIcon> = {
  Banknote,
  Baby,
  BriefcaseBusiness,
  BookOpen,
  Bus,
  Car,
  Coffee,
  Droplets,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  House,
  PawPrint,
  Phone,
  Plane,
  PiggyBank,
  ShieldPlus,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Stethoscope,
  Tv,
  Utensils,
  Wrench,
  Zap,
};

const formatMonthLabel = (date: Date): string => date.toLocaleDateString("en-US", MONTH_LABEL_FORMAT);
const formatGroupDateLabel = (date: Date): string =>
  date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
const formatTransactionDateLabel = (date: Date | string): string =>
  getSafeDate(date).toLocaleDateString("en-GB", TRANSACTION_DATE_FORMAT);
const normalizeToken = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizeReceiptPhotoUri = (value: string | null | undefined): string | null => {
  const raw = value?.trim();
  if (!raw) return null;
  if (raw.startsWith("file://")) {
    return raw;
  }
  if (raw.startsWith("file:")) {
    const normalizedPath = raw.replace(/^file:\/*/, "/");
    return `file://${normalizedPath}`;
  }
  if (raw.startsWith("content://")) {
    return raw;
  }
  if (raw.startsWith("content:")) {
    const normalizedPath = raw.replace(/^content:\/*/, "");
    return `content://${normalizedPath}`;
  }
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("ph://") ||
    raw.startsWith("data:image/")
  ) {
    return raw;
  }
  if (raw.startsWith("/")) {
    return `file://${raw}`;
  }
  return raw;
};
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
const resolveCategoryIcon = (
  rawIcon: string | null | undefined,
  categoryName: string | null | undefined,
): LucideIcon => {
  const normalizedCategory = normalizeToken(categoryName);

  if (normalizedCategory === "groceries") return ShoppingCart;
  if (normalizedCategory === "transport") return Car;
  if (normalizedCategory === "fuel") return Fuel;
  if (normalizedCategory === "utilities" || normalizedCategory === "bills") return Zap;
  if (normalizedCategory === "home") return House;
  if (normalizedCategory === "health") return Stethoscope;
  if (normalizedCategory === "fitness") return Dumbbell;
  if (normalizedCategory === "restaurants" || normalizedCategory === "restaurant") return Utensils;
  if (normalizedCategory === "coffee") return Coffee;
  if (normalizedCategory === "entertainment") return Film;
  if (normalizedCategory === "streaming") return Tv;
  if (normalizedCategory === "gaming") return Gamepad2;
  if (normalizedCategory === "shopping") return ShoppingBag;
  if (normalizedCategory === "clothing") return ShoppingBasket;
  if (normalizedCategory === "education") return GraduationCap;
  if (normalizedCategory === "books") return BookOpen;
  if (normalizedCategory === "work") return BriefcaseBusiness;
  if (normalizedCategory === "travel") return Plane;
  if (normalizedCategory === "phone") return Smartphone;
  if (normalizedCategory === "gifts") return Gift;
  if (normalizedCategory === "family") return Baby;
  if (normalizedCategory === "pets") return PawPrint;
  if (normalizedCategory === "insurance") return ShieldPlus;
  if (normalizedCategory === "savings") return PiggyBank;
  if (normalizedCategory === "misc") return Sparkles;

  if (/(groc|supermarket|market)/.test(normalizedCategory)) return ShoppingCart;
  if (/(transport|commute|fuel|gas|ride|taxi|bus|train)/.test(normalizedCategory)) return Car;
  if (/(utilit|bill|internet|electric|water|phone|wifi)/.test(normalizedCategory)) return Zap;
  if (/(health|medical|doctor|pharma|fitness|wellness)/.test(normalizedCategory)) return Stethoscope;
  if (/(restaurant|food|dining|meal|drink)/.test(normalizedCategory)) return Utensils;
  if (/(coffee|cafe)/.test(normalizedCategory)) return Coffee;
  if (/(entertain|movie|cinema|stream)/.test(normalizedCategory)) return Film;
  if (/(educat|school|course|book|study|tuition)/.test(normalizedCategory)) return GraduationCap;
  if (/(shop|clothes|fashion|accessories)/.test(normalizedCategory)) return ShoppingBag;
  if (/(saving|invest|retire|emergencyfund|goal)/.test(normalizedCategory)) return PiggyBank;

  return ICONS_BY_NAME[rawIcon ?? ""] ?? CircleHelp;
};
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

type ReceiptGroup = {
  id: string;
  fullDate: string;
  label: string;
  items: ReceiptItem[];
};

export default function Reports() {
  const isFocused = useIsFocused();
  const { isDark } = useAppTheme();
  const { processingReceipts } = useProcessingReceiptsStore();
  const [receiptEdits, setReceiptEdits] = useState<Record<string, ReceiptItem>>({});
  const [deletedReceiptIds, setDeletedReceiptIds] = useState<Record<string, true>>({});
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showTrendInfo, setShowTrendInfo] = useState(false);
  const [selectedMonthStart, setSelectedMonthStart] = useState<Date>(() => toMonthStart(new Date()));
  const [showTopScrollBlur, setShowTopScrollBlur] = useState(false);
  const [showBottomScrollBlur, setShowBottomScrollBlur] = useState(false);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const listViewportHeightRef = useRef(0);
  const listContentHeightRef = useRef(0);
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
          sourceType: paymentsTable.sourceType,
          createdAt: paymentsTable.createdAt,
          receiptPhotoLink: sql<string | null>`
            CASE
              WHEN ${paymentsTable.receiptPhotoLink} IS NOT NULL
                   AND length(${paymentsTable.receiptPhotoLink}) > 8192
              THEN NULL
              ELSE ${paymentsTable.receiptPhotoLink}
            END
          `,
          categoryName: categoriesTable.categoryName,
          categoryColor: categoriesTable.color,
          categoryIcon: categoriesTable.icon,
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
        receiptPhotoUri: normalizeReceiptPhotoUri(payment.receiptPhotoLink),
        status: "processed",
        sourceType: payment.sourceType ?? "manual",
        categoryIconName: payment.categoryIcon ?? null,
        categoryColor: payment.categoryColor ?? null,
      };
    });
  }, [selectedMonthPaymentsData]);

  const seededReceipts = useMemo(
    () =>
      INITIAL_DATA
        .filter((item) => !deletedReceiptIds[item.id])
        .map((item) => ({ ...item, ...(receiptEdits[item.id] ?? {}) })),
    [deletedReceiptIds, receiptEdits],
  );

  const receipts = useMemo(
    () => [
      ...processingReceipts,
      ...seededReceipts,
      ...dbReceipts
        .filter((item) => !deletedReceiptIds[item.id])
        .map((item) => ({ ...item, ...(receiptEdits[item.id] ?? {}) })),
    ],
    [dbReceipts, deletedReceiptIds, processingReceipts, receiptEdits, seededReceipts],
  );

  const sortedReceipts = useMemo(
    () => [...receipts].sort((a, b) => getSafeDate(b.fullDate).getTime() - getSafeDate(a.fullDate).getTime()),
    [receipts],
  );

  const monthFilteredReceipts = useMemo(
    () =>
      sortedReceipts.filter((item) =>
        item.status === "processing" || isInMonth(getSafeDate(item.fullDate), selectedMonthStart),
      ),
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
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return monthFilteredReceipts;
    }

    return monthFilteredReceipts.filter((item) =>
      [item.title, item.category, item.amount, item.date, item.status, item.comment]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [monthFilteredReceipts, searchQuery]);

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

  const closeOtherSwipeables = useCallback((openedId: string) => {
    Object.entries(swipeableRefs.current).forEach(([id, instance]) => {
      if (id !== openedId) {
        instance?.close();
      }
    });
  }, []);

  const updateScrollEdgeBlur = useCallback((offsetY: number) => {
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
  }, []);

  const handleListLayout = useCallback((height: number) => {
    listViewportHeightRef.current = height;
    updateScrollEdgeBlur(0);
  }, [updateScrollEdgeBlur]);

  const handleListContentSizeChange = useCallback((height: number) => {
    listContentHeightRef.current = height;
    updateScrollEdgeBlur(0);
  }, [updateScrollEdgeBlur]);

  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      updateScrollEdgeBlur(event.nativeEvent.contentOffset.y);
    },
    [updateScrollEdgeBlur],
  );

  const handleDeleteReceipt = useCallback(
    (receipt: ReceiptItem) => {
      swipeableRefs.current[receipt.id]?.close();
      setDeletedReceiptIds((prev) => ({ ...prev, [receipt.id]: true }));
      setReceiptEdits((prev) => {
        if (!(receipt.id in prev)) return prev;
        const next = { ...prev };
        delete next[receipt.id];
        return next;
      });

      if (selectedReceipt?.id === receipt.id) {
        setSelectedReceipt(null);
        setModalVisible(false);
      }

      if (!receipt.id.startsWith("db-")) {
        return;
      }

      const paymentId = Number(receipt.id.replace("db-", ""));
      if (!Number.isFinite(paymentId) || paymentId <= 0) {
        return;
      }

      void dbExpo.runAsync("DELETE FROM payments WHERE id = ?", [paymentId]).catch((error) => {
        console.error("Failed to delete receipt:", error);
        setDeletedReceiptIds((prev) => {
          if (!prev[receipt.id]) return prev;
          const next = { ...prev };
          delete next[receipt.id];
          return next;
        });
        Alert.alert("Delete failed", "Could not delete this spending. Please try again.");
      });
    },
    [dbExpo, selectedReceipt?.id],
  );

  const keyExtractor = useCallback((item: ReceiptGroup) => item.id, []);

  const renderReceiptGroup = useCallback(
    ({ item }: { item: ReceiptGroup }) => (
      <View style={styles.groupWrap}>
        <Text style={[styles.groupDateLabel, isDark ? styles.groupDateLabelDark : null]}>{item.label}</Text>
        <View style={[styles.groupCard, isDark ? styles.groupCardDark : null]}>
          {item.items.map((receipt, index) => {
            const statusConfig = STATUS_CONFIG[receipt.status] || STATUS_CONFIG.processed;
            const shouldShowStatusBadge = receipt.status !== "processed";
            const transactionDateLabel = formatTransactionDateLabel(receipt.fullDate);
            const rowMetaText =
              receipt.status === "processing"
                ? receipt.comment?.trim() || "Working on your receipt..."
                : receipt.status === "failed" && receipt.comment?.trim()
                  ? receipt.comment.trim()
                  : transactionDateLabel;
            const isManualEntry = receipt.sourceType === "manual";
            const categoryColor = receipt.categoryColor ?? "#8E8E93";
            const categoryIconBg = withAlpha(categoryColor, isDark ? 0.22 : 0.14);
            const manualIconGlowStyle = isManualEntry
              ? {
                  shadowColor: categoryColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: isDark ? 0.7 : 0.7,
                  shadowRadius: 10,
                  elevation: 4,
                }
              : null;
            const CategoryIcon = resolveCategoryIcon(receipt.categoryIconName, receipt.category);

            return (
              <View key={receipt.id}>
                <Swipeable
                  ref={(instance) => {
                    swipeableRefs.current[receipt.id] = instance;
                  }}
                  friction={2}
                  rightThreshold={40}
                  overshootRight={false}
                  onSwipeableOpen={() => closeOtherSwipeables(receipt.id)}
                  renderRightActions={() => (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleDeleteReceipt(receipt)}
                      style={styles.deleteAction}
                    >
                      <Trash2 size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                >
                  <TouchableOpacity
                    activeOpacity={0.72}
                    onPress={() => handleOpenReceipt(receipt)}
                    style={styles.groupRowPressable}
                  >
                    <View style={styles.groupRow}>
                      <View
                        style={[
                          styles.groupIconContainer,
                          isDark ? styles.groupIconContainerDark : null,
                          isManualEntry ? { backgroundColor: categoryIconBg, borderColor: withAlpha(categoryColor, 0.45), borderWidth: 1 } : null,
                          manualIconGlowStyle,
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
                          {rowMetaText}
                        </Text>
                      </View>

                      <View style={styles.groupSpacer} />

                      <View style={styles.groupRightColumn}>
                        <Text style={[styles.groupAmountText, isDark ? styles.groupAmountTextDark : null]}>{receipt.amount}</Text>
                        {shouldShowStatusBadge ? (
                          <View style={[styles.groupStatusPill, { backgroundColor: statusConfig.bg }]}>
                            <View style={[styles.groupStatusDot, { backgroundColor: statusConfig.color }]} />
                            <Text style={[styles.groupStatusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                          </View>
                        ) : null}
                      </View>
                      <ChevronRight size={14} color={isDark ? "#6B7280" : "#B8BDC7"} style={styles.groupChevron} />
                    </View>
                  </TouchableOpacity>
                </Swipeable>

                {index < item.items.length - 1 ? (
                  <View style={[styles.groupRowDivider, isDark ? styles.groupRowDividerDark : null]} />
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    ),
    [closeOtherSwipeables, handleDeleteReceipt, handleOpenReceipt, isDark],
  );

  const listHeader = (
    <>
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <Text style={[styles.pageTitle, isDark ? styles.pageTitleDark : null]}>History</Text>
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

      <View style={styles.controlsSection}>
        <View style={[styles.searchBar, isDark ? styles.searchBarDark : null]}>
          <Search size={20} color="#8E8E93" />
          <TextInput
            style={[styles.searchInput, isDark ? styles.searchInputDark : null]}
            placeholder="Search receipts, items, merchants..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>
    </>
  );

  return (
    <View style={[styles.background, isDark ? styles.backgroundDark : null]}>
      <View style={styles.page}>
        <FlashList
          data={groupedReceipts}
          keyExtractor={keyExtractor}
          renderItem={renderReceiptGroup}
          onLayout={(event) => handleListLayout(event.nativeEvent.layout.height)}
          onContentSizeChange={(_width, height) => handleListContentSizeChange(height)}
          onScroll={handleListScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.emptyStateWrap}>
              <Text style={[styles.emptyStateText, isDark ? styles.emptyStateTextDark : null]}>{emptyStateMessage}</Text>
            </View>
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
  groupRowDivider: {
    height: 1,
    backgroundColor: "#ECEFF3",
    marginHorizontal: 16,
  },
  groupRowDividerDark: {
    backgroundColor: "#2E2E2E",
  },
  deleteAction: {
    width: 72,
    marginVertical: 6,
    marginRight: 10,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },

  listContent: { paddingTop: 4, paddingBottom: 100 },
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
