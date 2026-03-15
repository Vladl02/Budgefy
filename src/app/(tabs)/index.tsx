import { useAppDrawer } from "@/src/components/homepage/AppDrawer";
import { ExpenseGrid, type ExpenseItem, type HomeLayoutStyle } from "@/src/components/homepage/ExpenseGrid";
import { TopBar } from "@/src/components/homepage/TopBar";
import { SafeArea } from "@/src/components/SafeArea";
import { useGuardedModalPush } from "@/src/hooks/guardForModals";
import { useAppTheme } from "@/src/providers/AppThemeProvider";
import { clearBudgetForCategory, useBudgetStore } from "@/src/stores/budgetStore";
import { HOME_CATEGORY_DEFAULTS, HOME_COLOR_FALLBACKS } from "@/src/constants/homeCategoryDefaults";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFocusEffect } from "expo-router";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarClock, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import {
  siApple,
  siDiscord,
  siDropbox,
  siGithub,
  siGoogleplay,
  siHbo,
  siHbomax,
  siIcloud,
  siNetflix,
  siNotion,
  siPatreon,
  siPaypal,
  siSpotify,
  siUber,
  siX,
  siYoutube,
  type SimpleIcon,
} from "simple-icons";

import { DEFAULT_CATEGORY_ICON_NAME, resolveIconByName } from "@/src/utils/categoryIcons";
import { getAppPreference, setAppPreference } from "@/src/utils/preferences";
import {
  getNextRecurringPayment,
  loadRecurringPayments,
  saveRecurringPayments,
  type RecurringPayment,
} from "@/src/utils/recurringPayments";
import {
  categoriesForMonth,
  paymentSumsByCategoryForMonth,
  paymentSumsByCategoryNameForMonth,
} from "@/src/utils/queries";
import { drizzle, useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useSQLiteContext } from "expo-sqlite";
const HOME_CATEGORY_ORDER_KEY_PREFIX = "home_category_order";
const HOME_LAYOUT_STYLE_KEY = "home_layout_style_v1";
const PAUSED_RECURRING_SUBSCRIPTIONS_KEY = "paused_recurring_subscriptions_v1";
const NEXT_SUBSCRIPTION_MENU_WIDTH = 148;
const NEXT_SUBSCRIPTION_MENU_TRIGGER_WIDTH = 22;

const normalizeToken = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const arraysEqual = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);
const isHexColor = (value: string | null | undefined): value is string =>
  !!value && /^#[0-9a-fA-F]{6}$/.test(value);

type CategoryPresetOption = {
  name: string;
  iconName: string;
  color: string;
};

const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return hex;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatRecurringAmount = (amount: number, currencyCode: string): string => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
};

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const clampDayForMonth = (year: number, month: number, dayOfMonth: number): number => {
  const monthEnd = new Date(year, month + 1, 0).getDate();
  return Math.max(1, Math.min(monthEnd, dayOfMonth));
};

const resolveBillingCycleProgress = (rawDay: string, nextDueDate: Date, now: Date = new Date()): number => {
  const parsedDay = Number.parseInt(rawDay, 10);
  if (!Number.isFinite(parsedDay)) return 0;

  const nextDue = startOfDay(nextDueDate);
  const previousMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() - 1, 1);
  const previousDueDay = clampDayForMonth(previousMonth.getFullYear(), previousMonth.getMonth(), parsedDay);
  const previousDue = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), previousDueDay);
  const today = startOfDay(now);

  const cycleDuration = nextDue.getTime() - previousDue.getTime();
  if (cycleDuration <= 0) return 0;

  const elapsed = today.getTime() - previousDue.getTime();
  const rawProgress = elapsed / cycleDuration;
  return Math.max(0, Math.min(1, rawProgress));
};

type ServiceLogo =
  | { kind: "simple"; icon: SimpleIcon }
  | { kind: "capcut" }
  | { kind: "fallback" };

type PlatformProvider = {
  icon: SimpleIcon;
  name: string;
};

type ResolvedSubscriptionBrand = {
  serviceName: string;
  platform: PlatformProvider | null;
  logo: ServiceLogo;
  glowHex: string;
};

const normalizeBrandText = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const stripPlatformPrefix = (value: string): string =>
  value
    .trim()
    .replace(/^(apple|app store|itunes)\s*[:\-|]?\s*/i, "")
    .replace(/^(google play|play store)\s*[:\-|]?\s*/i, "")
    .trim();

const resolvePlatformProvider = (rawName: string): PlatformProvider | null => {
  const normalized = normalizeBrandText(rawName);
  if (/^(apple|app store|itunes)\b/.test(normalized) || /\bapple\.com\/bill\b/.test(normalized)) {
    return { icon: siApple, name: "Apple" };
  }
  if (/^(google play|play store)\b/.test(normalized)) {
    return { icon: siGoogleplay, name: "Google Play" };
  }
  return null;
};

const BRAND_LOGO_MATCHERS: { keywords: string[]; logo: ServiceLogo; glowHex: string }[] = [
  { keywords: ["capcut"], logo: { kind: "capcut" }, glowHex: "#111111" },
  { keywords: ["netflix"], logo: { kind: "simple", icon: siNetflix }, glowHex: "#E50914" },
  { keywords: ["spotify"], logo: { kind: "simple", icon: siSpotify }, glowHex: "#1DB954" },
  { keywords: ["youtube", "youtube premium", "yt"], logo: { kind: "simple", icon: siYoutube }, glowHex: "#FF0000" },
  { keywords: ["hbo max", "max"], logo: { kind: "simple", icon: siHbomax }, glowHex: "#8D53F0" },
  { keywords: ["hbo"], logo: { kind: "simple", icon: siHbo }, glowHex: "#660099" },
  { keywords: ["icloud"], logo: { kind: "simple", icon: siIcloud }, glowHex: "#1F8CFF" },
  { keywords: ["uber", "uber one"], logo: { kind: "simple", icon: siUber }, glowHex: "#111111" },
  { keywords: ["paypal"], logo: { kind: "simple", icon: siPaypal }, glowHex: "#003087" },
  { keywords: ["patreon"], logo: { kind: "simple", icon: siPatreon }, glowHex: "#FF424D" },
  { keywords: ["discord"], logo: { kind: "simple", icon: siDiscord }, glowHex: "#5865F2" },
  { keywords: ["github"], logo: { kind: "simple", icon: siGithub }, glowHex: "#181717" },
  { keywords: ["dropbox"], logo: { kind: "simple", icon: siDropbox }, glowHex: "#0061FF" },
  { keywords: ["notion"], logo: { kind: "simple", icon: siNotion }, glowHex: "#111111" },
  { keywords: ["twitter", "x premium", "x.com"], logo: { kind: "simple", icon: siX }, glowHex: "#111111" },
];

