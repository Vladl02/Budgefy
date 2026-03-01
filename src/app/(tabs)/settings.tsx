import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet,ScrollView, Pressable, Image, TextInput, Alert, Keyboard, Animated, Modal } from 'react-native';
import { Diamond,
         Pencil,
         User,
         Flame,
         CalendarDays,
         Receipt,
         Trophy,
         ChevronLeft,
         ChartColumnStacked,
         CreditCard,
         PiggyBank,
         Repeat,
         Calendar,
         DollarSign,
         Languages,
         TrendingDown,
         TrendingUp,
         ChevronRight,
         ShoppingBasket,
         X


        } from 'lucide-react-native';

import * as ImagePicker from 'expo-image-picker';
import * as Haptics from "expo-haptics";
import { SlidingSheet } from '@/src/components/SlidingSheet';
import { FlatList } from 'react-native-gesture-handler';
import { useGuardedModalPush } from '@/src/hooks/guardForModals';
import { drizzle, useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useSQLiteContext } from "expo-sqlite";
import { payments, users } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DEFAULT_BASE_CURRENCY,
  DEFAULT_LANGUAGE,
  getBaseCurrencyPreference,
  getLanguagePreference,
} from "@/src/utils/preferences";

const MONTHLY_PULSE_PARTICLES = [
  { left: "8%", top: "16%", size: 5, drift: 8, peakOpacity: 0.36 },
  { left: "14%", top: "38%", size: 3, drift: 7, peakOpacity: 0.24 },
  { left: "22%", top: "62%", size: 4, drift: 10, peakOpacity: 0.3 },
  { left: "28%", top: "12%", size: 2, drift: 6, peakOpacity: 0.22 },
  { left: "34%", top: "30%", size: 3, drift: 7, peakOpacity: 0.28 },
  { left: "41%", top: "52%", size: 2, drift: 6, peakOpacity: 0.2 },
  { left: "48%", top: "70%", size: 6, drift: 11, peakOpacity: 0.33 },
  { left: "53%", top: "84%", size: 3, drift: 8, peakOpacity: 0.26 },
  { left: "58%", top: "18%", size: 4, drift: 9, peakOpacity: 0.32 },
  { left: "64%", top: "34%", size: 2, drift: 7, peakOpacity: 0.2 },
  { left: "69%", top: "48%", size: 3, drift: 8, peakOpacity: 0.3 },
  { left: "74%", top: "78%", size: 2, drift: 6, peakOpacity: 0.21 },
  { left: "79%", top: "26%", size: 5, drift: 10, peakOpacity: 0.35 },
  { left: "84%", top: "12%", size: 3, drift: 8, peakOpacity: 0.25 },
  { left: "88%", top: "68%", size: 4, drift: 9, peakOpacity: 0.31 },
  { left: "92%", top: "44%", size: 2, drift: 6, peakOpacity: 0.2 },
  { left: "18%", top: "82%", size: 3, drift: 7, peakOpacity: 0.24 },
  { left: "62%", top: "64%", size: 4, drift: 9, peakOpacity: 0.27 },
];

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

const toFlagEmoji = (regionCode: string): string =>
  String.fromCodePoint(
    ...regionCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0)),
  );

const currencyFlag = (currencyCode: string): string => {
  const regionCode = CURRENCY_REGION_MAP[currencyCode];
  if (!regionCode) return "🏳️";
  return toFlagEmoji(regionCode);
};
const languageFlag = (languageCode: string): string => {
  const regionCode = LANGUAGE_REGION_MAP[languageCode];
  if (!regionCode) return "🏳️";
  return toFlagEmoji(regionCode);
};

