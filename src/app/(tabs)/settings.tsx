import {
  Calendar,
  ChartColumnStacked,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Diamond,
  DollarSign,
  Flame,
  Languages,
  Menu,
  Moon,
  PiggyBank,
  Repeat,
  ShoppingBasket,
  Trophy,
  User,
  X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { SlidingSheet } from '@/src/components/SlidingSheet';
import { payments, users } from "@/src/db/schema";
import { useGuardedModalPush } from '@/src/hooks/guardForModals';
import { useAppTheme } from "@/src/providers/AppThemeProvider";
import { useAuth } from "@/src/providers/AuthProvider";
import {
  DEFAULT_BASE_CURRENCY,
  DEFAULT_LANGUAGE,
  getBaseCurrencyPreference,
  getHomeLayoutStylePreference,
  getLanguagePreference,
  type HomeLayoutStyle,
  setHomeLayoutStylePreference,
} from "@/src/utils/preferences";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { eq } from "drizzle-orm";
import { drizzle, useLiveQuery } from "drizzle-orm/expo-sqlite";
import * as Haptics from "expo-haptics";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { useSQLiteContext } from "expo-sqlite";
import { FlatList } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SortableGridRenderItem } from "react-native-sortables";
import Sortable from "react-native-sortables";

const CURRENCY_REGION_MAP: Record<string, string> = {
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  JPY: "JP",
  CAD: "CA",
  AUD: "AU",
  CHF: "CH",
  RON: "RO",
};
const LANGUAGE_REGION_MAP: Record<string, string> = {
  EN: "US",
  ES: "ES",
  FR: "FR",
  DE: "DE",
  ZH: "CN",
  JA: "JP",
  RU: "RU",
  AR: "SA",
  HI: "IN",
  PT: "PT",
  IT: "IT",
  KO: "KR",
  NL: "NL",
  SV: "SE",
  TR: "TR",
  PL: "PL",
  VI: "VN",
  ID: "ID",
};

const FALLBACK_FLAG = "\u{1F3F3}\u{FE0F}";

const toFlagEmoji = (regionCode: unknown): string => {
  if (typeof regionCode !== "string") return FALLBACK_FLAG;

  const normalized = regionCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return FALLBACK_FLAG;

  return String.fromCodePoint(
    ...normalized.split("").map((char) => 127397 + char.charCodeAt(0)),
  );
};

const currencyFlag = (currencyCode: string): string => {
  const regionCode = CURRENCY_REGION_MAP[currencyCode];
  if (!regionCode) return FALLBACK_FLAG;
  return toFlagEmoji(regionCode);
};
const languageFlag = (languageCode: string): string => {
  const regionCode = LANGUAGE_REGION_MAP[languageCode];
  if (!regionCode) return FALLBACK_FLAG;
  return toFlagEmoji(regionCode);
};

type PreferenceItem = {
  key: string;
  kind: "toggle" | "link";
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  color: string;
  value?: string;
  onPress: () => void;
};