const resolveSubscriptionBrand = (rawName: string): ResolvedSubscriptionBrand => {
  const platform = resolvePlatformProvider(rawName);
  const strippedName = stripPlatformPrefix(rawName);
  const serviceName = strippedName.length > 0 ? strippedName : rawName.trim();
  const normalized = normalizeBrandText(serviceName);

  for (const matcher of BRAND_LOGO_MATCHERS) {
    if (matcher.keywords.some((keyword) => normalized.includes(keyword))) {
      return {
        serviceName,
        platform,
        logo: matcher.logo,
        glowHex: matcher.glowHex,
      };
    }
  }

  return {
    serviceName,
    platform,
    logo: { kind: "fallback" },
    glowHex: "#64748B",
  };
};

const resolveGlowColor = (hex: string, isDark: boolean): string => {
  const normalized = hex.startsWith("#") ? hex : `#${hex}`;
  const darkSafeHex = normalized.toLowerCase() === "#000000" ? (isDark ? "#FFFFFF" : "#111111") : normalized;
  return withAlpha(darkSafeHex, isDark ? 0.2 : 0.14);
};

const resolveProgressColor = (hex: string, isDark: boolean): string => {
  const normalized = hex.startsWith("#") ? hex : `#${hex}`;
  if (normalized.toLowerCase() === "#000000") {
    return isDark ? "#F9FAFB" : "#111111";
  }
  return normalized;
};

function SimpleBrandIcon({ icon, size }: { icon: SimpleIcon; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={icon.path} fill={`#${icon.hex}`} />
    </Svg>
  );
}

function CapCutLogo({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3.8 6.5h6.3l10.1 11h-6.3zM3.8 17.5h6.3l10.1-11h-6.3z"
        fill={color}
      />
    </Svg>
  );
}

