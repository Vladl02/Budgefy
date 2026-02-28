import React, { useEffect, useRef, useState } from 'react';
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


export default function Settings() {

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
  const dbExpo = useSQLiteContext();
  const db = drizzle(dbExpo);
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
  const dayKeys = Array.from(
    new Set(
      paymentsData
        .map((item) => toDayKey(item.createdAt as Date | number | string | null | undefined))
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
  const receiptsScanned = paymentsData.length;

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
  const previousMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const thisMonthScanned = paymentsData.filter((item) => {
    const created = toDate(item.createdAt as Date | number | string | null | undefined);
    return !!created && created >= thisMonthStart;
  }).length;
  const previousMonthScanned = paymentsData.filter((item) => {
    const created = toDate(item.createdAt as Date | number | string | null | undefined);
    return !!created && created >= previousMonthStart && created < thisMonthStart;
  }).length;
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
  const milestones = [
    { label: "7-day streak", done: currentStreak >= 7 || bestStreak >= 7 },
    { label: "30 active days", done: daysActive >= 30 },
    { label: "100 scans", done: receiptsScanned >= 100 },
  ];
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

            <View style={styles.milestoneRow}>
              {milestones.map((milestone) => (
                <Pressable
                  key={milestone.label}
                  onPress={() => openProgressModal(`milestone:${milestone.label}`)}
                  style={[styles.milestonePill, milestone.done ? styles.milestonePillDone : null]}
                >
                  <Text style={[styles.milestoneText, milestone.done ? styles.milestoneTextDone : null]}>
                    {milestone.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.insightCard, pressed ? styles.progressPressed : null]}
              onPress={() => openProgressModal("insight")}
            >
              <Text style={styles.insightTitle}>Monthly Insight</Text>
              <Text style={styles.insightText}>
                You scanned {thisMonthScanned} receipts this month ({insightPrefix}
                {monthOverMonth}% vs last month).
              </Text>
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
            <Diamond size={17} color="#F8D26A" strokeWidth={2.5} />
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
                <ChevronRight size={18} style={styles.optionChevron} />
              </Pressable>
            );
          })}
        </View>
        </Animated.View>

        <View style={{ height: 50 }} />
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
                          : progressModal === "best"
                            ? "Best Streak"
                            : "Milestone Details"}
                  </Text>
                  <Pressable onPress={closeProgressModal}>
                    <X size={18} color="#111827" />
                  </Pressable>
                </View>
                {progressModal === "insight" ? (
                  <View style={styles.detailStack}>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>This month scans</Text><Text style={styles.detailValue}>{thisMonthScanned}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Last month scans</Text><Text style={styles.detailValue}>{previousMonthScanned}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Month over month</Text><Text style={styles.detailValue}>{insightPrefix}{monthOverMonth}%</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Consistency</Text><Text style={styles.detailValue}>{consistencyRate}%</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Avg scans / active day</Text><Text style={styles.detailValue}>{averageScansPerActiveDay}</Text></View>
                  </View>
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
                    {progressModal?.startsWith("milestone:")
                      ? `${progressModal.replace("milestone:", "")} milestone tracks your long-term consistency.`
                      : "Track your milestones to unlock higher consistency levels."}
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
    backgroundColor: "#0F1722",
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
  milestoneRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  milestonePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  milestonePillDone: {
    backgroundColor: "rgba(0,221,183,0.18)",
    borderColor: "rgba(0,221,183,0.55)",
  },
  milestoneText: {
    color: "#C4C7CF",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  milestoneTextDone: {
    color: "#B6FFF1",
  },
  insightCard: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#101824",
    borderWidth: 1,
    borderColor: "rgba(87,167,253,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  insightTitle: {
    color: "#57A7FD",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  insightText: {
    marginTop: 4,
    color: "#E5E7EB",
    fontSize: 12,
    lineHeight: 18,
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
    backgroundColor: "#0B1220",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(248,210,106,0.35)",
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
    backgroundColor: "rgba(248,210,106,0.15)",
    borderWidth: 1,
    borderColor: "rgba(248,210,106,0.4)",
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
    backgroundColor: "rgba(248,210,106,0.16)",
    borderWidth: 1,
    borderColor: "rgba(248,210,106,0.45)",
  },
  upgradePillText: {
    color: "#F8D26A",
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
  optionChevron: {
    marginLeft: "auto",
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
  detailStack: {
    marginTop: 8,
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