const SETTINGS_PREFERENCE_ORDER_STORAGE_KEY = "settings_preferences_order_v1";
const FIXED_FIRST_PREFERENCE_KEY = "recurring-payments";

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { isDark, setMode } = useAppTheme();
  const [baseCurrencyCode, setBaseCurrencyCode] = useState(DEFAULT_BASE_CURRENCY);
  const [languageCode, setLanguageCode] = useState(DEFAULT_LANGUAGE);
  const [homeLayoutStyle, setHomeLayoutStyle] = useState<HomeLayoutStyle>("grid");
  const baseCurrencyBadge = `${currencyFlag(baseCurrencyCode)} ${baseCurrencyCode}`;
  const languageBadge = `${languageFlag(languageCode)} ${languageCode}`;
  const listBottomPadding = insets.bottom + 92;

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  //sheet options
  const [sheetVisible, setSheetVisible] = useState(false);
  const [activeOption, setActiveOption] = useState<string | null>(null);
  const closeSheet = () => setSheetVisible(false);
  const [name] = useState("John Doe");
  const [showProPlans, setShowProPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("yearly");
  const [progressModal, setProgressModal] = useState<string | null>(null);
  const [preferenceOrder, setPreferenceOrder] = useState<string[] | null>(null);
  const [streakMonth, setStreakMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const { pushModal } = useGuardedModalPush();
  const heroAnim = useRef(new Animated.Value(0)).current;
  const upgradeAnim = useRef(new Animated.Value(0)).current;
  const prefsAnim = useRef(new Animated.Value(0)).current;
  const dbExpo = useSQLiteContext();
  const db = drizzle(dbExpo);
  const loadPreferences = useCallback(async () => {
    try {
      const [storedCurrency, storedLanguage, storedHomeLayoutStyle] = await Promise.all([
        getBaseCurrencyPreference(dbExpo),
        getLanguagePreference(dbExpo),
        getHomeLayoutStylePreference(dbExpo),
      ]);
      setBaseCurrencyCode(storedCurrency.toUpperCase());
      setLanguageCode(storedLanguage.toUpperCase());
      setHomeLayoutStyle(storedHomeLayoutStyle);
    } catch (error) {
      console.error("Failed to load app preferences", error);
    }
  }, [dbExpo]);

  useFocusEffect(
    useCallback(() => {
      void loadPreferences();
    }, [loadPreferences]),
  );

  useEffect(() => {
    let isMounted = true;

    const hydratePreferenceOrder = async () => {
      try {
        const rawValue = await AsyncStorage.getItem(SETTINGS_PREFERENCE_ORDER_STORAGE_KEY);
        if (!isMounted) return;

        if (!rawValue) {
          setPreferenceOrder([]);
          return;
        }

        const parsed = JSON.parse(rawValue);
        if (Array.isArray(parsed)) {
          setPreferenceOrder(parsed.filter((value): value is string => typeof value === "string"));
          return;
        }

        setPreferenceOrder([]);
      } catch (error) {
        console.error("Failed to load settings preference order", error);
        if (isMounted) {
          setPreferenceOrder([]);
        }
      }
    };

    void hydratePreferenceOrder();
    return () => {
      isMounted = false;
    };
  }, []);
  const { signOut } = useAuth();
  const usersQuery = db
    .select({
      id: users.id,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.id)
    .limit(1);
  const { data: userData } = useLiveQuery(usersQuery);
  const activeUserId = userData[0]?.id ?? 1;

  const paymentsQuery = db
    .select({
      paymentDate: payments.timedAt,
      sum: payments.sum,
    })
    .from(payments)
    .where(eq(payments.userId, activeUserId));
  const { data: paymentsData } = useLiveQuery(paymentsQuery);

  const toDate = (value: Date | number | string | null | undefined): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const toDayKey = (value: Date | number | string | null | undefined): string | null => {
    const date = toDate(value);
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const paymentRecords = paymentsData
    .map((item) => {
      const paymentDate = toDate(item.paymentDate as Date | number | string | null | undefined);
      if (!paymentDate) return null;
      return {
        paymentDate,
        sumCents: Number(item.sum ?? 0),
      };
    })
    .filter((item): item is { paymentDate: Date; sumCents: number } => item !== null);
  const dayKeys = Array.from(
    new Set(
      paymentRecords
        .map((item) => toDayKey(item.paymentDate))
        .filter((key): key is string => key !== null),
    ),
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const calculateBestStreak = (keys: string[]) => {
    if (keys.length === 0) return 0;
    let best = 1;
    let current = 1;
    for (let i = 1; i < keys.length; i += 1) {
      const prev = new Date(keys[i - 1]);
      const curr = new Date(keys[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diffDays === 1) {
        current += 1;
      } else {
        best = Math.max(best, current);
        current = 1;
      }
    }
    return Math.max(best, current);
  };
  const calculateCurrentStreak = (keys: string[]) => {
    if (keys.length === 0) return 0;
    const latest = new Date(keys[keys.length - 1]);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const latestStart = new Date(latest.getFullYear(), latest.getMonth(), latest.getDate());

    if (latestStart.getTime() !== todayStart.getTime() && latestStart.getTime() !== yesterdayStart.getTime()) {
      return 0;
    }

    let streak = 1;
    for (let i = keys.length - 1; i > 0; i -= 1) {
      const curr = new Date(keys[i]);
      const prev = new Date(keys[i - 1]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diffDays === 1) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  };

  const currentStreak = calculateCurrentStreak(dayKeys);
  const bestStreak = calculateBestStreak(dayKeys);
  const receiptsScanned = paymentRecords.length;

  const registrationDate = toDate(userData[0]?.createdAt as Date | number | string | null | undefined);
  const daysActive = registrationDate
    ? Math.max(
        1,
        Math.floor(
          (new Date().getTime() -
            new Date(
              registrationDate.getFullYear(),
              registrationDate.getMonth(),
              registrationDate.getDate(),
            ).getTime()) /
            86400000,
        ) + 1,
      )
    : 1;
  const dayKeySet = new Set(dayKeys);
  const today = new Date();
  const weeklyActivity = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

    return Array.from({ length: 7 }, (_, index) => {
      const dayDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + index);
      const dayKey = toDayKey(dayDate) ?? `week-${index}`;
      const isFuture = dayDate.getTime() > todayStart.getTime();
      return {
        key: dayKey,
        isActive: !isFuture && dayKeySet.has(dayKey),
      };
    });
  }, [dayKeySet]);
  const scanMilestones = useMemo(
    () => [
      { target: 20, tier: "Bronze Tier" },
      { target: 50, tier: "Silver Tier" },
      { target: 100, tier: "Gold Tier" },
    ],
    [],
  );
  const scanMilestoneStatus = useMemo(() => {
    const nextMilestone = scanMilestones.find((milestone) => receiptsScanned < milestone.target);
    if (!nextMilestone) {
      return {
        progressRatio: 1,
        message: "Top tier unlocked",
      };
    }

    const previousTarget =
      scanMilestones
        .filter((milestone) => milestone.target < nextMilestone.target)
        .at(-1)?.target ?? 0;
    const range = Math.max(1, nextMilestone.target - previousTarget);
    const progressRatio = Math.min(1, Math.max(0, (receiptsScanned - previousTarget) / range));
    const remainingScans = Math.max(0, nextMilestone.target - receiptsScanned);

    return {
      progressRatio,
      message: `${remainingScans} more scan${remainingScans === 1 ? "" : "s"} until ${nextMilestone.tier}`,
    };
  }, [receiptsScanned, scanMilestones]);
  const freeScanLimit = 5;
  const freeScansRemaining = 3;
  const freeScansRemainingRatio = Math.min(1, Math.max(0, freeScansRemaining / freeScanLimit));
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'it', name: 'Italian' },
    { code: 'ko', name: 'Korean' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' },
    { code: 'tr', name: 'Turkish' },
    { code: 'pl', name: 'Polish' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'id', name: 'Indonesian' },
    // Add more languages as needed
];


  const openSheet = (option: string) => {
    setActiveOption(option);
    setSheetVisible(true);
  };
  const handleToggleDarkMode = useCallback(
    (enabled: boolean) => {
      setMode(enabled ? "dark" : "light");
    },
    [setMode],
  );
  const handleHomeLayoutStyleChange = useCallback(
    (nextLayoutStyle: HomeLayoutStyle) => {
      setHomeLayoutStyle(nextLayoutStyle);
      void setHomeLayoutStylePreference(dbExpo, nextLayoutStyle).catch((error) => {
        console.error("Failed to persist home layout style", error);
      });
    },
    [dbExpo],
  );

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sign out";
      Alert.alert("Sign out failed", message);
    }
  };
  useEffect(() => {
    heroAnim.setValue(0);
    upgradeAnim.setValue(0);
    prefsAnim.setValue(0);
    Animated.stagger(90, [
      Animated.timing(heroAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(upgradeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(prefsAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [heroAnim, upgradeAnim, prefsAnim]);
  const triggerSelectionHaptic = () => {
    void Haptics.selectionAsync().catch(() => undefined);
  };
  const triggerLightImpact = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };
  const openProgressModal = (type: string) => {
    triggerSelectionHaptic();
    if (type === "streak") {
      setStreakMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    }
    setProgressModal(type);
  };
  const closeProgressModal = () => setProgressModal(null);
  const streakMonthTitle = streakMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const streakWeekDays = ["S", "M", "T", "W", "T", "F", "S"];
  const streakCalendarCells = (() => {
    const year = streakMonth.getFullYear();
    const month = streakMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { day: number | null; key: string }[] = [];

    for (let i = 0; i < firstDay; i += 1) cells.push({ day: null, key: `empty-start-${i}` });
    for (let day = 1; day <= daysInMonth; day += 1) cells.push({ day, key: `day-${day}` });
    while (cells.length % 7 !== 0) cells.push({ day: null, key: `empty-end-${cells.length}` });
    return cells;
  })();
  const proPlans = [
    {
      id: "monthly",
      title: "Monthly",
      price: "$4.99",
      period: "/month",
      description: "Flexible billing, cancel anytime.",
    },
    {
      id: "yearly",
      title: "Yearly",
      price: "$39.99",
      period: "/year",
      description: "Best value, save about 33%.",
      badge: "Recommended",
    },
    {
      id: "lifetime",
      title: "Lifetime",
      price: "$99",
      period: " one-time",
      description: "Single payment, access forever.",
    },
  ];

  // Function to pick an avatar image
  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo access to choose an avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  // Helper to render the sheet content based on activeOption
  const renderSheetContent = (close: () => void) => {
    switch (activeOption) {
      case "Category Manager":
        return (
          <View style={{ padding: 20 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                alignSelf: "center",
                color: isDark ? "#F9FAFB" : "#111827",
              }}
            >
              Category Manager
            </Text>
            <Text
              style={{
                marginTop: 8,
                alignSelf: "center",
                color: isDark ? "#9CA3AF" : "#4B5563",
              }}
            >
              Choose how categories are shown on Home.
            </Text>

            <View
              style={{
                marginTop: 18,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: isDark ? "#374151" : "#E5E7EB",
                backgroundColor: isDark ? "#1F2937" : "#F8FAFC",
                padding: 4,
                flexDirection: "row",
                gap: 6,
              }}
            >
              {(["grid", "masonry"] as const).map((layoutOption) => {
                const isActive = homeLayoutStyle === layoutOption;
                return (
                  <Pressable
                    key={layoutOption}
                    style={{
                      flex: 1,
                      minHeight: 40,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isActive ? "#111827" : "transparent",
                    }}
                    onPress={() => handleHomeLayoutStyleChange(layoutOption)}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: isActive ? "#FFFFFF" : isDark ? "#D1D5DB" : "#4B5563",
                      }}
                    >
                      {layoutOption === "grid" ? "Grid" : "Masonry"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text
              style={{
                marginTop: 10,
                color: isDark ? "#9CA3AF" : "#6B7280",
                fontSize: 12,
                alignSelf: "center",
              }}
            >
              Grid = equal cards, Masonry = staggered card heights.
            </Text>

            <Pressable onPress={close} style={{ marginTop: 20, alignSelf: "flex-end" }}>
              <Text style={{ color: isDark ? "#E5E7EB" : "#111827" }}>Close</Text>
            </Pressable>
          </View>
        );

      case "Budget Manager":
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600",alignSelf: "center" }}>Budget Manager</Text>
            <Text style={{ marginTop: 8,alignSelf: "center" }}>Configure your budgets here.</Text>
            <Pressable onPress={close} style={{ marginTop: 20, alignSelf: "flex-end" }}>
              <Text>Close</Text>
            </Pressable>
          </View>
        );

      case "Saving Manager":
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600",alignSelf: "center" }}>Saving Manager</Text>
            <Text style={{ marginTop: 8,alignSelf: "center" }}>Manage your savings goals.</Text>
            <Pressable onPress={close} style={{ marginTop: 20, alignSelf: "flex-end" }}>
              <Text>Close</Text>
            </Pressable>
          </View>
        );

      case "Recurring Payments":
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", alignSelf: "center" }}>Recurring Payments</Text>
            <Text style={{ marginTop: 8, alignSelf: "center" }}>View and edit recurring payments.</Text>
            <Pressable onPress={close} style={{ marginTop: 20, alignSelf: "flex-end" }}>
              <Text>Close</Text>
            </Pressable>
          </View>
        );

      case "Start Date":
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", alignSelf: "center" }}>Start Date</Text>
            <Text style={{ marginTop: 8, alignSelf: "center" }}>Select your financial period start date.</Text>
            <Pressable onPress={close} style={{ marginTop: 20, alignSelf: "flex-end" }}>
              <Text>Close</Text>
            </Pressable>
          </View>
        );

      case "Base Currency":
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", alignSelf: "center" }}>Base Currency</Text>
            <Text style={{ marginTop: 8, alignSelf: "center" }}>Choose your default currency.</Text>
            <Pressable onPress={close} style={{ marginTop: 20, alignSelf: "flex-end" }}>
              <Text>Close</Text>
            </Pressable>
          </View>
        );

      case "Language":
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", alignSelf: "center" }}>Language</Text>
            <Text style={{ marginTop: 8, alignSelf: "center" }}>Select your app language.</Text>
            <FlatList
                    data={languages}
                    keyExtractor={(item) => item.code}
                    renderItem={({ item }) => <Text>{item.code}{item.name}</Text>}
                  />
          </View>
        );

      default:
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600" }}>{activeOption}</Text>
            <Text style={{ marginTop: 8 }}>No content defined yet.</Text>
            <Pressable onPress={close} style={{ marginTop: 20, alignSelf: "flex-end" }}>
              <Text>Close</Text>
            </Pressable>
          </View>
        );
    }
  };
  const persistPreferenceOrder = useCallback((nextOrder: string[]) => {
    setPreferenceOrder(nextOrder);
    void AsyncStorage.setItem(SETTINGS_PREFERENCE_ORDER_STORAGE_KEY, JSON.stringify(nextOrder)).catch((error) => {
      console.error("Failed to persist settings preference order", error);
    });
  }, []);

  const enforcePreferenceConstraints = useCallback((keys: string[]) => {
    const deduped: string[] = [];
    keys.forEach((key) => {
      if (deduped.includes(key)) return;
      deduped.push(key);
    });

    const withoutFixed = deduped.filter((key) => key !== FIXED_FIRST_PREFERENCE_KEY);
    return [FIXED_FIRST_PREFERENCE_KEY, ...withoutFixed];
  }, []);

  const preferenceItems = useMemo<PreferenceItem[]>(
    () => [
      {
        key: "recurring-payments",
        kind: "link",
        label: "Recurring Payments",
        icon: Repeat,
        color: "#00DDB7",
        onPress: () =>
          pushModal({
            pathname: "/(modals)/(settings)/recurringexpense",
          }),
      },
      {
        key: "category-manager",
        kind: "link",
        label: "Category Manager",
        icon: ChartColumnStacked,
        color: "#57A7FD",
        onPress: () => openSheet("Category Manager"),
      },
      {
        key: "budget-manager",
        kind: "link",
        label: "Budget Manager",
        icon: CreditCard,
        color: "#FE5A59",
        onPress: () =>
          pushModal({
            pathname: "/(modals)/(settings)/budget",
          }),
      },
      {
        key: "saving-manager",
        kind: "link",
        label: "Saving Manager",
        icon: PiggyBank,
        color: "#FFC83C",
        onPress: () =>
          pushModal({
            pathname: "/(modals)/(settings)/savingsmanager",
          }),
      },
      {
        key: "shopping-list",
        kind: "link",
        label: "Shopping List",
        icon: ShoppingBasket,
        color: "#FF8544",
        onPress: () =>
          pushModal({
            pathname: "/(modals)/(settings)/shoppinglist",
          }),
      },
      {
        key: "start-date",
        kind: "link",
        label: "Start Date",
        icon: Calendar,
        color: "#C48FEE",
        onPress: () =>
          pushModal({
            pathname: "/(modals)/(settings)/startdate",
          }),
      },
    ],
    [openSheet, pushModal],
  );

  const orderedPreferenceItems = useMemo(() => {
    const keyToItem = new Map(preferenceItems.map((item) => [item.key, item] as const));
    const defaultOrder = preferenceItems.map((item) => item.key);
    const sourceOrder = preferenceOrder && preferenceOrder.length > 0 ? preferenceOrder : defaultOrder;
    const nextOrder: string[] = [];

    sourceOrder.forEach((key) => {
      if (!keyToItem.has(key) || nextOrder.includes(key)) return;
      nextOrder.push(key);
    });

    defaultOrder.forEach((key) => {
      if (nextOrder.includes(key)) return;
      nextOrder.push(key);
    });

    const constrainedOrder = enforcePreferenceConstraints(nextOrder);
    return constrainedOrder
      .map((key) => keyToItem.get(key))
      .filter((item): item is PreferenceItem => Boolean(item));
  }, [enforcePreferenceConstraints, preferenceItems, preferenceOrder]);

  const handlePreferencesDragEnd = useCallback(
    ({ data }: { data: PreferenceItem[] }) => {
      const constrainedKeys = enforcePreferenceConstraints(data.map((item) => item.key));
      persistPreferenceOrder(constrainedKeys);
    },
    [enforcePreferenceConstraints, persistPreferenceOrder],
  );

  const renderPreferenceItem = useCallback<SortableGridRenderItem<PreferenceItem>>(
    ({ item }) => {
      const IconComp = item.icon;
      const pressedStyle = isDark ? styles.optionCardPressedDark : styles.optionCardPressed;

      return (
        <Pressable
          style={({ pressed }) => [
            styles.optionCard,
            isDark ? styles.optionCardDark : null,
            pressed ? pressedStyle : null,
          ]}
          onPress={item.onPress}
        >
          <View style={[styles.optionIconBubble, isDark ? styles.optionIconBubbleDark : null]}>
            <IconComp size={20} color={item.color} strokeWidth={2.8} />
          </View>
          <Text style={[styles.optionText, isDark ? styles.optionTextDark : null]}>{item.label}</Text>
          <ChevronRight size={18} style={styles.optionChevron} color={isDark ? "#9CA3AF" : "#6B7280"} />
          <View style={styles.optionRightCluster}>
            {item.value ? (
              <View style={[styles.optionValuePill, isDark ? styles.optionValuePillDark : null]}>
                <Text style={[styles.optionValueText, isDark ? styles.optionValueTextDark : null]}>{item.value}</Text>
              </View>
            ) : null}
            <Sortable.Handle mode="draggable">
              <View style={[styles.dragHandleWrap, isDark ? styles.dragHandleWrapDark : null]}>
                <Menu size={14} color={isDark ? "#9CA3AF" : "#9AA2AF"} strokeWidth={2.4} />
              </View>
            </Sortable.Handle>
          </View>
        </Pressable>
      );
    },
    [isDark],
  );

  return (
    <Pressable style={[styles.screen, isDark ? styles.screenDark : null]} onPress={Keyboard.dismiss}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: listBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeaderRow}>
          <Text style={[styles.pageTitle, isDark ? styles.pageTitleDark : null]}>Settings</Text>
          <Pressable
            onPress={() => void handleSignOut()}
            style={[styles.signOutButton, isDark ? styles.signOutButtonDark : null]}
            hitSlop={10}
          >
            <Text style={[styles.signOutButtonText, isDark ? styles.signOutButtonTextDark : null]}>Sign out</Text>
          </Pressable>
        </View>

        <Animated.View
          style={[
            styles.profileCard,
            {
              opacity: heroAnim,
              transform: [
                {
                  translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
                },
              ],
            },
          ]}
        >
          <View style={styles.profileTopRow}>
            <Pressable
              style={({ pressed }) => [styles.userProfile, pressed ? styles.avatarPressed : null]}
              onPress={pickAvatar}
              onPressIn={triggerSelectionHaptic}
              hitSlop={10}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <User size={30} color="#000" strokeWidth={2.5} />
              )}
            </Pressable>

            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{name}</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.streakRing, styles.streakRingTopRow, pressed ? styles.progressPressed : null]}
              onPress={() => openProgressModal("streak")}
            >
              <Flame size={15} color="#FF9A5A" />
              <Text style={styles.streakRingText}>{currentStreak}</Text>
            </Pressable>
          </View>

          <View style={styles.progressHub}>
            <View style={styles.momentumHeader}>
              <Text style={styles.momentumEyebrow}>Progress Hub</Text>
            </View>
            <Pressable style={styles.progressWeekRowWrap} onPress={() => openProgressModal("streak")}>
              <View style={[styles.weekHeatmapRow, styles.weekHeatmapRowHeader]}>
                {weeklyActivity.map((day) => (
                  <View
                    key={day.key}
                    style={[
                      styles.weekHeatmapDot,
                      day.isActive ? styles.weekHeatmapDotActive : null,
                    ]}
                  />
                ))}
              </View>
            </Pressable>

            <View style={styles.statsTiles}>
              <Pressable
                style={({ pressed }) => [
                  styles.statsTile,
                  pressed ? styles.progressPressed : null,
                ]}
                onPress={() => openProgressModal("days")}
              >
                <Text style={styles.statsTileValue}>{daysActive}</Text>
                <Text style={styles.statsTileLabel}>Days Active</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.statsTile,
                  pressed ? styles.progressPressed : null,
                ]}
                onPress={() => openProgressModal("scanned")}
              >
                <Text style={styles.statsTileValue}>{receiptsScanned}</Text>
                <Text style={styles.statsTileLabel}>Scanned</Text>
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [styles.scanMilestoneSection, pressed ? styles.progressPressed : null]}
              onPress={() => openProgressModal("scanned")}
            >
              <View style={styles.scanMilestoneTrack}>
                <View
                  style={[
                    styles.scanMilestoneFill,
                    { width: `${Math.round(scanMilestoneStatus.progressRatio * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.scanMilestoneText}>{scanMilestoneStatus.message}</Text>
            </Pressable>

          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: upgradeAnim,
            transform: [
              {
                translateY: upgradeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
              },
            ],
          }}
        >
        <Pressable
          style={({ pressed }) => [styles.upgradeCard, pressed ? styles.upgradeCardPressed : null]}
          onPressIn={triggerSelectionHaptic}
          onPress={() => {
            triggerLightImpact();
            setShowProPlans(true);
          }}
        >
          <View style={styles.upgradeIconWrap}>
            <Diamond size={16} color="#FF9A5A" strokeWidth={2.4} style={styles.upgradeIcon} />
          </View>
          <View style={styles.upgradeContent}>
            <Text style={styles.upgradeTitle}>Upgrade To Pro</Text>
            <Text style={styles.upgradeSubtitle}>Advanced insights, unlimited scans, priority features</Text>
          </View>
          <View style={styles.upgradePill}>
            <Text style={styles.upgradePillText}>PRO</Text>
          </View>
          <ChevronRight size={16} color="#fff" style={{ marginLeft: 10 }} />
        </Pressable>
        <View style={[styles.freeScansCard, isDark ? styles.freeScansCardDark : null]}>
          <View style={styles.freeScansHeaderRow}>
            <Text style={[styles.freeScansTitle, isDark ? styles.freeScansTitleDark : null]}>Free Scans</Text>
            <Text style={[styles.freeScansRemainingText, isDark ? styles.freeScansRemainingTextDark : null]}>
              {freeScansRemaining} of {freeScanLimit} remaining
            </Text>
          </View>
          <View style={[styles.freeScansTrack, isDark ? styles.freeScansTrackDark : null]}>
            <LinearGradient
              colors={["#FDE68A", "#FACC15", "#D97706"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.freeScansFill, { width: `${Math.round(freeScansRemainingRatio * 100)}%` }]}
            />
          </View>
        </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: prefsAnim,
            transform: [
              {
                translateY: prefsAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
              },
            ],
          }}
        >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDark ? styles.sectionTitleDark : null]}>Preferences</Text>
          <Text style={[styles.sectionSubtitle, isDark ? styles.sectionSubtitleDark : null]}>
            Manage budgeting, language, and app behavior
          </Text>
        </View>

        <View style={[styles.optionsSection, isDark ? styles.optionsSectionDark : null]}>
          <Sortable.Grid
            data={orderedPreferenceItems}
            keyExtractor={(item) => item.key}
            columns={1}
            rowGap={0}
            hapticsEnabled={false}
            customHandle
            dragActivationDelay={180}
            dropAnimationDuration={120}
            activeItemScale={1}
            activeItemOpacity={1}
            inactiveItemScale={1}
            inactiveItemOpacity={1}
            onDragEnd={handlePreferencesDragEnd}
            renderItem={renderPreferenceItem}
          />
        </View>
        <Text style={[styles.appearanceTitle, isDark ? styles.appearanceTitleDark : null]}>
          Appearance
        </Text>
        <View style={[styles.darkModeSection, styles.stackedStandaloneSection, isDark ? styles.darkModeSectionDark : null]}>
          <Pressable
            style={({ pressed }) => [
              styles.optionCard,
              styles.darkModeCard,
              isDark ? styles.optionCardDark : null,
              pressed ? (isDark ? styles.optionCardPressedDark : styles.optionCardPressed) : null,
            ]}
            onPress={() => handleToggleDarkMode(!isDark)}
          >
            <View style={[styles.optionIconBubble, isDark ? styles.optionIconBubbleDark : null]}>
              <Moon size={20} color={isDark ? "#FDE68A" : "#374151"} strokeWidth={2.8} />
            </View>
            <View style={styles.darkModeTextColumn}>
              <Text style={[styles.optionText, isDark ? styles.optionTextDark : null]}>Dark Mode</Text>
              <Text style={[styles.darkModeDescription, isDark ? styles.darkModeDescriptionDark : null]}>
                Use a darker look across the app.
              </Text>
            </View>
            <View style={styles.optionSwitchWrap}>
              <Switch
                value={isDark}
                onValueChange={handleToggleDarkMode}
                trackColor={{ false: "#D1D5DB", true: "#000000" }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={isDark ? "#111111" : "#D1D5DB"}
              />
            </View>
          </Pressable>
        </View>
        <Text style={[styles.appearanceTitle, isDark ? styles.appearanceTitleDark : null]}>
          Currency
        </Text>
        <View style={[styles.darkModeSection, isDark ? styles.darkModeSectionDark : null]}>
          <Pressable
            style={({ pressed }) => [
              styles.optionCard,
              styles.darkModeCard,
              isDark ? styles.optionCardDark : null,
              pressed ? (isDark ? styles.optionCardPressedDark : styles.optionCardPressed) : null,
            ]}
            onPress={() =>
              pushModal({
                pathname: "/(modals)/(settings)/currency",
              })
            }
          >
            <View style={[styles.optionIconBubble, isDark ? styles.optionIconBubbleDark : null]}>
              <DollarSign size={20} color="#FF8544" strokeWidth={2.8} />
            </View>
            <View style={styles.darkModeTextColumn}>
              <Text style={[styles.optionText, isDark ? styles.optionTextDark : null]}>Base Currency</Text>
              <Text style={[styles.darkModeDescription, isDark ? styles.darkModeDescriptionDark : null]}>
                Choose the currency used for totals.
              </Text>
            </View>
            <View style={styles.optionRightCluster}>
              <View style={[styles.optionValuePill, isDark ? styles.optionValuePillDark : null]}>
                <Text style={[styles.optionValueText, isDark ? styles.optionValueTextDark : null]}>{baseCurrencyBadge}</Text>
              </View>
              <ChevronRight size={18} style={styles.optionChevron} color={isDark ? "#9CA3AF" : "#6B7280"} />
            </View>
          </Pressable>
        </View>
        <Text style={[styles.appearanceTitle, isDark ? styles.appearanceTitleDark : null]}>
          Language
        </Text>
        <View style={[styles.darkModeSection, styles.lastStandaloneSection, isDark ? styles.darkModeSectionDark : null]}>
          <Pressable
            style={({ pressed }) => [
              styles.optionCard,
              styles.darkModeCard,
              isDark ? styles.optionCardDark : null,
              pressed ? (isDark ? styles.optionCardPressedDark : styles.optionCardPressed) : null,
            ]}
            onPress={() =>
              pushModal({
                pathname: "/(modals)/(settings)/language",
              })
            }
          >
            <View style={[styles.optionIconBubble, isDark ? styles.optionIconBubbleDark : null]}>
              <Languages size={20} color="#7E57FF" strokeWidth={2.8} />
            </View>
            <View style={styles.darkModeTextColumn}>
              <Text style={[styles.optionText, isDark ? styles.optionTextDark : null]}>Language</Text>
              <Text style={[styles.darkModeDescription, isDark ? styles.darkModeDescriptionDark : null]}>
                Set your preferred app language.
              </Text>
            </View>
            <View style={styles.optionRightCluster}>
              <View style={[styles.optionValuePill, isDark ? styles.optionValuePillDark : null]}>
                <Text style={[styles.optionValueText, isDark ? styles.optionValueTextDark : null]}>{languageBadge}</Text>
              </View>
              <ChevronRight size={18} style={styles.optionChevron} color={isDark ? "#9CA3AF" : "#6B7280"} />
            </View>
          </Pressable>
        </View>
        </Animated.View>
      </ScrollView>
      <Modal visible={showProPlans} transparent animationType="fade" onRequestClose={() => setShowProPlans(false)}>
        <Pressable style={styles.proOverlay} onPress={() => setShowProPlans(false)}>
          <View style={styles.proSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.proHandle} />
            <Text style={styles.proTitle}>Choose Your Pro Plan</Text>
            <Text style={styles.proSubtitle}>Unlock premium tools and faster workflows.</Text>

            <View style={styles.proPlansList}>
              {proPlans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <Pressable
                    key={plan.id}
                    style={[styles.proPlanCard, isSelected ? styles.proPlanCardSelected : null]}
                    onPress={() => {
                      triggerSelectionHaptic();
                      setSelectedPlanId(plan.id);
                    }}
                  >
                    <View style={styles.proPlanTop}>
                      <Text style={styles.proPlanTitle}>{plan.title}</Text>
                      {plan.badge ? <Text style={styles.proPlanBadge}>{plan.badge}</Text> : null}
                    </View>
                    <View style={styles.proPriceRow}>
                      <Text style={styles.proPlanPrice}>{plan.price}</Text>
                      <Text style={styles.proPlanPeriod}>{plan.period}</Text>
                    </View>
                    <Text style={styles.proPlanDescription}>{plan.description}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={styles.proContinueBtn}
              onPress={() => {
                triggerLightImpact();
                const selectedPlan = proPlans.find((plan) => plan.id === selectedPlanId);
                Alert.alert("Plan Selected", `${selectedPlan?.title ?? "Pro"} checkout coming soon.`);
                setShowProPlans(false);
              }}
            >
              <Text style={styles.proContinueText}>Continue</Text>
            </Pressable>
            <Pressable style={styles.proDismissBtn} onPress={() => setShowProPlans(false)}>
              <Text style={styles.proDismissText}>Not now</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <Modal visible={progressModal !== null} transparent animationType="fade" onRequestClose={closeProgressModal}>
        <Pressable style={styles.progressOverlay} onPress={closeProgressModal}>
          <View style={styles.progressSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.progressHandle} />
            {progressModal === "streak" ? (
              <>
                <View style={styles.progressHeaderRow}>
                  <Text style={styles.progressTitle}>Current Streak</Text>
                  <Pressable onPress={closeProgressModal}>
                    <X size={18} color="#111827" />
                  </Pressable>
                </View>
                <View style={styles.streakMonthRow}>
                  <Pressable
                    style={styles.streakMonthBtn}
                    onPress={() => setStreakMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  >
                    <ChevronLeft size={16} color="#111827" />
                  </Pressable>
                  <Text style={styles.streakMonthText}>{streakMonthTitle}</Text>
                  <Pressable
                    style={styles.streakMonthBtn}
                    onPress={() => setStreakMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  >
                    <ChevronRight size={16} color="#111827" />
                  </Pressable>
                </View>
                <View style={styles.streakWeekRow}>
                  {streakWeekDays.map((day, idx) => (
                    <Text key={`${day}-${idx}`} style={styles.streakWeekText}>
                      {day}
                    </Text>
                  ))}
                </View>
                <View style={styles.streakGrid}>
                  {streakCalendarCells.map((cell) => {
                    if (!cell.day) return <View key={cell.key} style={styles.streakCell} />;
                    const date = new Date(streakMonth.getFullYear(), streakMonth.getMonth(), cell.day);
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
                    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const registrationStart = registrationDate
                      ? new Date(registrationDate.getFullYear(), registrationDate.getMonth(), registrationDate.getDate())
                      : null;
                    const isFuture = date.getTime() > todayStart.getTime();
                    const isBeforeRegistration = !!registrationStart && date.getTime() < registrationStart.getTime();
                    const didScan = dayKeySet.has(key);
                    const isPlainDay = !didScan || isFuture || isBeforeRegistration;
                    return (
                      <View
                        key={cell.key}
                        style={[
                          styles.streakCell,
                          didScan ? styles.streakCellScanned : null,
                          isPlainDay ? styles.streakCellPlain : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.streakCellText,
                            didScan ? styles.streakCellTextActive : null,
                          ]}
                        >
                          {cell.day}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.streakLegendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#22C55E" }]} />
                    <Text style={styles.legendText}>Scanned</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#9CA3AF" }]} />
                    <Text style={styles.legendText}>Missed</Text>
                  </View>
                </View>
                <View style={styles.streakStatsCard}>
                  <View style={styles.streakStatItem}>
                    <View style={styles.streakStatLabelRow}>
                      <Flame size={13} color="#F59E0B" />
                      <Text style={styles.streakStatLabel}>Current</Text>
                    </View>
                    <Text style={styles.streakStatValue}>
                      {currentStreak} day{currentStreak === 1 ? "" : "s"}
                    </Text>
                  </View>
                  <View style={styles.streakStatsDivider} />
                  <View style={styles.streakStatItem}>
                    <View style={styles.streakStatLabelRow}>
                      <Trophy size={13} color="#F59E0B" />
                      <Text style={styles.streakStatLabel}>Best</Text>
                    </View>
                    <Text style={styles.streakStatValue}>
                      {bestStreak} day{bestStreak === 1 ? "" : "s"}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.progressHeaderRow}>
                  <Text style={styles.progressTitle}>
                    {progressModal === "days"
                      ? "Days Active"
                      : "Receipts Scanned"}
                  </Text>
                  <Pressable onPress={closeProgressModal}>
                    <X size={18} color="#111827" />
                  </Pressable>
                </View>
                {progressModal === "days" ? (
                  <Text style={styles.progressBodyText}>
                    You have been active for {daysActive} days since registration. Active days are counted from your sign-up date.
                  </Text>
                ) : (
                  <Text style={styles.progressBodyText}>
                    You scanned {receiptsScanned} receipts in total. Keep scanning consistently to improve your streak and insights quality.
                  </Text>
                )}
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {sheetVisible && (
        <SlidingSheet onDismiss={closeSheet} heightPercent={0.9}>
          {(close) => renderSheetContent(close)}
        </SlidingSheet>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F4F6" },
  screenDark: { backgroundColor: "#000000" },
  scrollContent: { paddingHorizontal: 12, paddingTop: 54 },
  pageTitle: {
    fontSize: 19,
    color: "#111827",
    fontFamily: "Inter_600SemiBold",
    marginLeft: 4,
  },
  pageTitleDark: {
    color: "#F9FAFB",
  },
  pageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 14,
  },
  signOutButton: {
    paddingHorizontal: 2,
    paddingVertical: 0,
    backgroundColor: "transparent",
  },
  signOutButtonDark: {
    backgroundColor: "transparent",
  },
  signOutButtonText: {
    color: "rgba(17,24,39,0.6)",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
  },
  signOutButtonTextDark: {
    color: "rgba(255,255,255,0.6)",
  },
  profileCard: {
    width: "100%",
    backgroundColor: "#000000",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  profileTopRow: { flexDirection: "row", alignItems: "center" },
  userProfile: {
    height: 56,
    width: 56,
    backgroundColor: "#fff",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  nameBlock: { marginLeft: 12, flex: 1 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userName: {
    color: "#E5E7EB",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  progressHub: {
    marginTop: 18,
  },
  momentumHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  momentumEyebrow: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  streakRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#FF9A5A",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,154,90,0.2)",
    shadowColor: "#FF9A5A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.34,
    shadowRadius: 8,
    elevation: 5,
  },
  streakRingTopRow: {
    marginLeft: 10,
    flexShrink: 0,
  },
  streakRingText: {
    marginTop: 1,
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  statsTiles: {
    marginTop: 10,
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    columnGap: 18,
  },
  statsTile: {
    minWidth: 108,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingVertical: 2,
  },
  progressWeekRowWrap: {
    marginTop: 10,
    alignSelf: "flex-start",
  },
  progressPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  statsTileValue: {
    marginTop: 0,
    color: "#fff",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  statsTileLabel: {
    marginTop: 1,
    color: "#8C95A3",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "left",
  },
  weekHeatmapRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 1,
  },
  weekHeatmapRowHeader: {
    justifyContent: "flex-start",
    marginBottom: 0,
  },
  weekHeatmapDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  weekHeatmapDotActive: {
    backgroundColor: "#FFFFFF",
  },
  scanMilestoneSection: {
    marginTop: 6,
  },
  scanMilestoneTrack: {
    width: "100%",
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
  },
  scanMilestoneFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  scanMilestoneText: {
    marginTop: 6,
    color: "#9CA3AF",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  upgradeCard: {
    marginTop: 12,
    backgroundColor: "#17181B",
    borderRadius: 20,
    borderWidth: 0,
    marginBottom: 14,
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  upgradeCardPressed: {
    transform: [{ scale: 0.988 }],
    opacity: 0.97,
  },
  freeScansCard: {
    marginTop: 10,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  freeScansCardDark: {
    backgroundColor: "#1C1C1D",
    borderColor: "#2E2E2E",
  },
  freeScansHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  freeScansTitle: {
    color: "#111827",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  freeScansTitleDark: {
    color: "#F9FAFB",
  },
  freeScansRemainingText: {
    color: "#6B7280",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  freeScansRemainingTextDark: {
    color: "#9CA3AF",
  },
  freeScansTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  freeScansTrackDark: {
    backgroundColor: "#2E2E2E",
  },
  freeScansFill: {
    height: "100%",
    borderRadius: 999,
  },
  upgradeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,154,90,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,154,90,0.46)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  upgradeIcon: {
    transform: [{ translateY: 0.5 }],
  },
  upgradeContent: {
    flex: 1,
  },
  upgradeTitle: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  upgradeSubtitle: {
    color: "#B8C2D1",
    fontSize: 11,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  upgradePill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(250,204,21,0.2)",
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.55)",
  },
  upgradePillText: {
    color: "#FDE68A",
    fontSize: 11,
    letterSpacing: 0.5,
    fontFamily: "Inter_700Bold",
  },
  sectionHeader: { paddingHorizontal: 4, marginBottom: 8 },
  sectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginRight: 10,
  },
  sectionTitleDark: {
    color: "#F9FAFB",
  },
  sectionSubtitle: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  sectionSubtitleDark: {
    color: "#9CA3AF",
  },
  optionsSection: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  optionsSectionDark: {
    backgroundColor: "#1C1C1D",
    borderColor: "#2E2E2E",
  },
  appearanceTitle: {
    marginTop: 0,
    marginLeft: 4,
    marginRight: 10,
    marginBottom: 8,
    color: "#6B7280",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  appearanceTitleDark: {
    color: "#9CA3AF",
  },
  darkModeSection: {
    marginTop: 0,
    marginBottom: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  darkModeSectionDark: {
    backgroundColor: "#1C1C1D",
    borderColor: "#2E2E2E",
  },
  stackedStandaloneSection: {
    marginBottom: 14,
  },
  lastStandaloneSection: {
    marginTop: 0,
    marginBottom: 30,
  },
  optionCard: {
    minHeight: 60,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  optionCardDark: {
    backgroundColor: "#1C1C1D",
    borderBottomColor: "#2E2E2E",
  },
  darkModeCard: {
    borderBottomWidth: 0,
  },
  darkModeTextColumn: {
    flex: 1,
    justifyContent: "center",
  },
  darkModeDescription: {
    marginTop: 2,
    color: "#6B7280",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  darkModeDescriptionDark: {
    color: "#9CA3AF",
  },
  optionCardPressed: {
    transform: [{ scale: 0.992 }],
    backgroundColor: "#F1F3F5",
  },
  optionCardPressedDark: {
    transform: [{ scale: 0.992 }],
    backgroundColor: "#2A2A2C",
  },
  optionIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionIconBubbleDark: {
    backgroundColor: "#1C1C1D",
    borderColor: "#2d2d2d",
  },
  optionText: {
    color: "#111827",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  optionTextDark: {
    color: "#F3F4F6",
  },
  optionSwitchWrap: {
    marginLeft: "auto",
  },
  optionValuePill: {
    marginLeft: "auto",
    marginRight: 8,
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  optionValuePillDark: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  optionValueText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  optionValueTextDark: {
    color: "#FFFFFF",
  },
  optionRightCluster: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
  },
  optionChevron: {
    marginLeft: 6,
    marginRight: 4,
    opacity: 0.8,
  },
  dragHandleWrap: {
    marginLeft: 6,
    marginRight: -6,
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2F7",
  },
  dragHandleWrapDark: {
    backgroundColor: "#2A2A2C",
  },
  proOverlay: {
    flex: 1,
    backgroundColor: "rgba(4,8,16,0.45)",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  proSheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  proHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginBottom: 10,
  },
  proTitle: {
    fontSize: 19,
    color: "#111827",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  proSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  proPlansList: {
    marginTop: 12,
    gap: 8,
  },
  proPlanCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  proPlanCardSelected: {
    borderColor: "#111827",
    backgroundColor: "#EEF2FF",
  },
  proPlanTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  proPlanTitle: {
    fontSize: 14,
    color: "#111827",
    fontFamily: "Inter_600SemiBold",
  },
  proPlanBadge: {
    fontSize: 10,
    color: "#1D4ED8",
    fontFamily: "Inter_600SemiBold",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
  },
  proPriceRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "baseline",
  },
  proPlanPrice: {
    fontSize: 22,
    color: "#111827",
    fontFamily: "Inter_700Bold",
  },
  proPlanPeriod: {
    marginLeft: 4,
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Inter_500Medium",
  },
  proPlanDescription: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Inter_400Regular",
  },
  proContinueBtn: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#111827",
    paddingVertical: 12,
    alignItems: "center",
  },
  proContinueText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  proDismissBtn: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 8,
  },
  proDismissText: {
    color: "#6B7280",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  progressOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  progressSheet: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  progressHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginBottom: 10,
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressTitle: {
    color: "#111827",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  progressSubtitle: {
    color: "#6B7280",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 10,
  },
  progressBodyText: {
    marginTop: 8,
    color: "#374151",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_500Medium",
  },
  streakMonthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  streakMonthBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  streakMonthText: {
    color: "#111827",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  streakWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  streakWeekText: {
    width: "14.2%",
    textAlign: "center",
    color: "#6B7280",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  streakGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  streakCell: {
    width: "14.2%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  streakCellScanned: {
    backgroundColor: "#D1FAE5",
    borderRadius: 10,
  },
  streakCellPlain: {
    backgroundColor: "transparent",
    borderRadius: 0,
  },
  streakCellText: {
    color: "#6B7280",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  streakCellTextActive: {
    color: "#111827",
    fontFamily: "Inter_700Bold",
  },
  streakLegendRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 14,
  },
  streakStatsCard: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  streakStatItem: {
    flex: 1,
    alignItems: "center",
  },
  streakStatLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakStatLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  streakStatValue: {
    marginTop: 2,
    color: "#111827",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  streakStatsDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#E5E7EB",
    marginHorizontal: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 6,
  },
  legendText: {
    color: "#4B5563",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