export default function Settings() {
  const insets = useSafeAreaInsets();
  const [baseCurrencyCode, setBaseCurrencyCode] = useState(DEFAULT_BASE_CURRENCY);
  const [languageCode, setLanguageCode] = useState(DEFAULT_LANGUAGE);
  const baseCurrencyBadge = `${currencyFlag(baseCurrencyCode)} ${baseCurrencyCode}`;
  const languageBadge = `${languageFlag(languageCode)} ${languageCode}`;
  const listBottomPadding = insets.bottom + 92;

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  //sheet options
  const [sheetVisible, setSheetVisible] = useState(false);
  const [activeOption, setActiveOption] = useState<string | null>(null);
  const closeSheet = () => setSheetVisible(false);
  const [name, setName] = useState("John Doe");
  const [editingName, setEditingName] = useState(false);
  const [showProPlans, setShowProPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("yearly");
  const [progressModal, setProgressModal] = useState<string | null>(null);
  const [streakMonth, setStreakMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const prevNameRef = useRef(name);
  const { pushModal } = useGuardedModalPush();
  const heroAnim = useRef(new Animated.Value(0)).current;
  const upgradeAnim = useRef(new Animated.Value(0)).current;
  const prefsAnim = useRef(new Animated.Value(0)).current;
  const pulseParticleAnims = useRef(MONTHLY_PULSE_PARTICLES.map(() => new Animated.Value(0))).current;
  const dbExpo = useSQLiteContext();
  const db = drizzle(dbExpo);
  const loadPreferences = useCallback(async () => {
    try {
      const [storedCurrency, storedLanguage] = await Promise.all([
        getBaseCurrencyPreference(dbExpo),
        getLanguagePreference(dbExpo),
      ]);
      setBaseCurrencyCode(storedCurrency.toUpperCase());
      setLanguageCode(storedLanguage.toUpperCase());
    } catch (error) {
      console.error("Failed to load app preferences", error);
    }
  }, [dbExpo]);

  useFocusEffect(
    useCallback(() => {
      void loadPreferences();
    }, [loadPreferences]),
  );
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
      createdAt: payments.createdAt,
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
  const formatCurrency = (cents: number): string => {
    const value = (cents || 0) / 100;
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const paymentRecords = paymentsData
    .map((item) => {
      const createdAt = toDate(item.createdAt as Date | number | string | null | undefined);
      if (!createdAt) return null;
      return {
        createdAt,
        sumCents: Number(item.sum ?? 0),
      };
    })
    .filter((item): item is { createdAt: Date; sumCents: number } => item !== null);
  const dayKeys = Array.from(
    new Set(
      paymentRecords
        .map((item) => toDayKey(item.createdAt))
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

  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const thisMonthTitle = thisMonthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const previousMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const thisMonthScanned = paymentRecords.filter((item) => item.createdAt >= thisMonthStart).length;
  const previousMonthScanned = paymentRecords.filter(
    (item) => item.createdAt >= previousMonthStart && item.createdAt < thisMonthStart,
  ).length;
  const monthOverMonth =
    previousMonthScanned === 0
      ? (thisMonthScanned > 0 ? 100 : 0)
      : Math.round(((thisMonthScanned - previousMonthScanned) / previousMonthScanned) * 100);
  const insightPrefix = monthOverMonth >= 0 ? "+" : "";
  const dayKeySet = new Set(dayKeys);
  const thisMonthDayKeyCount = Array.from(
    new Set(dayKeys.filter((key) => key.startsWith(`${thisMonthStart.getFullYear()}-${String(thisMonthStart.getMonth() + 1).padStart(2, "0")}`))),
  ).length;
  const today = new Date();
  const daysElapsedThisMonth = Math.min(
    new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() + 1, 0).getDate(),
    today.getMonth() === thisMonthStart.getMonth() && today.getFullYear() === thisMonthStart.getFullYear()
      ? today.getDate()
      : new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() + 1, 0).getDate(),
  );
  const consistencyRate = Math.round((thisMonthDayKeyCount / Math.max(daysElapsedThisMonth, 1)) * 100);
  const averageScansPerActiveDay = receiptsScanned > 0 ? (receiptsScanned / Math.max(dayKeys.length, 1)).toFixed(1) : "0.0";
  const thisMonthSpendCents = paymentRecords
    .filter((item) => item.createdAt >= thisMonthStart)
    .reduce((total, item) => total + item.sumCents, 0);
  const previousMonthSpendCents = paymentRecords
    .filter((item) => item.createdAt >= previousMonthStart && item.createdAt < thisMonthStart)
    .reduce((total, item) => total + item.sumCents, 0);
  const spendChangePercent =
    previousMonthSpendCents === 0
      ? (thisMonthSpendCents > 0 ? 100 : 0)
      : Math.round(((thisMonthSpendCents - previousMonthSpendCents) / previousMonthSpendCents) * 100);
  const spendDifferenceCents = thisMonthSpendCents - previousMonthSpendCents;
  const spendChangePrefix = spendChangePercent >= 0 ? "+" : "";
  const averageTicketCents = thisMonthScanned > 0 ? Math.round(thisMonthSpendCents / thisMonthScanned) : 0;
  const daysInThisMonth = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() + 1, 0).getDate();
  const projectedMonthSpendCents = Math.round((thisMonthSpendCents / Math.max(daysElapsedThisMonth, 1)) * daysInThisMonth);
  const noScanDaysThisMonth = Math.max(daysElapsedThisMonth - thisMonthDayKeyCount, 0);
  const thisMonthDayTotals = paymentRecords.reduce<Map<string, number>>((map, item) => {
    if (item.createdAt < thisMonthStart) return map;
    const key = toDayKey(item.createdAt);
    if (!key) return map;
    map.set(key, (map.get(key) ?? 0) + item.sumCents);
    return map;
  }, new Map<string, number>());
  let highestSpendDayKey: string | null = null;
  let highestSpendDayCents = 0;
  thisMonthDayTotals.forEach((total, key) => {
    if (total > highestSpendDayCents) {
      highestSpendDayCents = total;
      highestSpendDayKey = key;
    }
  });
  const highestSpendDayLabel = highestSpendDayKey
    ? (() => {
        const [year, month, day] = highestSpendDayKey.split("-").map(Number);
        return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      })()
    : "N/A";
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  paymentRecords.forEach((item) => {
    if (item.createdAt >= thisMonthStart) {
      weekdayCounts[item.createdAt.getDay()] += 1;
    }
  });
  let mostActiveWeekday = "N/A";
  let mostActiveWeekdayCount = 0;
  weekdayCounts.forEach((count, index) => {
    if (count > mostActiveWeekdayCount) {
      mostActiveWeekdayCount = count;
      mostActiveWeekday = weekdayNames[index];
    }
  });
  const monthlyCandles = Array.from({ length: 6 }, (_, idx) => {
    const offset = 5 - idx;
    const monthStart = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - offset, 1);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const monthDayTotals = paymentRecords.reduce<Map<string, number>>((map, item) => {
      if (item.createdAt < monthStart || item.createdAt >= monthEnd) return map;
      const key = toDayKey(item.createdAt);
      if (!key) return map;
      map.set(key, (map.get(key) ?? 0) + item.sumCents);
      return map;
    }, new Map<string, number>());
    const sortedDailyTotals = Array.from(monthDayTotals.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, total]) => total);
    const open = sortedDailyTotals[0] ?? 0;
    const close = sortedDailyTotals[sortedDailyTotals.length - 1] ?? 0;
    const high = sortedDailyTotals.length > 0 ? Math.max(...sortedDailyTotals) : 0;
    const low = sortedDailyTotals.length > 0 ? Math.min(...sortedDailyTotals) : 0;
    return {
      key: `${monthStart.getFullYear()}-${monthStart.getMonth() + 1}`,
      label: monthStart.toLocaleDateString("en-US", { month: "short" }),
      open,
      close,
      high,
      low,
    };
  });
  const candleChartMax = Math.max(...monthlyCandles.map((item) => item.high), 1);
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
  useEffect(() => {
    const loops = pulseParticleAnims.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 180),
          Animated.timing(value, {
            toValue: 1,
            duration: 1700 + index * 130,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 1700 + index * 120,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    loops.forEach((loop) => loop.start());
    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [pulseParticleAnims]);
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
    const cells: Array<{ day: number | null; key: string }> = [];

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


  const beginEditName = () => {
    prevNameRef.current = name;
    setEditingName(true);
  };

  const finishEditName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      // revert + keep user in edit mode
      setName(prevNameRef.current);
      Alert.alert("Name required", "Please enter a name.");
      return;
    }
    setName(trimmed);
    setEditingName(false);
    Keyboard.dismiss();
  };

  // Helper to render the sheet content based on activeOption
  const renderSheetContent = (close: () => void) => {
    switch (activeOption) {
      case "Category Manager":
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", alignSelf: "center" }}>Category Manager</Text>
            <Text style={{ marginTop: 8, alignSelf: "center"}}>Arrange your categories here.</Text>
            <Pressable onPress={close} style={{ marginTop: 20, alignSelf: "flex-end" }}>
              <Text>Close</Text>
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
  const settingsOptions = [
    {
      key: "category-manager",
      label: "Category Manager",
      icon: ChartColumnStacked,
      color: "#57A7FD",
      onPress: () => openSheet("Category Manager"),
    },
    {
      key: "budget-manager",
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
      label: "Saving Manager",
      icon: PiggyBank,
      color: "#FFC83C",
      onPress: () =>
        pushModal({
          pathname: "/(modals)/(settings)/savingsmanager",
        }),
    },
    {
      key: "recurring-payments",
      label: "Recurring Payments",
      icon: Repeat,
      color: "#00DDB7",
      onPress: () =>
        pushModal({
          pathname: "/(modals)/(settings)/recurringexpense",
        }),
    },
    {
      key: "shopping-list",
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
      label: "Start Date",
      icon: Calendar,
      color: "#C48FEE",
      onPress: () =>
        pushModal({
          pathname: "/(modals)/(settings)/startdate",
        }),
    },
    {
      key: "base-currency",
      label: "Base Currency",
      value: baseCurrencyBadge,
      icon: DollarSign,
      color: "#FF8544",
      onPress: () =>
        pushModal({
          pathname: "/(modals)/(settings)/currency",
        }),
    },
    {
      key: "language",
      label: "Language",
      value: languageBadge,
      icon: Languages,
      color: "#7E57FF",
      onPress: () =>
        pushModal({
          pathname: "/(modals)/(settings)/language",
        }),
    },
  ];

  return (
    <Pressable style={styles.screen} onPress={Keyboard.dismiss}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: listBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Settings</Text>

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
                <User size={36} color="#000" strokeWidth={2.5} />
              )}
            </Pressable>

            <View style={styles.nameBlock}>
              {editingName ? (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onBlur={finishEditName}
                  onSubmitEditing={finishEditName}
                  autoFocus
                  style={styles.nameInput}
                  placeholder="Your name"
                  placeholderTextColor="#aaa"
                />
              ) : (
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{name}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.editName, pressed ? styles.editNamePressed : null]}
                    onPress={beginEditName}
                    onPressIn={triggerSelectionHaptic}
                    hitSlop={10}
                  >
                    <Pencil size={13} color="#fff" strokeWidth={2.5} />
                  </Pressable>
                </View>
              )}
              <Text style={styles.nameMeta}>Active for {daysActive} days</Text>
            </View>
          </View>

          <View style={styles.progressHub}>
            <View style={styles.momentumHeader}>
              <View>
                <Text style={styles.momentumEyebrow}>Progress Hub</Text>
                <Text style={styles.momentumSubtext}>Track your consistency and scan activity</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.streakRing, pressed ? styles.progressPressed : null]}
                onPress={() => openProgressModal("streak")}
              >
                <Flame size={16} color="#FF8544" />
                <Text style={styles.streakRingText}>{currentStreak}</Text>
              </Pressable>
            </View>

            <View style={styles.statsTiles}>
              <Pressable
                style={({ pressed }) => [styles.statsTile, pressed ? styles.progressPressed : null]}
                onPress={() => openProgressModal("days")}
              >
                <CalendarDays size={15} color="#57A7FD" />
                <Text style={styles.statsTileValue}>{daysActive}</Text>
                <Text style={styles.statsTileLabel}>Days Active</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.statsTile, pressed ? styles.progressPressed : null]}
                onPress={() => openProgressModal("scanned")}
              >
                <Receipt size={15} color="#00DDB7" />
                <Text style={styles.statsTileValue}>{receiptsScanned}</Text>
                <Text style={styles.statsTileLabel}>Scanned</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.statsTile, pressed ? styles.progressPressed : null]}
                onPress={() => openProgressModal("best")}
              >
                <Trophy size={15} color="#FFC83C" />
                <Text style={styles.statsTileValue}>{bestStreak}</Text>
                <Text style={styles.statsTileLabel}>Best Streak</Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.insightCard, pressed ? styles.progressPressed : null]}
              onPress={() => openProgressModal("insight")}
            >
              <View pointerEvents="none" style={styles.insightParticlesLayer}>
                {MONTHLY_PULSE_PARTICLES.map((particle, index) => {
                  const anim = pulseParticleAnims[index];
                  const translateY = anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -particle.drift],
                  });
                  const scale = anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.82, 1.08, 0.9],
                  });
                  const opacity = anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.06, particle.peakOpacity, 0.1],
                  });

                  return (
                    <Animated.View
                      key={`pulse-particle-${index}`}
                      style={[
                        styles.insightParticle,
                        {
                          width: particle.size,
                          height: particle.size,
                          left: particle.left,
                          top: particle.top,
                          opacity,
                          transform: [{ translateY }, { scale }],
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <View style={styles.insightContentWrap}>
                <View style={styles.insightHeaderRow}>
                  <View style={styles.insightTitleWrap}>
                    <ChartColumnStacked size={14} color="#57A7FD" />
                    <Text style={styles.insightTitle}>Monthly Pulse</Text>
                  </View>
                  <ChevronRight size={14} color="#8FBFFF" />
                </View>
                <View style={styles.insightMetricsRow}>
                  <View style={styles.insightMetricChip}>
                    <Text style={styles.insightMetricLabel}>Scans</Text>
                    <Text style={styles.insightMetricValue}>{thisMonthScanned}</Text>
                  </View>
                  <View style={styles.insightMetricChip}>
                    <Text style={styles.insightMetricLabel}>Consistency</Text>
                    <Text style={styles.insightMetricValue}>{consistencyRate}%</Text>
                  </View>
                </View>
                <Text style={styles.insightTrendText}>
                  {monthOverMonth >= 0 ? "Up" : "Down"} {Math.abs(monthOverMonth)}% vs last month
                </Text>
              </View>
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
            <Diamond size={17} color="#57A7FD" strokeWidth={2.5} />
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
          <Text style={styles.sectionTitle}>Preferences</Text>
          <Text style={styles.sectionSubtitle}>Manage budgeting, language, and app behavior</Text>
        </View>

        <View style={styles.optionsSection}>
          {settingsOptions.map((option) => {
            const IconComp = option.icon;
            return (
              <Pressable
                key={option.key}
                style={({ pressed }) => [styles.optionCard, pressed ? styles.optionCardPressed : null]}
                onPressIn={triggerSelectionHaptic}
                onPress={() => {
                  triggerLightImpact();
                  option.onPress();
                }}
              >
                <View style={styles.optionIconBubble}>
                  <IconComp size={20} color={option.color} strokeWidth={2.8} />
                </View>
                <Text style={styles.optionText}>{option.label}</Text>
                {"value" in option && option.value ? (
                  <View style={styles.optionValuePill}>
                    <Text style={styles.optionValueText}>{option.value}</Text>
                  </View>
                ) : null}
                <ChevronRight size={18} style={styles.optionChevron} />
              </Pressable>
            );
          })}
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
                <Text style={styles.progressSubtitle}>
                  Green days = scanned receipt, red days = no scan.
                </Text>
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
                    const missed = !didScan && !isFuture && !isBeforeRegistration;
                    return (
                      <View
                        key={cell.key}
                        style={[
                          styles.streakCell,
                          didScan ? styles.streakCellScanned : null,
                          missed ? styles.streakCellMissed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.streakCellText,
                            didScan || missed ? styles.streakCellTextActive : null,
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
                    <View style={[styles.legendDot, { backgroundColor: "#F87171" }]} />
                    <Text style={styles.legendText}>Missed</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.progressHeaderRow}>
                  <Text style={styles.progressTitle}>
                    {progressModal === "insight"
                      ? "Monthly Insights"
                      : progressModal === "days"
                        ? "Days Active"
                        : progressModal === "scanned"
                          ? "Receipts Scanned"
                          : "Best Streak"}
                  </Text>
                  <Pressable onPress={closeProgressModal}>
                    <X size={18} color="#111827" />
                  </Pressable>
                </View>
                {progressModal === "insight" ? (
                  <ScrollView
                    style={styles.insightScroll}
                    contentContainerStyle={styles.insightScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.insightSummaryCard}>
                      <View>
                        <Text style={styles.insightSummaryLabel}>{thisMonthTitle}</Text>
                        <Text style={styles.insightSummaryValue}>{formatCurrency(thisMonthSpendCents)}</Text>
                        <Text style={styles.insightSummaryHint}>
                          {thisMonthScanned} receipts scanned this month
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.insightChangeBadge,
                          spendDifferenceCents >= 0 ? styles.insightChangeBadgeNegative : styles.insightChangeBadgePositive,
                        ]}
                      >
                        {spendDifferenceCents >= 0 ? (
                          <TrendingUp size={14} color="#DC2626" />
                        ) : (
                          <TrendingDown size={14} color="#059669" />
                        )}
                        <Text
                          style={[
                            styles.insightChangeBadgeText,
                            spendDifferenceCents >= 0 ? styles.insightChangeBadgeTextNegative : styles.insightChangeBadgeTextPositive,
                          ]}
                        >
                          {spendChangePrefix}
                          {spendChangePercent}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.insightStatGrid}>
                      <View style={styles.insightStatCard}>
                        <Text style={styles.insightStatLabel}>Last Month</Text>
                        <Text style={styles.insightStatValue}>{formatCurrency(previousMonthSpendCents)}</Text>
                      </View>
                      <View style={styles.insightStatCard}>
                        <Text style={styles.insightStatLabel}>Projected</Text>
                        <Text style={styles.insightStatValue}>{formatCurrency(projectedMonthSpendCents)}</Text>
                      </View>
                      <View style={styles.insightStatCard}>
                        <Text style={styles.insightStatLabel}>Avg Ticket</Text>
                        <Text style={styles.insightStatValue}>{formatCurrency(averageTicketCents)}</Text>
                      </View>
                      <View style={styles.insightStatCard}>
                        <Text style={styles.insightStatLabel}>No-Scan Days</Text>
                        <Text style={styles.insightStatValue}>{noScanDaysThisMonth}</Text>
                      </View>
                    </View>

                    <View style={styles.candleCard}>
                      <View style={styles.candleHeaderRow}>
                        <Text style={styles.candleTitle}>Spend Candles</Text>
                        <Text style={styles.candleSubtitle}>Last 6 Months</Text>
                      </View>
                      <View style={styles.candleChartRow}>
                        {monthlyCandles.map((month) => {
                          const chartHeight = 90;
                          const wickTop = chartHeight - (month.high / candleChartMax) * chartHeight;
                          const wickHeight = Math.max(((month.high - month.low) / candleChartMax) * chartHeight, 2);
                          const bodyTop = chartHeight - (Math.max(month.open, month.close) / candleChartMax) * chartHeight;
                          const bodyHeight = Math.max((Math.abs(month.close - month.open) / candleChartMax) * chartHeight, 3);
                          const isHigherClose = month.close > month.open;
                          const isLowerClose = month.close < month.open;
                          return (
                            <View key={month.key} style={styles.candleColumn}>
                              <View style={styles.candleTrack}>
                                <View
                                  style={[
                                    styles.candleWick,
                                    {
                                      top: wickTop,
                                      height: wickHeight,
                                    },
                                  ]}
                                />
                                <View
                                  style={[
                                    styles.candleBody,
                                    isHigherClose ? styles.candleBodyHigher : null,
                                    isLowerClose ? styles.candleBodyLower : null,
                                    {
                                      top: bodyTop,
                                      height: bodyHeight,
                                    },
                                  ]}
                                />
                              </View>
                              <Text style={styles.candleMonthLabel}>{month.label}</Text>
                            </View>
                          );
                        })}
                      </View>
                      <View style={styles.candleLegendRow}>
                        <View style={styles.candleLegendItem}>
                          <View style={[styles.candleLegendDot, styles.candleBodyHigher]} />
                          <Text style={styles.candleLegendText}>Higher close</Text>
                        </View>
                        <View style={styles.candleLegendItem}>
                          <View style={[styles.candleLegendDot, styles.candleBodyLower]} />
                          <Text style={styles.candleLegendText}>Lower close</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.detailStack}>
                      <View style={styles.detailRow}><Text style={styles.detailKey}>This month scans</Text><Text style={styles.detailValue}>{thisMonthScanned}</Text></View>
                      <View style={styles.detailRow}><Text style={styles.detailKey}>Last month scans</Text><Text style={styles.detailValue}>{previousMonthScanned}</Text></View>
                      <View style={styles.detailRow}><Text style={styles.detailKey}>Scan growth</Text><Text style={styles.detailValue}>{insightPrefix}{monthOverMonth}%</Text></View>
                      <View style={styles.detailRow}><Text style={styles.detailKey}>Spend delta</Text><Text style={styles.detailValue}>{spendDifferenceCents >= 0 ? "+" : "-"}{formatCurrency(Math.abs(spendDifferenceCents))}</Text></View>
                      <View style={styles.detailRow}><Text style={styles.detailKey}>Consistency</Text><Text style={styles.detailValue}>{consistencyRate}%</Text></View>
                      <View style={styles.detailRow}><Text style={styles.detailKey}>Avg scans / active day</Text><Text style={styles.detailValue}>{averageScansPerActiveDay}</Text></View>
                      <View style={styles.detailRow}><Text style={styles.detailKey}>Highest spend day</Text><Text style={styles.detailValue}>{highestSpendDayLabel} ({formatCurrency(highestSpendDayCents)})</Text></View>
                      <View style={styles.detailRow}><Text style={styles.detailKey}>Most active weekday</Text><Text style={styles.detailValue}>{mostActiveWeekdayCount > 0 ? `${mostActiveWeekday} (${mostActiveWeekdayCount})` : "N/A"}</Text></View>
                    </View>
                  </ScrollView>
                ) : progressModal === "days" ? (
                  <Text style={styles.progressBodyText}>
                    You have been active for {daysActive} days since registration. Active days are counted from your sign-up date.
                  </Text>
                ) : progressModal === "scanned" ? (
                  <Text style={styles.progressBodyText}>
                    You scanned {receiptsScanned} receipts in total. Keep scanning consistently to improve your streak and insights quality.
                  </Text>
                ) : progressModal === "best" ? (
                  <Text style={styles.progressBodyText}>
                    Your best streak is {bestStreak} day{bestStreak === 1 ? "" : "s"}. Beat this record by scanning receipts on consecutive days.
                  </Text>
                ) : (
                  <Text style={styles.progressBodyText}>
                    Track your scanning habits to unlock better insights over time.
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
  scrollContent: { paddingHorizontal: 12, paddingTop: 54 },
  pageTitle: {
    fontSize: 32,
    color: "#111827",
    fontFamily: "Inter_700Bold",
    marginLeft: 4,
    marginBottom: 14,
  },
  profileCard: {
    width: "100%",
    backgroundColor: "#000000",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  profileTopRow: { flexDirection: "row", alignItems: "center" },
  userProfile: {
    height: 64,
    width: 64,
    backgroundColor: "#fff",
    borderRadius: 50,
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
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  editName: {
    marginLeft: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    padding: 6,
  },
  editNamePressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  nameMeta: {
    marginTop: 3,
    color: "#A9B2C3",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  progressHub: {
    marginTop: 14,
  },
  momentumHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  momentumEyebrow: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  momentumSubtext: {
    color: "#B8BBC2",
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Inter_400Regular",
  },
  streakRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: "#FF8544",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,133,68,0.12)",
  },
  streakRingText: {
    marginTop: 2,
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  statsTiles: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  statsTile: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    paddingVertical: 10,
  },
  progressPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  statsTileValue: {
    marginTop: 6,
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statsTileLabel: {
    marginTop: 2,
    color: "#B8BBC2",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  insightCard: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: "#0C121B",
    borderWidth: 1,
    borderColor: "rgba(87,167,253,0.32)",
    paddingHorizontal: 13,
    paddingVertical: 12,
    overflow: "hidden",
    position: "relative",
  },
  insightParticlesLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  insightParticle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#57A7FD",
  },
  insightContentWrap: {
    zIndex: 1,
  },
  insightHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  insightTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  insightTitle: {
    color: "#57A7FD",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  insightMetricsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  insightMetricChip: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  insightMetricLabel: {
    color: "#AAB8CC",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  insightMetricValue: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  insightTrendText: {
    marginTop: 10,
    color: "#DCE8F8",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
  },
  nameInput: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff55",
    paddingVertical: 2,
    minWidth: 140,
  },
  upgradeCard: {
    marginTop: 10,
    backgroundColor: "#000000",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(87,167,253,0.34)",
    marginBottom: 14,
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  upgradeCardPressed: {
    transform: [{ scale: 0.988 }],
    opacity: 0.97,
  },
  upgradeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(87,167,253,0.15)",
    borderWidth: 1,
    borderColor: "rgba(87,167,253,0.42)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
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
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(87,167,253,0.16)",
    borderWidth: 1,
    borderColor: "rgba(87,167,253,0.45)",
  },
  upgradePillText: {
    color: "#57A7FD",
    fontSize: 10,
    letterSpacing: 0.5,
    fontFamily: "Inter_700Bold",
  },
  sectionHeader: { paddingHorizontal: 4, marginBottom: 8 },
  sectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  sectionSubtitle: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  optionsSection: {
    marginBottom: 30,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
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
  optionCardPressed: {
    transform: [{ scale: 0.992 }],
    backgroundColor: "#F9FAFB",
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
  optionText: {
    color: "#111827",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  optionValuePill: {
    marginLeft: "auto",
    marginRight: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  optionValueText: {
    color: "#111827",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  optionChevron: {
    opacity: 0.8,
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
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    backgroundColor: "#F3F4F6",
  },
  streakCellScanned: {
    backgroundColor: "#D1FAE5",
  },
  streakCellMissed: {
    backgroundColor: "#FEE2E2",
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
  insightScroll: {
    maxHeight: 520,
    marginTop: 4,
  },
  insightScrollContent: {
    paddingBottom: 4,
    gap: 10,
  },
  insightSummaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  insightSummaryLabel: {
    color: "#1E3A8A",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  insightSummaryValue: {
    marginTop: 3,
    color: "#0B1220",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  insightSummaryHint: {
    marginTop: 2,
    color: "#475569",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  insightChangeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
  },
  insightChangeBadgeNegative: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  insightChangeBadgePositive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#BBF7D0",
  },
  insightChangeBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  insightChangeBadgeTextNegative: {
    color: "#B91C1C",
  },
  insightChangeBadgeTextPositive: {
    color: "#047857",
  },
  insightStatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  insightStatCard: {
    flexBasis: "48%",
    flexGrow: 1,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  insightStatLabel: {
    color: "#64748B",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  insightStatValue: {
    marginTop: 4,
    color: "#0F172A",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  candleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  candleHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  candleTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  candleSubtitle: {
    color: "#64748B",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  candleChartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 112,
    paddingHorizontal: 2,
  },
  candleColumn: {
    flex: 1,
    alignItems: "center",
  },
  candleTrack: {
    width: "100%",
    height: 92,
    position: "relative",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  candleWick: {
    position: "absolute",
    width: 2,
    borderRadius: 999,
    backgroundColor: "#94A3B8",
  },
  candleBody: {
    position: "absolute",
    width: 10,
    borderRadius: 4,
    backgroundColor: "#334155",
  },
  candleBodyHigher: {
    backgroundColor: "#EF4444",
  },
  candleBodyLower: {
    backgroundColor: "#10B981",
  },
  candleMonthLabel: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  candleLegendRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 14,
  },
  candleLegendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  candleLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginRight: 5,
  },
  candleLegendText: {
    color: "#4B5563",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  detailStack: {
    marginTop: 2,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  detailKey: {
    color: "#4B5563",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  detailValue: {
    color: "#111827",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