function HomeContent() {
  const { isDark } = useAppTheme();
  const drawer = useAppDrawer();
  const { pushModal } = useGuardedModalPush();
  const insets = useSafeAreaInsets();

  const dbExpo = useSQLiteContext();
  const db = useMemo(() => drizzle(dbExpo), [dbExpo]);
  const { budgetOverrides } = useBudgetStore();
  const [isAddCategoryVisible, setAddCategoryVisible] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [selectedCategoryPreset, setSelectedCategoryPreset] = useState<string | null>(null);
  const [selectedCategoryColor, setSelectedCategoryColor] = useState(HOME_COLOR_FALLBACKS[0]);
  const [categoryOrderIds, setCategoryOrderIds] = useState<string[] | null>(null);
  const [isCategoryOrderHydrated, setIsCategoryOrderHydrated] = useState(false);
  const [homeLayoutStyle, setHomeLayoutStyle] = useState<HomeLayoutStyle>("grid");
  const [isCategoryEditing, setIsCategoryEditing] = useState(false);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [pausedRecurringSubscriptionIds, setPausedRecurringSubscriptionIds] = useState<string[]>([]);
  const [acknowledgedSubscriptionKeys, setAcknowledgedSubscriptionKeys] = useState<string[]>([]);
  const latestAvailableMonth = useMemo(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    [],
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(latestAvailableMonth);
  const previousMonth = useMemo(
    () => new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    [currentMonth],
  );
  const currentMonthTitle = (() => {
    const monthLabel = currentMonth.toLocaleString("en-US", { month: "long" });
    const isCurrentYear = currentMonth.getFullYear() === new Date().getFullYear();
    return isCurrentYear
      ? `Your ${monthLabel} Spending.`
      : `Your ${monthLabel} ${currentMonth.getFullYear()} Spending.`;
  })();
  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      return next.getTime() > latestAvailableMonth.getTime() ? prev : next;
    });
  };
  const categoryOrderKey = useMemo(
    () => `${HOME_CATEGORY_ORDER_KEY_PREFIX}_${currentMonth.getTime()}`,
    [currentMonth],
  );

  const categoriesQuery = useMemo(
    () => categoriesForMonth(db, currentMonth),
    [db, currentMonth],
  );
  const currentMonthPaymentSumsQuery = useMemo(
    () => paymentSumsByCategoryForMonth(db, currentMonth),
    [currentMonth, db],
  );
  const previousMonthPaymentSumsByNameQuery = useMemo(
    () => paymentSumsByCategoryNameForMonth(db, previousMonth),
    [db, previousMonth],
  );

  const { data: categoriesData } = useLiveQuery(categoriesQuery);
  const { data: paymentSumsData } = useLiveQuery(currentMonthPaymentSumsQuery);
  const { data: previousMonthPaymentSumsByNameData } = useLiveQuery(previousMonthPaymentSumsByNameQuery);
  const paymentSumsByCategoryId = useMemo(
    () => new Map(paymentSumsData.map((row) => [row.categoryId, Number(row.totalSumCents)])),
    [paymentSumsData],
  );
  const previousMonthSpendingByCategoryToken = useMemo(() => {
    const spendingByToken = new Map<string, number>();

    previousMonthPaymentSumsByNameData.forEach((item) => {
      const token = normalizeToken(item.categoryName);
      if (!token) return;

      const spendCents = Number(item.totalSumCents);
      spendingByToken.set(token, (spendingByToken.get(token) ?? 0) + spendCents);
    });

    return spendingByToken;
  }, [previousMonthPaymentSumsByNameData]);
  const expenseItems = useMemo<ExpenseItem[]>(
    () =>
      categoriesData.map((item) => {
        const circleColor = item.color;
        const icon = resolveIconByName(item.icon);
        const categoryTotalCents = paymentSumsByCategoryId.get(item.id) ?? 0;
        const categoryTotal = Number((categoryTotalCents / 100).toFixed(2));
        const categoryTotalNoDecimals = Math.round(categoryTotalCents / 100);
        const previousMonthSpendCents =
          previousMonthSpendingByCategoryToken.get(normalizeToken(item.categoryName)) ?? 0;
        const trendPercent =
          previousMonthSpendCents > 0
            ? ((categoryTotalCents - previousMonthSpendCents) / previousMonthSpendCents) * 100
            : null;
        const budget = budgetOverrides[String(item.id)] ?? 0;
        const budgetUsageRatio = budget > 0 ? categoryTotal / budget : null;

        return {
          id: String(item.id),
          userId: item.userId,
          name: item.categoryName,
          amount: categoryTotalNoDecimals,
          circleColor,
          backgroundColor: withAlpha(circleColor, 0.4),
          icon,
          budgetUsageRatio,
          trendPercent,
          kind: "category",
        };
      }),
    [budgetOverrides, categoriesData, paymentSumsByCategoryId, previousMonthSpendingByCategoryToken],
  );
  const persistCategoryOrder = useCallback(
    async (nextOrderIds: string[]) => {
      try {
        await setAppPreference(
          dbExpo,
          categoryOrderKey,
          JSON.stringify(nextOrderIds),
        );
      } catch (error) {
        console.error("Failed to persist category order", error);
      }
    },
    [categoryOrderKey, dbExpo],
  );

  useEffect(() => {
    let isMounted = true;
    setIsCategoryOrderHydrated(false);

    const loadPersistedCategoryOrder = async () => {
      try {
        const value = await getAppPreference(dbExpo, categoryOrderKey, "");
        if (!isMounted) return;

        if (!value) {
          setCategoryOrderIds([]);
          setIsCategoryOrderHydrated(true);
          return;
        }

        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            const normalized = parsed
              .map((value) => String(value))
              .filter((value) => value.length > 0);
            setCategoryOrderIds(normalized);
            setIsCategoryOrderHydrated(true);
            return;
          }
        } catch {
          // Fallback handled below.
        }

        setCategoryOrderIds([]);
        setIsCategoryOrderHydrated(true);
      } catch (error) {
        console.error("Failed to load category order", error);
        if (isMounted) {
          setCategoryOrderIds([]);
          setIsCategoryOrderHydrated(true);
        }
      }
    };

    void loadPersistedCategoryOrder();
    return () => {
      isMounted = false;
    };
  }, [categoryOrderKey, dbExpo]);

  useEffect(() => {
    let isMounted = true;

    const loadHomeLayoutStyle = async () => {
      try {
        const value = await getAppPreference(dbExpo, HOME_LAYOUT_STYLE_KEY, "grid");

        if (!isMounted) return;
        if (value === "grid" || value === "masonry") {
          setHomeLayoutStyle(value);
          return;
        }
        setHomeLayoutStyle("grid");
      } catch (error) {
        console.error("Failed to load home layout style", error);
        if (isMounted) {
          setHomeLayoutStyle("grid");
        }
      }
    };

    void loadHomeLayoutStyle();
    return () => {
      isMounted = false;
    };
  }, [dbExpo]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const hydrateRecurringPayments = async () => {
        const [storedPayments, pausedRaw] = await Promise.all([
          loadRecurringPayments(),
          getAppPreference(dbExpo, PAUSED_RECURRING_SUBSCRIPTIONS_KEY, "[]"),
        ]);
        if (!isMounted) return;
        setRecurringPayments(storedPayments);

        try {
          const parsed = JSON.parse(pausedRaw);
          if (Array.isArray(parsed)) {
            setPausedRecurringSubscriptionIds(
              parsed.map((value) => String(value)).filter((value) => value.length > 0),
            );
            return;
          }
        } catch {
          // Fallback below.
        }
        setPausedRecurringSubscriptionIds([]);
      };

      void hydrateRecurringPayments();
      return () => {
        isMounted = false;
      };
    }, [dbExpo]),
  );

  useEffect(() => {
    if (categoryOrderIds === null) {
      return;
    }
    const existingIds = expenseItems.map((item) => item.id);
    const existingSet = new Set(existingIds);
    const orderedExisting = categoryOrderIds.filter((id) => existingSet.has(id));
    const missingIds = existingIds.filter((id) => !orderedExisting.includes(id));
    const normalizedOrder = [...orderedExisting, ...missingIds];

    if (arraysEqual(normalizedOrder, categoryOrderIds)) {
      return;
    }
    setCategoryOrderIds(normalizedOrder);
    void persistCategoryOrder(normalizedOrder);
  }, [categoryOrderIds, expenseItems, persistCategoryOrder]);

  const orderedExpenseItems = useMemo(() => {
    if (categoryOrderIds === null || categoryOrderIds.length === 0) {
      return expenseItems;
    }
    const rankById = new Map(categoryOrderIds.map((id, index) => [id, index]));
    return [...expenseItems].sort((a, b) => {
      const aRank = rankById.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bRank = rankById.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank;
    });
  }, [categoryOrderIds, expenseItems]);
  const gridItems = useMemo<ExpenseItem[]>(
    () => [
      ...orderedExpenseItems,
      {
        id: "add-category-card",
        name: "New Budget",
        kind: "add",
      },
    ],
    [orderedExpenseItems],
  );
  const totalExpenseNoDecimals = Math.round(expenseItems.reduce((acc, item) => acc + Number(item.amount), 0));
  const activeRecurringPayments = useMemo(
    () =>
      recurringPayments.filter(
        (payment) => !pausedRecurringSubscriptionIds.includes(payment.id),
      ),
    [pausedRecurringSubscriptionIds, recurringPayments],
  );
  const nextSubscription = useMemo(
    () => getNextRecurringPayment(activeRecurringPayments),
    [activeRecurringPayments],
  );
  const nextSubscriptionBrand = useMemo(
    () => (nextSubscription ? resolveSubscriptionBrand(nextSubscription.payment.name) : null),
    [nextSubscription],
  );
  const nextSubscriptionServiceName = useMemo(() => {
    if (!nextSubscription) return "";
    return nextSubscriptionBrand?.serviceName ?? nextSubscription.payment.name;
  }, [nextSubscription, nextSubscriptionBrand]);
  const nextSubscriptionBillingLabel = useMemo(() => {
    if (!nextSubscriptionBrand?.platform) return "";
    return `Billed via ${nextSubscriptionBrand.platform.name}`;
  }, [nextSubscriptionBrand]);
  const nextSubscriptionDueLabel = useMemo(() => {
    if (!nextSubscription) return "";
    return nextSubscription.dueDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, [nextSubscription]);
  const nextSubscriptionRelativeLabel = useMemo(() => {
    if (!nextSubscription) return "";
    if (nextSubscription.daysUntil === 0) return "today";
    if (nextSubscription.daysUntil === 1) return "tomorrow";
    return `${nextSubscription.daysUntil}d`;
  }, [nextSubscription]);
  const nextSubscriptionKey = useMemo(() => {
    if (!nextSubscription) return null;
    return `${nextSubscription.payment.id}:${startOfDay(nextSubscription.dueDate).getTime()}`;
  }, [nextSubscription]);
  const isNextSubscriptionAcknowledged = useMemo(
    () => Boolean(nextSubscriptionKey && acknowledgedSubscriptionKeys.includes(nextSubscriptionKey)),
    [acknowledgedSubscriptionKeys, nextSubscriptionKey],
  );
  const nextSubscriptionAmountLabel = useMemo(() => {
    if (!nextSubscription) return "";
    return formatRecurringAmount(nextSubscription.payment.amount, nextSubscription.payment.currency);
  }, [nextSubscription]);
  const nextSubscriptionCycleProgress = useMemo(() => {
    if (!nextSubscription) return 0;
    return resolveBillingCycleProgress(nextSubscription.payment.day, nextSubscription.dueDate);
  }, [nextSubscription]);
  const nextSubscriptionIsUrgent = useMemo(
    () => Boolean(nextSubscription && nextSubscription.daysUntil < 3),
    [nextSubscription],
  );
  const nextSubscriptionGlowColor = useMemo(() => {
    if (!nextSubscriptionBrand) {
      return withAlpha(isDark ? "#FFFFFF" : "#94A3B8", isDark ? 0.18 : 0.14);
    }
    return resolveGlowColor(nextSubscriptionBrand.glowHex, isDark);
  }, [isDark, nextSubscriptionBrand]);
  const nextSubscriptionProgressColor = useMemo(() => {
    if (!nextSubscriptionBrand) {
      return isDark ? "#D1D5DB" : "#64748B";
    }
    const brandHex =
      nextSubscriptionBrand.logo.kind === "simple"
        ? `#${nextSubscriptionBrand.logo.icon.hex}`
        : nextSubscriptionBrand.glowHex;
    return resolveProgressColor(brandHex, isDark);
  }, [isDark, nextSubscriptionBrand]);

  const existingCategoryTokens = useMemo(
    () => new Set(categoriesData.map((item) => normalizeToken(item.categoryName))),
    [categoriesData],
  );
  const nextSubscriptionMenuOptions = useMemo(
    () => [
      { label: "Edit Subscription", value: "edit" },
      { label: "Pause Tracking", value: "pause" },
      { label: "Stop Tracking / Delete", value: "delete", isDanger: true },
    ],
    [],
  );
  const categoryPresetOptions = useMemo<CategoryPresetOption[]>(() => {
    const deduped = new Map<string, CategoryPresetOption>();

    categoriesData.forEach((row) => {
      const token = normalizeToken(row.categoryName);
      if (!token || deduped.has(token)) return;
      deduped.set(token, {
        name: row.categoryName,
        iconName: row.icon ?? DEFAULT_CATEGORY_ICON_NAME,
        color: isHexColor(row.color) ? row.color : HOME_COLOR_FALLBACKS[0],
      });
    });

    HOME_CATEGORY_DEFAULTS.forEach((row) => {
      const token = normalizeToken(row.name);
      if (!token || deduped.has(token)) return;
      deduped.set(token, row);
    });

    return Array.from(deduped.values());
  }, [categoriesData]);
  const categoryColorOptions = useMemo(() => {
    const colors = new Set<string>();

    categoriesData.forEach((row) => {
      if (isHexColor(row.color)) {
        colors.add(row.color);
      }
    });

    HOME_COLOR_FALLBACKS.forEach((color) => colors.add(color));
    return Array.from(colors);
  }, [categoriesData]);
  const availablePresetCount = categoryPresetOptions
    .filter((option) => !existingCategoryTokens.has(normalizeToken(option.name)))
    .length;
  const selectedPresetOption =
    categoryPresetOptions.find((option) => option.name === selectedCategoryPreset) ?? null;
  const SelectedPresetIcon = resolveIconByName(selectedPresetOption?.iconName);

  const openAddCategoryModal = () => {
    const defaultColor = categoryColorOptions[categoriesData.length % categoryColorOptions.length] ?? HOME_COLOR_FALLBACKS[0];
    const firstAvailablePreset =
      categoryPresetOptions.find((option) => !existingCategoryTokens.has(normalizeToken(option.name)))?.name ?? null;
    setIsCategoryEditing(false);
    setSelectedCategoryPreset(firstAvailablePreset);
    setSelectedCategoryColor(defaultColor);
    setAddCategoryVisible(true);
  };
  const closeAddCategoryModal = () => {
    setAddCategoryVisible(false);
    setIsCreatingCategory(false);
  };
  const handleSelectPresetCategory = (presetName: string) => {
    setSelectedCategoryPreset(presetName);
    const presetColor = categoryPresetOptions.find((option) => option.name === presetName)?.color;
    if (presetColor) {
      setSelectedCategoryColor(presetColor);
    }
  };
  const handleCategoryOrderCommit = (nextCategoryIds: string[]) => {
    setCategoryOrderIds(nextCategoryIds);
    void persistCategoryOrder(nextCategoryIds);
  };
  const handleCategoryOrderStart = () => {
    setIsCategoryEditing(true);
  };
  const handleCreateCategory = async () => {
    if (!selectedCategoryPreset) {
      Alert.alert("Pick a category", "Select one option from the list.");
      return;
    }

    const trimmedName = selectedCategoryPreset.trim();
    const isDuplicate = existingCategoryTokens.has(normalizeToken(trimmedName));
    if (isDuplicate) {
      Alert.alert("Already exists", "This category already exists for this month.");
      return;
    }
    const color = selectedCategoryColor || HOME_COLOR_FALLBACKS[categoriesData.length % HOME_COLOR_FALLBACKS.length];
    const iconName = selectedPresetOption?.iconName ?? DEFAULT_CATEGORY_ICON_NAME;
    const userId = categoriesData[0]?.userId ?? 1;

    try {
      setIsCreatingCategory(true);
      await dbExpo.runAsync(
        "INSERT INTO categories (category_name, color, icon, month_start, user_id) VALUES (?, ?, ?, ?, ?)",
        [trimmedName, color, iconName, currentMonth.getTime(), userId],
      );
      closeAddCategoryModal();
    } catch (error) {
      console.error("Failed to create category", error);
      Alert.alert("Unable to add category", "Please try again.");
      setIsCreatingCategory(false);
    }
  };
  const handleOpenAddExpense = (item: ExpenseItem) => {
    if (isCategoryEditing) {
      setIsCategoryEditing(false);
      return;
    }

    if (item.kind === "add") {
      openAddCategoryModal();
      return;
    }
    pushModal({
      pathname: "/(modals)/addExpense",
      params: {
        category: item.name,
        categoryId: item.id,
        categoryUserId: String(item.userId ?? 1),
      },
    });
  };
  const handleLongPressCategory = (item: ExpenseItem) => {
    if (item.kind !== "category") {
      return;
    }
    setIsCategoryEditing(true);
  };
  const handleDeleteCategory = (item: ExpenseItem) => {
    if (item.kind !== "category") {
      return;
    }

    const categoryId = Number(item.id);
    if (!Number.isFinite(categoryId)) {
      return;
    }

    Alert.alert(
      "Remove category?",
      `"${item.name}" and all related expenses will be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await dbExpo.runAsync(
                "DELETE FROM products WHERE payment_id IN (SELECT id FROM payments WHERE category_id = ?)",
                [categoryId],
              );
              await dbExpo.runAsync("DELETE FROM payments WHERE category_id = ?", [categoryId]);
              await dbExpo.runAsync("DELETE FROM categories WHERE id = ?", [categoryId]);
              clearBudgetForCategory(String(categoryId));
              setCategoryOrderIds((prev) => {
                if (!prev) return prev;
                const next = prev.filter((id) => id !== item.id);
                void persistCategoryOrder(next);
                return next;
              });
            } catch (error) {
              console.error("Failed deleting category", error);
              Alert.alert("Unable to delete", "Please try again.");
            }
          },
        },
      ],
    );
  };
  const handleDismissEditing = () => {
    if (!isCategoryEditing) {
      return;
    }
    setIsCategoryEditing(false);
  };
  const persistPausedRecurringSubscriptionIds = useCallback(
    async (nextIds: string[]) => {
      try {
        await setAppPreference(
          dbExpo,
          PAUSED_RECURRING_SUBSCRIPTIONS_KEY,
          JSON.stringify(nextIds),
        );
      } catch (error) {
        console.error("Failed to persist paused recurring subscriptions", error);
      }
    },
    [dbExpo],
  );
  const handleEditSubscription = () => {
    pushModal({
      pathname: "/(modals)/(settings)/recurringexpense",
    });
  };
  const handlePauseSubscriptionTracking = () => {
    if (!nextSubscription) return;
    const subscriptionId = nextSubscription.payment.id;
    setPausedRecurringSubscriptionIds((prev) => {
      if (prev.includes(subscriptionId)) return prev;
      const next = [...prev, subscriptionId];
      void persistPausedRecurringSubscriptionIds(next);
      return next;
    });
  };
  const handleStopTrackingSubscription = () => {
    if (!nextSubscription) return;

    Alert.alert(
      "Stop tracking this subscription?",
      `We'll remove "${nextSubscription.payment.name}" from tracked recurring subscriptions.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop Tracking",
          style: "destructive",
          onPress: async () => {
            const subscriptionId = nextSubscription.payment.id;
            const nextPayments = recurringPayments.filter((payment) => payment.id !== subscriptionId);

            try {
              setRecurringPayments(nextPayments);
              await saveRecurringPayments(nextPayments);
              setPausedRecurringSubscriptionIds((prev) => {
                const next = prev.filter((id) => id !== subscriptionId);
                void persistPausedRecurringSubscriptionIds(next);
                return next;
              });
              setAcknowledgedSubscriptionKeys((prev) =>
                prev.filter((key) => !key.startsWith(`${subscriptionId}:`)),
              );
            } catch (error) {
              console.error("Failed stopping subscription tracking", error);
              Alert.alert("Unable to stop tracking", "Please try again.");
            }
          },
        },
      ],
    );
  };
  const handleAcknowledgeSubscription = () => {
    if (!nextSubscriptionKey) return;
    setAcknowledgedSubscriptionKeys((prev) => (
      prev.includes(nextSubscriptionKey) ? prev : [...prev, nextSubscriptionKey]
    ));
  };
  const handleSubscriptionMenuChange = (
    option: { value: string },
  ) => {
    if (option.value === "edit") {
      handleEditSubscription();
      return;
    }
    if (option.value === "pause") {
      handlePauseSubscriptionTracking();
      return;
    }
    if (option.value === "delete") {
      handleStopTrackingSubscription();
    }
  };

  
  return (
    <>
      <TopBar
        title={currentMonthTitle}
        onMenuPress={drawer.open}
        onPrevPress={handlePreviousMonth}
        onNextPress={handleNextMonth}
      />
      <View style={styles.contentDismissArea}>
        {isCategoryEditing ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismissEditing} />
        ) : null}
        <ScrollView
          style={styles.contentForeground}
          contentContainerStyle={[
            styles.contentScrollContent,
            { paddingBottom: Math.max(96, insets.bottom + 150) },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isCategoryEditing}
          pointerEvents="box-none"
        >
          <Text style={styles.expenseTotal}>
            Expense ${totalExpenseNoDecimals}
          </Text>
          {isCategoryOrderHydrated ? (
            <ExpenseGrid
              items={gridItems}
              layoutStyle={homeLayoutStyle}
              onPressItem={handleOpenAddExpense}
              onLongPressItem={handleLongPressCategory}
              onDeleteItem={handleDeleteCategory}
              isEditing={isCategoryEditing}
              disableInternalScroll
              onReorderStart={handleCategoryOrderStart}
              onReorderCommit={handleCategoryOrderCommit}
              onBackgroundPress={handleDismissEditing}
            />
          ) : (
            <View style={styles.gridLoading}>
              <ActivityIndicator size="small" color={isDark ? "#F3F4F6" : "#111827"} />
            </View>
          )}
          <View style={styles.nextSubscriptionSection}>
            <View style={[styles.nextSubscriptionCard, isDark ? styles.nextSubscriptionCardDark : null]}>
              <LinearGradient
                pointerEvents="none"
                colors={[
                  isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.44)",
                  "rgba(255,255,255,0)",
                ]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.nextSubscriptionInnerTopShadow}
              />
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(0,0,0,0)", isDark ? "rgba(0,0,0,0.58)" : "rgba(0,0,0,0.12)"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.nextSubscriptionInnerBottomShadow}
              />
              <View style={styles.nextSubscriptionCardContent}>
                <View style={styles.nextSubscriptionHeaderRow}>
                  <Text style={[styles.nextSubscriptionEyebrow, isDark ? styles.nextSubscriptionEyebrowDark : null]}>
                    Next
                  </Text>
                  <Dropdown
                    style={[
                      styles.nextSubscriptionMenuButton,
                      isDark ? styles.nextSubscriptionMenuButtonDark : null,
                      !nextSubscription ? styles.nextSubscriptionMenuButtonDisabled : null,
                    ]}
                    data={nextSubscriptionMenuOptions}
                    labelField="label"
                    valueField="value"
                    value={null}
                    placeholder="•••"
                    disable={!nextSubscription}
                    maxHeight={148}
                    dropdownPosition="top"
                    inverted={false}
                    activeColor={isDark ? "#374151" : "#F3F4F6"}
                    containerStyle={[
                      styles.nextSubscriptionDropdownMenu,
                      isDark ? styles.nextSubscriptionDropdownMenuDark : null,
                    ]}
                    selectedTextStyle={[
                      styles.nextSubscriptionMenuText,
                      isDark ? styles.nextSubscriptionMenuTextDark : null,
                    ]}
                    placeholderStyle={[
                      styles.nextSubscriptionMenuText,
                      isDark ? styles.nextSubscriptionMenuTextDark : null,
                    ]}
                    itemTextStyle={[
                      styles.nextSubscriptionDropdownText,
                      isDark ? styles.nextSubscriptionDropdownTextDark : null,
                    ]}
                    showsVerticalScrollIndicator={false}
                    renderRightIcon={() => null}
                    onChange={handleSubscriptionMenuChange}
                    renderItem={(item) => (
                      <View
                        style={[
                          styles.nextSubscriptionDropdownItem,
                          item.isDanger ? styles.nextSubscriptionDropdownItemDanger : null,
                          item.isDanger && isDark ? styles.nextSubscriptionDropdownItemDangerDark : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.nextSubscriptionDropdownText,
                            isDark ? styles.nextSubscriptionDropdownTextDark : null,
                            item.isDanger ? styles.nextSubscriptionDropdownDangerText : null,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                    )}
                  />
                </View>
                {nextSubscription ? (
                  <>
                  <View style={styles.nextSubscriptionMainRow}>
                    <View style={styles.nextSubscriptionMainLeft}>
                      <View style={[styles.nextSubscriptionIconWrap, isDark ? styles.nextSubscriptionIconWrapDark : null]}>
                        <View
                          style={[
                            styles.nextSubscriptionLogoGlow,
                            {
                              backgroundColor: nextSubscriptionGlowColor,
                              shadowColor: nextSubscriptionGlowColor,
                            },
                          ]}
                          pointerEvents="none"
                        />
                        {nextSubscriptionBrand?.logo.kind === "simple" ? (
                          <SimpleBrandIcon icon={nextSubscriptionBrand.logo.icon} size={14} />
                        ) : nextSubscriptionBrand?.logo.kind === "capcut" ? (
                          <CapCutLogo size={14} color={isDark ? "#F9FAFB" : "#111827"} />
                        ) : (
                          <CalendarClock size={14} color={isDark ? "#E5E7EB" : "#111827"} />
                        )}
                        {nextSubscriptionBrand?.platform ? (
                          <View style={[styles.nextSubscriptionPlatformBadge, isDark ? styles.nextSubscriptionPlatformBadgeDark : null]}>
                            <SimpleBrandIcon icon={nextSubscriptionBrand.platform.icon} size={8} />
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.nextSubscriptionMainTitleWrap}>
                        <Text
                          style={[styles.nextSubscriptionName, isDark ? styles.nextSubscriptionNameDark : null]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {nextSubscriptionServiceName}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[styles.nextSubscriptionAmount, isDark ? styles.nextSubscriptionAmountDark : null]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {nextSubscriptionAmountLabel}
                    </Text>
                  </View>
                  {nextSubscriptionBillingLabel ? (
                    <View style={styles.nextSubscriptionBillingRow}>
                      <Text
                        style={[styles.nextSubscriptionBilling, isDark ? styles.nextSubscriptionBillingDark : null]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {nextSubscriptionBillingLabel}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.nextSubscriptionDueRow}>
                    <Text
                      style={[styles.nextSubscriptionMeta, isDark ? styles.nextSubscriptionMetaDark : null]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {nextSubscriptionDueLabel}
                    </Text>
                    <Text
                      style={[
                        styles.nextSubscriptionDuePill,
                        isDark ? styles.nextSubscriptionDuePillDark : null,
                        nextSubscriptionIsUrgent ? styles.nextSubscriptionDuePillUrgent : null,
                        isDark && nextSubscriptionIsUrgent ? styles.nextSubscriptionDuePillUrgentDark : null,
                        isNextSubscriptionAcknowledged ? styles.nextSubscriptionDuePillAcknowledged : null,
                        isDark && isNextSubscriptionAcknowledged ? styles.nextSubscriptionDuePillAcknowledgedDark : null,
                      ]}
                    >
                      {isNextSubscriptionAcknowledged ? "planned" : nextSubscriptionRelativeLabel}
                    </Text>
                  </View>
                  <View style={styles.nextSubscriptionActionZone}>
                    {isNextSubscriptionAcknowledged ? (
                      <View style={[styles.nextSubscriptionPlannedLabel, isDark ? styles.nextSubscriptionPlannedLabelDark : null]}>
                        <Text style={[styles.nextSubscriptionPlannedIcon, isDark ? styles.nextSubscriptionPlannedIconDark : null]}>✓</Text>
                        <Text style={[styles.nextSubscriptionPlannedText, isDark ? styles.nextSubscriptionPlannedTextDark : null]}>
                          Planned
                        </Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={handleAcknowledgeSubscription}
                        style={[
                          styles.nextSubscriptionAcknowledgeButton,
                          isDark ? styles.nextSubscriptionAcknowledgeButtonDark : null,
                        ]}
                      >
                        <View style={styles.nextSubscriptionAcknowledgeContent}>
                          <Text style={styles.nextSubscriptionAcknowledgeIcon}>✓</Text>
                          <Text style={styles.nextSubscriptionAcknowledgeText}>Acknowledge</Text>
                        </View>
                      </Pressable>
                    )}
                  </View>
                  <View
                    style={[
                      styles.nextSubscriptionProgressTrack,
                      isDark ? styles.nextSubscriptionProgressTrackDark : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.nextSubscriptionProgressFill,
                        {
                          width: `${Math.max(0, Math.min(100, Math.round(nextSubscriptionCycleProgress * 100)))}%`,
                          backgroundColor: nextSubscriptionProgressColor,
                        },
                      ]}
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.nextSubscriptionMainRow}>
                    <View style={styles.nextSubscriptionMainLeft}>
                      <View style={[styles.nextSubscriptionIconWrap, isDark ? styles.nextSubscriptionIconWrapDark : null]}>
                        <CalendarClock size={14} color={isDark ? "#E5E7EB" : "#111827"} />
                      </View>
                      <View style={styles.nextSubscriptionMainTitleWrap}>
                        <Text style={[styles.nextSubscriptionName, isDark ? styles.nextSubscriptionNameDark : null]}>
                          No plans
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.nextSubscriptionBillingRow}>
                    <Text style={[styles.nextSubscriptionBilling, isDark ? styles.nextSubscriptionBillingDark : null]}>
                      Add in Settings
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.nextSubscriptionProgressTrack,
                      isDark ? styles.nextSubscriptionProgressTrackDark : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.nextSubscriptionProgressFill,
                        { width: "0%", backgroundColor: nextSubscriptionProgressColor },
                      ]}
                    />
                  </View>
                  </>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
      <Modal visible={isAddCategoryVisible} transparent animationType="fade" onRequestClose={closeAddCategoryModal}>
        <Pressable style={styles.categoryModalOverlay} onPress={closeAddCategoryModal}>
          <Pressable
            style={[styles.categoryModalSheet, isDark ? styles.categoryModalSheetDark : null]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={[styles.categoryModalHeader, isDark ? styles.categoryModalHeaderDark : null]}>
              <View style={styles.categoryModalHeaderText}>
                <Text style={[styles.categoryModalTitle, isDark ? styles.categoryModalTitleDark : null]}>New Category</Text>
                <Text style={[styles.categoryModalSubtitle, isDark ? styles.categoryModalSubtitleDark : null]}>
                  Choose a category and a color
                </Text>
              </View>
              <Pressable
                style={[styles.categoryModalCloseButton, isDark ? styles.categoryModalCloseButtonDark : null]}
                onPress={closeAddCategoryModal}
              >
                <X size={18} color={isDark ? "#F3F4F6" : "#111827"} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.categoryModalScroll}
              contentContainerStyle={[
                styles.categoryModalScrollContent,
                { paddingBottom: 120 + insets.bottom },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.modalSectionLabel, isDark ? styles.modalSectionLabelDark : null]}>Pick a category</Text>
              <View style={styles.presetGrid}>
                {categoryPresetOptions.map((option) => {
                  const isSelected = selectedCategoryPreset === option.name;
                  const isTaken = existingCategoryTokens.has(normalizeToken(option.name));
                  const IconComponent = resolveIconByName(option.iconName);
                  return (
                    <Pressable
                      key={option.name}
                      style={[
                        styles.presetChip,
                        isDark ? styles.presetChipDark : null,
                        isSelected ? styles.presetChipActive : null,
                        isTaken ? styles.presetChipDisabled : null,
                      ]}
                      onPress={() => handleSelectPresetCategory(option.name)}
                      disabled={isTaken}
                    >
                      <View
                        style={[
                          styles.presetChipIconWrap,
                          isDark ? styles.presetChipIconWrapDark : null,
                          isSelected ? styles.presetChipIconWrapActive : null,
                        ]}
                      >
                        <IconComponent
                          size={14}
                          color={isTaken ? "#9CA3AF" : isSelected ? "#FFFFFF" : isDark ? "#E5E7EB" : "#111827"}
                        />
                      </View>
                      <Text
                        style={[
                          styles.presetChipText,
                          isDark ? styles.presetChipTextDark : null,
                          isSelected ? styles.presetChipTextActive : null,
                          isTaken ? styles.presetChipTextDisabled : null,
                        ]}
                      >
                        {option.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {availablePresetCount === 0 ? (
                <Text style={[styles.presetUnavailableText, isDark ? styles.presetUnavailableTextDark : null]}>
                  All predefined categories are already added.
                </Text>
              ) : null}

              <Text style={[styles.modalSectionLabel, isDark ? styles.modalSectionLabelDark : null]}>Pick a color</Text>
              <View style={styles.colorPalette}>
                {categoryColorOptions.map((color) => {
                  const isSelected = selectedCategoryColor === color;
                  return (
                    <Pressable
                      key={color}
                      style={[
                        styles.colorSwatchOuter,
                        isDark ? styles.colorSwatchOuterDark : null,
                        isSelected ? styles.colorSwatchOuterActive : null,
                      ]}
                      onPress={() => setSelectedCategoryColor(color)}
                    >
                      <View style={[styles.colorSwatchInner, { backgroundColor: color }]} />
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.modalSectionLabel, isDark ? styles.modalSectionLabelDark : null]}>Preview</Text>
              <View style={[styles.previewCard, isDark ? styles.previewCardDark : null]}>
                <View style={[styles.previewIconWrap, { backgroundColor: selectedCategoryColor }]}>
                  <SelectedPresetIcon size={16} color="#FFFFFF" />
                </View>
                <View style={styles.previewCopy}>
                  <Text style={[styles.previewName, isDark ? styles.previewNameDark : null]}>
                    {selectedCategoryPreset ?? "Select a category"}
                  </Text>
                  <Text style={[styles.previewHint, isDark ? styles.previewHintDark : null]}>
                    This will be added for the current month
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View
              style={[
                styles.categoryModalActions,
                isDark ? styles.categoryModalActionsDark : null,
                { paddingBottom: Math.max(18, insets.bottom + 10) },
              ]}
            >
              <Pressable style={[styles.modalGhostButton, isDark ? styles.modalGhostButtonDark : null]} onPress={closeAddCategoryModal}>
                <Text style={[styles.modalGhostText, isDark ? styles.modalGhostTextDark : null]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalPrimaryButton,
                  isCreatingCategory || !selectedCategoryPreset ? styles.modalPrimaryButtonDisabled : null,
                ]}
                onPress={handleCreateCategory}
                disabled={isCreatingCategory || !selectedCategoryPreset}
              >
                <Text style={styles.modalPrimaryText}>{isCreatingCategory ? "Adding..." : "New Budget"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// Custom Text component to apply global font style
export function AppText(props: any) {
  return (
    <Text {...props} style={[{ fontFamily: "Inter_600Bold" }, props.style]} />
  );
}

export default function HomeScreen() {
  const { appColors } = useAppTheme();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={[styles.fontLoading, { backgroundColor: appColors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.background, { backgroundColor: appColors.background }]}>
      <SafeArea>
        <HomeContent />
      </SafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: "#ffffffff",
    height: "100%",
  },
  fontLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffffff",
  },
  expenseTotal: {
    textAlign: "center",
    paddingTop: 4,
    paddingBottom: 4,
  },
  contentDismissArea: {
    flex: 1,
  },
  contentForeground: {
    flex: 1,
  },
  contentScrollContent: {
    alignItems: "center",
    paddingTop: 2,
  },
  gridLoading: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  nextSubscriptionSection: {
    width: 378,
    maxWidth: "100%",
    alignSelf: "center",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    marginTop: 24,
  },
  nextSubscriptionCard: {
    width: "48%",
    minWidth: 176,
    maxWidth: 186,
    aspectRatio: 1,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 20,
    overflow: "hidden",
  },
  nextSubscriptionCardDark: {
    borderColor: "#374151",
    backgroundColor: "#111827",
  },
  nextSubscriptionCardContent: {
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
  nextSubscriptionInnerTopShadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 14,
    zIndex: 2,
  },
  nextSubscriptionInnerBottomShadow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 34,
    zIndex: 2,
  },
  nextSubscriptionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E2E8F0",
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
  },
  nextSubscriptionIconWrapDark: {
    backgroundColor: "#1F2937",
  },
  nextSubscriptionLogoGlow: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    top: -8,
    left: -8,
    opacity: 0.4,
    shadowOpacity: 0.95,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  nextSubscriptionPlatformBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  nextSubscriptionPlatformBadgeDark: {
    borderColor: "#4B5563",
    backgroundColor: "#111827",
  },
  nextSubscriptionEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: "#6B7280",
    textTransform: "uppercase",
    lineHeight: 11,
  },
  nextSubscriptionEyebrowDark: {
    color: "#6B7280",
  },
  nextSubscriptionHeaderRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 6,
  },
  nextSubscriptionMenuButton: {
    width: NEXT_SUBSCRIPTION_MENU_TRIGGER_WIDTH,
    minWidth: NEXT_SUBSCRIPTION_MENU_TRIGGER_WIDTH,
    height: 16,
    minHeight: 16,
    borderRadius: 8,
    paddingHorizontal: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  nextSubscriptionMenuButtonDark: {
    backgroundColor: "#374151",
  },
  nextSubscriptionMenuButtonDisabled: {
    opacity: 0.45,
  },
  nextSubscriptionMenuText: {
    width: "100%",
    flex: 0,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
    color: "#6B7280",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 9,
  },
  nextSubscriptionMenuTextDark: {
    color: "#D1D5DB",
  },
  nextSubscriptionDropdownMenu: {
    width: NEXT_SUBSCRIPTION_MENU_WIDTH,
    marginLeft: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  nextSubscriptionDropdownMenuDark: {
    borderColor: "#374151",
    backgroundColor: "#1F2937",
  },
  nextSubscriptionDropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nextSubscriptionDropdownItemDanger: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  nextSubscriptionDropdownItemDangerDark: {
    borderTopColor: "#374151",
  },
  nextSubscriptionDropdownText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#111827",
  },
  nextSubscriptionDropdownTextDark: {
    color: "#F3F4F6",
  },
  nextSubscriptionDropdownDangerText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
  },
  nextSubscriptionMainRow: {
    marginTop: 8,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nextSubscriptionMainLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  nextSubscriptionMainTitleWrap: {
    marginLeft: 6,
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  nextSubscriptionBillingRow: {
    marginTop: 2,
    width: "100%",
    paddingLeft: 36,
  },
  nextSubscriptionName: {
    marginTop: 0,
    textAlign: "left",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 12,
    color: "#111827",
  },
  nextSubscriptionNameDark: {
    color: "#FFFFFF",
  },
  nextSubscriptionBilling: {
    marginTop: 1,
    textAlign: "left",
    fontSize: 7.5,
    fontWeight: "600",
    lineHeight: 9,
    color: "#6B7280",
  },
  nextSubscriptionBillingDark: {
    color: "#9CA3AF",
  },
  nextSubscriptionDueRow: {
    marginTop: 4,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nextSubscriptionActionZone: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    paddingTop: 3,
  },
  nextSubscriptionAcknowledgeButton: {
    width: "100%",
    alignSelf: "stretch",
    marginHorizontal: 0,
    minHeight: 20,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(100,116,139,0.28)",
  },
  nextSubscriptionAcknowledgeButtonDark: {
    backgroundColor: "rgba(55,65,81,0.75)",
  },
  nextSubscriptionAcknowledgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nextSubscriptionAcknowledgeIcon: {
    color: "#FFFFFF",
    fontSize: 8,
    lineHeight: 8,
    fontWeight: "700",
  },
  nextSubscriptionAcknowledgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    lineHeight: 9,
    fontWeight: "900",
  },
  nextSubscriptionPlannedLabel: {
    width: "100%",
    minHeight: 20,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    backgroundColor: "rgba(16,185,129,0.22)",
  },
  nextSubscriptionPlannedLabelDark: {
    backgroundColor: "rgba(16,185,129,0.28)",
  },
  nextSubscriptionPlannedIcon: {
    color: "#047857",
    fontSize: 8,
    lineHeight: 8,
    fontWeight: "700",
  },
  nextSubscriptionPlannedIconDark: {
    color: "#34D399",
  },
  nextSubscriptionPlannedText: {
    color: "#065F46",
    fontSize: 8,
    lineHeight: 9,
    fontWeight: "600",
  },
  nextSubscriptionPlannedTextDark: {
    color: "#6EE7B7",
  },
  nextSubscriptionMeta: {
    marginTop: 0,
    textAlign: "left",
    fontSize: 8,
    fontWeight: "400",
    lineHeight: 9,
    color: "#6B7280",
  },
  nextSubscriptionMetaDark: {
    color: "#9CA3AF",
  },
  nextSubscriptionDuePill: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 8,
    fontWeight: "700",
    color: "#4B5563",
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  nextSubscriptionDuePillDark: {
    color: "#D1D5DB",
    backgroundColor: "#374151",
  },
  nextSubscriptionDuePillUrgent: {
    color: "#D97706",
    backgroundColor: "#FDE68A",
  },
  nextSubscriptionDuePillUrgentDark: {
    color: "#FCD34D",
    backgroundColor: "rgba(245,158,11,0.25)",
  },
  nextSubscriptionDuePillAcknowledged: {
    color: "#065F46",
    backgroundColor: "#BBF7D0",
  },
  nextSubscriptionDuePillAcknowledgedDark: {
    color: "#86EFAC",
    backgroundColor: "rgba(22,163,74,0.3)",
  },
  nextSubscriptionProgressTrack: {
    marginTop: 0,
    width: "100%",
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  nextSubscriptionProgressTrackDark: {
    backgroundColor: "#374151",
  },
  nextSubscriptionProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#64748B",
  },
  nextSubscriptionAmount: {
    marginTop: 0,
    maxWidth: "46%",
    textAlign: "right",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 12,
    color: "#111827",
  },
  nextSubscriptionAmountDark: {
    color: "#FFFFFF",
  },
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(3,7,18,0.45)",
    justifyContent: "flex-end",
  },
  categoryModalSheet: {
    minHeight: "84%",
    maxHeight: "94%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  categoryModalSheetDark: {
    backgroundColor: "#111827",
    borderColor: "#374151",
  },
  categoryModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  categoryModalHeaderDark: {
    borderBottomColor: "#374151",
  },
  categoryModalHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  categoryModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  categoryModalTitleDark: {
    color: "#F9FAFB",
  },
  categoryModalSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  categoryModalSubtitleDark: {
    color: "#9CA3AF",
  },
  categoryModalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryModalCloseButtonDark: {
    backgroundColor: "#1F2937",
  },
  categoryModalScroll: {
    flex: 1,
  },
  categoryModalScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 28,
  },
  modalSectionLabel: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  modalSectionLabelDark: {
    color: "#F3F4F6",
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  presetChip: {
    width: "48%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  presetChipDark: {
    borderColor: "#374151",
    backgroundColor: "#1F2937",
  },
  presetChipActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  presetChipDisabled: {
    opacity: 0.45,
  },
  presetChipIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  presetChipIconWrapDark: {
    backgroundColor: "#111827",
  },
  presetChipIconWrapActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  presetChipTextDark: {
    color: "#E5E7EB",
  },
  presetChipTextActive: {
    color: "#FFFFFF",
  },
  presetChipTextDisabled: {
    color: "#6B7280",
  },
  presetUnavailableText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  presetUnavailableTextDark: {
    color: "#9CA3AF",
  },
  colorPalette: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorSwatchOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  colorSwatchOuterDark: {
    borderColor: "#4B5563",
    backgroundColor: "#111827",
  },
  colorSwatchOuterActive: {
    borderColor: "#111827",
    borderWidth: 2.5,
  },
  colorSwatchInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  previewCardDark: {
    borderColor: "#374151",
    backgroundColor: "#1F2937",
  },
  previewIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCopy: {
    marginLeft: 10,
    flex: 1,
  },
  previewName: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  previewNameDark: {
    color: "#F9FAFB",
  },
  previewHint: {
    marginTop: 2,
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "500",
  },
  previewHintDark: {
    color: "#9CA3AF",
  },
  categoryModalActions: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    flexDirection: "row",
    gap: 8,
  },
  categoryModalActionsDark: {
    borderTopColor: "#374151",
  },
  modalGhostButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalGhostButtonDark: {
    borderColor: "#4B5563",
    backgroundColor: "#111827",
  },
  modalGhostText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700",
  },
  modalGhostTextDark: {
    color: "#E5E7EB",
  },
  modalPrimaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryButtonDisabled: {
    opacity: 0.6,
  },
  modalPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
