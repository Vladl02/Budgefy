import React, { useState, useMemo, useEffect } from "react";
import { 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Keyboard,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SlidingSheet } from "@/src/components/SlidingSheet";
import { Plus, CreditCard, ChevronLeft, Bell, Trash2, Search, Check, ChevronRight, BellRing } from 'lucide-react-native';
import Svg, { Path } from "react-native-svg";
import {
  siApple,
  siDiscord,
  siDropbox,
  siGithub,
  siGoogle,
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
} from "simple-icons";
import type { SimpleIcon } from "simple-icons";

// ---------------------------------------------------------------------------
// 🚨 CRASH FIX: MOCKING NOTIFICATIONS 🚨
// The real library is commented out because your native build is missing the code.
// To enable real notifications later, uncomment the import and delete the Mock object.
// ---------------------------------------------------------------------------

// import * as Notifications from 'expo-notifications'; // <--- UNCOMMENT THIS LATER

// --- MOCK OBJECT (Keeps app from crashing) ---
const Notifications = {
  setNotificationHandler: (_: any) => { console.log("Mock: Handler set"); },
  getPermissionsAsync: async () => ({ status: 'granted' }), 
  requestPermissionsAsync: async () => ({ status: 'granted' }),
  scheduleNotificationAsync: async (content: any) => {
    console.log("Mock: Notification scheduled!", content);
    return "mock-id-123";
  },
  cancelScheduledNotificationAsync: async (id: string) => {
    console.log("Mock: Notification cancelled", id);
  },
  SchedulableTriggerInputTypes: {
    CALENDAR: 'calendar'
  }
};
// ---------------------------------------------------------------------------

// Configure Handler (Safe now because it uses the mock)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// --- DATA DEFINITIONS ---

interface Payment {
  id: string;
  name: string;
  amount: number;
  day: string;
  color: string; 
  currency: string;
  notificationId?: string;
  reminderOffset?: number;
}

interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

const FALLBACK_RATES: Record<string, number> = {
  'RON': 1.00, 'EUR': 0.20, 'USD': 0.22, 'GBP': 0.17, 
  'CHF': 0.19, 'CAD': 0.30, 'AUD': 0.33, 'JPY': 32.5, 'CNY': 1.58,
};

const CURRENCY_DATA: CurrencyOption[] = [
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

const REMINDER_OPTIONS = [
  { label: 'None', value: -1 },
  { label: 'On day', value: 0 },
  { label: '1 day before', value: 1 },
  { label: '3 days before', value: 3 },
  { label: '1 week before', value: 7 },
];

const INITIAL_PAYMENTS: Payment[] = [
  { id: '1', name: 'Netflix', amount: 15.99, day: '12', color: "#E50914", currency: 'USD' },
];

const ICON_PALETTE = [
  "#57A7FD", "#FE5A59", "#FFC83C", "#00DDB7", "#7E57FF", "#FF8544", "#F472B6",
];
const CALENDAR_WEEK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type BrandIconMatch = {
  icon: SimpleIcon;
  keywords: string[];
};

const BRAND_ICON_MATCHERS: BrandIconMatch[] = [
  { icon: siApple, keywords: ["apple", "apple tv", "apple music", "apple one"] },
  { icon: siIcloud, keywords: ["icloud"] },
  { icon: siNetflix, keywords: ["netflix"] },
  { icon: siSpotify, keywords: ["spotify"] },
  { icon: siYoutube, keywords: ["youtube", "youtube premium", "yt"] },
  { icon: siHbomax, keywords: ["hbo max", "max"] },
  { icon: siHbo, keywords: ["hbo"] },
  { icon: siGoogleplay, keywords: ["google play", "play store"] },
  { icon: siGoogle, keywords: ["google", "google one"] },
  { icon: siUber, keywords: ["uber", "uber one"] },
  { icon: siPaypal, keywords: ["paypal"] },
  { icon: siPatreon, keywords: ["patreon"] },
  { icon: siDiscord, keywords: ["discord"] },
  { icon: siGithub, keywords: ["github"] },
  { icon: siDropbox, keywords: ["dropbox"] },
  { icon: siNotion, keywords: ["notion"] },
  { icon: siX, keywords: ["twitter", "x premium", "x.com"] },
];

const normalizeBrandText = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const resolveBrandIcon = (value: string): SimpleIcon | null => {
  const normalized = normalizeBrandText(value);
  if (!normalized) return null;

  for (const candidate of BRAND_ICON_MATCHERS) {
    if (candidate.keywords.some((keyword) => normalized.includes(keyword))) {
      return candidate.icon;
    }
  }

  return null;
};

function SimpleBrandIcon({ icon, size = 18 }: { icon: SimpleIcon; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={icon.path} fill={`#${icon.hex}`} />
    </Svg>
  );
}

export default function RecurringExpense() {
  const router = useRouter();
  
  // UI States
  const [isAdding, setIsAdding] = useState(false);
  const [isSelectingCurrency, setIsSelectingCurrency] = useState(false); 
  const [searchText, setSearchText] = useState("");
  const [isLoadingRates, setIsLoadingRates] = useState(true);
  const showHeader = isAdding || isSelectingCurrency;

  // Data States
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("");
  const [currency, setCurrency] = useState<CurrencyOption>(CURRENCY_DATA[0]);
  
  const [reminderOffset, setReminderOffset] = useState(0); 
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const draftBrandIcon = useMemo(() => resolveBrandIcon(name), [name]);

  // --- EFFECTS ---

  useEffect(() => {
    async function getPermissions() {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch {
        console.warn("Permission check skipped (Mock mode)");
      }
    }
    getPermissions();

    // Fetch Rates
    const fetchRates = async () => {
      try {
        setIsLoadingRates(true);
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/RON');
        const data = await response.json();
        if (data && data.rates) setExchangeRates(data.rates);
      } catch {
        console.log("Using fallback rates");
      } finally {
        setIsLoadingRates(false);
      }
    };
    fetchRates();
  }, []);

  // --- LOGIC ---

  const handleDismiss = () => router.back();

  const scheduleReminder = async (title: string, amountStr: string, billDay: string, offset: number) => {
    if (offset === -1) return undefined;

    try {
      let triggerDay = parseInt(billDay) - offset;
      if (triggerDay < 1) triggerDay = 28; 

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Upcoming Bill: ${title}`,
          body: `Your payment of ${amountStr} is due ${offset === 0 ? 'today' : `in ${offset} days`}.`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          day: triggerDay,
          hour: 9, 
          minute: 0,
          repeats: true,
        },
      });
      return id;

    } catch (e) {
      console.log("Scheduling skipped:", e);
      return undefined;
    }
  };

  const handleSave = async () => {
    if (!name || !amount || !day) return;

    const symbol = currency.symbol;
    const amountStr = `${amount}${symbol}`;
    const detectedBrandIcon = resolveBrandIcon(name);
    
    const notificationId = await scheduleReminder(name, amountStr, day, reminderOffset);

    const newPayment: Payment = {
      id: Math.random().toString(),
      name,
      amount: parseFloat(amount),
      day: day.padStart(2, '0'),
      color: detectedBrandIcon ? `#${detectedBrandIcon.hex}` : ICON_PALETTE[payments.length % ICON_PALETTE.length],
      currency: currency.code,
      notificationId,
      reminderOffset,
    };
    
    setPayments([...payments, newPayment]);
    resetForm();
  };

  const deletePayment = async (id: string) => {
    const payment = payments.find(p => p.id === id);
    if (payment?.notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(payment.notificationId);
      } catch (e) {
        console.warn("Cancel failed:", e);
      }
    }
    setPayments(payments.filter(p => p.id !== id));
  };

  const resetForm = () => {
    setIsAdding(false);
    setIsSelectingCurrency(false);
    setName("");
    setAmount("");
    setDay("");
    setCurrency(CURRENCY_DATA[0]);
    setReminderOffset(0);
    Keyboard.dismiss();
  };

  const getSymbol = (code: string) => CURRENCY_DATA.find(c => c.code === code)?.symbol || code;

  const filteredCurrencies = useMemo(() => {
    if (!searchText) return CURRENCY_DATA;
    return CURRENCY_DATA.filter(c => 
      c.name.toLowerCase().includes(searchText.toLowerCase()) || 
      c.code.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText]);

  const totalMonthlyRON = useMemo(() => {
    return payments.reduce((acc, curr) => {
      const rate = exchangeRates[curr.currency] || 1; 
      const safeRate = rate === 0 ? 1 : rate;
      return acc + (curr.amount / safeRate);
    }, 0);
  }, [payments, exchangeRates]);
  const annualSpendRON = useMemo(() => totalMonthlyRON * 12, [totalMonthlyRON]);
  const calendarMonthLabel = useMemo(
    () => new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    [],
  );
  const todayDayOfMonth = useMemo(() => new Date().getDate(), []);
  const calendarMonthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);
  const daysInCurrentMonth = useMemo(
    () => new Date(calendarMonthStart.getFullYear(), calendarMonthStart.getMonth() + 1, 0).getDate(),
    [calendarMonthStart],
  );
  const firstWeekdayIndex = useMemo(() => calendarMonthStart.getDay(), [calendarMonthStart]);

  const subscriptionsByDay = useMemo(() => {
    const grouped = new Map<number, Payment[]>();

    payments.forEach((payment) => {
      const rawDay = Number.parseInt(payment.day, 10);
      if (!Number.isFinite(rawDay)) return;
      const safeDay = Math.max(1, Math.min(daysInCurrentMonth, rawDay));

      if (!grouped.has(safeDay)) {
        grouped.set(safeDay, []);
      }
      grouped.get(safeDay)?.push(payment);
    });

    return grouped;
  }, [daysInCurrentMonth, payments]);

  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];

    for (let i = 0; i < firstWeekdayIndex; i += 1) {
      cells.push(null);
    }

    for (let dayOfMonth = 1; dayOfMonth <= daysInCurrentMonth; dayOfMonth += 1) {
      cells.push(dayOfMonth);
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [daysInCurrentMonth, firstWeekdayIndex]);

  // --- RENDER HELPERS ---

  const renderCurrencyPicker = () => (
    <View style={styles.pickerContainer}>
      <View style={styles.searchBar}>
        <Search size={20} color="#999" />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search currency"
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
          autoFocus
        />
      </View>
      <FlatList 
        data={filteredCurrencies}
        keyExtractor={item => item.code}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable 
            style={styles.currencyRow} 
            onPress={() => {
              setCurrency(item);
              setIsSelectingCurrency(false);
              setSearchText("");
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.currencyBadge}><Text style={styles.currencyBadgeText}>{item.symbol}</Text></View>
              <View>
                <Text style={styles.currencyCode}>{item.code}</Text>
                <Text style={styles.currencyName}>{item.name}</Text>
              </View>
            </View>
            {currency.code === item.code && <Check size={20} color="#1F1F1F" />}
          </Pressable>
        )}
      />
    </View>
  );

  return (
    <View style={styles.screenWrapper}>
      <SlidingSheet onDismiss={handleDismiss} heightPercent={0.85} backdropOpacity={0.4}>
        {(closeSheet) => (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <View style={styles.container}>
              
              {/* Header */}
              {showHeader ? (
                <View style={styles.header}>
                  <View style={styles.headerSide}>
                    <Pressable onPress={() => isSelectingCurrency ? setIsSelectingCurrency(false) : setIsAdding(false)} hitSlop={10}>
                      <ChevronLeft size={24} color="#1F1F1F" />
                    </Pressable>
                  </View>
                  <Text style={styles.mainTitle}>
                    {isSelectingCurrency ? "Select Currency" : "Add Payment"}
                  </Text>
                  <View style={styles.headerSide} />
                </View>
              ) : null}

              {/* View Switcher */}
              {isSelectingCurrency ? renderCurrencyPicker() : !isAdding ? (
                
                // --- LIST VIEW ---
                <View style={{ flex: 1 }}>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.calendarSection}>
                      <View style={styles.calendarHead}>
                        <Text style={styles.calendarTitle}>Subscription Calendar</Text>
                        <Text style={styles.calendarMonth}>{calendarMonthLabel}</Text>
                      </View>

                      <View style={styles.calendarLegendRow}>
                        <View style={styles.calendarLegendItem}>
                          <View style={[styles.calendarLegendDot, styles.calendarLegendDotToday]} />
                          <Text style={styles.calendarLegendText}>Today</Text>
                        </View>
                        <View style={styles.calendarLegendItem}>
                          <View style={[styles.calendarLegendDot, styles.calendarLegendDotDue]} />
                          <Text style={styles.calendarLegendText}>Due date</Text>
                        </View>
                      </View>

                      <View style={styles.calendarWeekRow}>
                        {CALENDAR_WEEK_LABELS.map((label) => (
                          <Text key={label} style={styles.calendarWeekLabel}>{label}</Text>
                        ))}
                      </View>

                      <View style={styles.calendarGrid}>
                        {calendarCells.map((dayOfMonth, index) => {
                          if (dayOfMonth === null) {
                            return <View key={`empty-${index}`} style={[styles.calendarDayCell, styles.calendarDayCellEmpty]} />;
                          }

                          const daySubscriptions = subscriptionsByDay.get(dayOfMonth) ?? [];
                          const visibleSubscriptions = daySubscriptions.slice(0, 3);
                          const hiddenCount = Math.max(daySubscriptions.length - visibleSubscriptions.length, 0);
                          const isToday = dayOfMonth === todayDayOfMonth;
                          const hasSubscriptions = daySubscriptions.length > 0;
                          const dayOfWeekIndex = index % 7;
                          const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;

                          return (
                            <View
                              key={`day-${dayOfMonth}`}
                              style={[
                                styles.calendarDayCell,
                                isWeekend ? styles.calendarDayCellWeekend : null,
                                hasSubscriptions ? styles.calendarDayCellActive : null,
                                isToday ? styles.calendarDayCellToday : null,
                              ]}
                            >
                              <View style={styles.calendarDayTopRow}>
                                <Text
                                  style={[
                                    styles.calendarDayNumber,
                                    isToday ? styles.calendarDayNumberToday : null,
                                    hasSubscriptions ? styles.calendarDayNumberOnDark : null,
                                  ]}
                                >
                                  {dayOfMonth}
                                </Text>
                              </View>

                              <View style={styles.calendarLogoRow}>
                                {visibleSubscriptions.map((subscription) => {
                                  const brandIcon = resolveBrandIcon(subscription.name);

                                  return (
                                    <View
                                      key={`${subscription.id}-${dayOfMonth}`}
                                      style={[
                                        styles.calendarLogoChip,
                                        hasSubscriptions ? styles.calendarLogoChipOnDark : null,
                                        !hasSubscriptions ? { backgroundColor: `${subscription.color}1F` } : null,
                                      ]}
                                    >
                                      {brandIcon ? (
                                        <SimpleBrandIcon icon={brandIcon} size={11} />
                                      ) : (
                                        <CreditCard size={11} color={hasSubscriptions ? "#FFFFFF" : subscription.color} />
                                      )}
                                    </View>
                                  );
                                })}
                                {hiddenCount > 0 ? (
                                  <Text
                                    style={[
                                      styles.calendarOverflowText,
                                      hasSubscriptions ? styles.calendarOverflowTextOnDark : null,
                                    ]}
                                  >
                                    +{hiddenCount}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    <Text style={styles.subtitle}>Manage your automated monthly bills</Text>

                    <View style={styles.summaryCard}>
                      <View>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                           <Text style={styles.summaryLabel}>Total Monthly (Est.)</Text>
                           {isLoadingRates && <ActivityIndicator size="small" color="#999" />}
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 4}}>
                          <Text style={styles.summaryAmount}>{totalMonthlyRON.toFixed(2)}</Text>
                          <Text style={styles.summaryCurrency}>RON</Text>
                        </View>
                        <Text style={styles.summaryAnnual}>≈ {annualSpendRON.toFixed(0)} RON per year</Text>
                      </View>
                      <Bell size={22} color="#1F1F1F" strokeWidth={2} />
                    </View>

                    <Text style={styles.sectionHeader}>Active Subscriptions</Text>
                    
                    {payments.map((item) => {
                      const paymentBrandIcon = resolveBrandIcon(item.name);

                      return (
                        <View key={item.id} style={styles.paymentItem}>
                          <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                            {paymentBrandIcon ? (
                              <SimpleBrandIcon icon={paymentBrandIcon} size={18} />
                            ) : (
                              <CreditCard size={18} color={item.color} />
                            )}
                          </View>
                          <View style={styles.paymentInfo}>
                            <Text style={styles.paymentName}>{item.name}</Text>
                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                              <Text style={styles.paymentDate}>Day {item.day}</Text>
                              {/* Show icon only if notification was successfully set */}
                              {item.notificationId && <BellRing size={12} color="#999" />}
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.paymentAmount}>-{getSymbol(item.currency)}{item.amount.toFixed(2)}</Text>
                            {item.currency !== 'RON' && (
                              <Text style={styles.convertedText}>≈ {((item.amount / (exchangeRates[item.currency] || 1))).toFixed(0)} lei</Text>
                            )}
                            <Pressable onPress={() => deletePayment(item.id)} style={{marginTop: 6}}>
                              <Trash2 size={16} color="#FFBABA" />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}

                    <Pressable style={styles.addButton} onPress={() => setIsAdding(true)}>
                      <Plus size={20} color="white" />
                      <Text style={styles.addButtonText}>Add New Payment</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              ) : (

                // --- ADD FORM ---
                <View style={styles.formContainer}>
                  <Text style={styles.formSubtitle}>Enter details for your new recurring expense</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Service / Bill Name</Text>
                    <TextInput 
                      style={styles.input}
                      placeholder="e.g. Rent, Gym"
                      placeholderTextColor="#AAA"
                      value={name}
                      onChangeText={setName}
                      autoFocus
                    />
                    {draftBrandIcon ? (
                      <View style={styles.brandPreviewPill}>
                        <SimpleBrandIcon icon={draftBrandIcon} size={14} />
                        <Text style={styles.brandPreviewText}>Detected brand logo</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Amount</Text>
                      <TextInput 
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor="#AAA"
                        keyboardType="decimal-pad"
                        value={amount}
                        onChangeText={setAmount}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                      <Text style={styles.label}>Billing Day</Text>
                      <TextInput 
                        style={styles.input}
                        placeholder="1-31"
                        placeholderTextColor="#AAA"
                        keyboardType="number-pad"
                        maxLength={2}
                        value={day}
                        onChangeText={setDay}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Currency</Text>
                    <Pressable style={styles.currencyTrigger} onPress={() => setIsSelectingCurrency(true)}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                        <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>{currency.symbol}</Text></View>
                        <Text style={styles.currencyTriggerText}>{currency.code} - {currency.name}</Text>
                      </View>
                      <ChevronRight size={20} color="#999" />
                    </Pressable>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Notification Reminder</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                      {REMINDER_OPTIONS.map((opt) => {
                        const isSelected = reminderOffset === opt.value;
                        return (
                          <Pressable 
                            key={opt.label}
                            style={[styles.reminderOption, isSelected && styles.reminderOptionActive]}
                            onPress={() => setReminderOffset(opt.value)}
                          >
                            <Text style={[styles.reminderText, isSelected && styles.reminderTextActive]}>
                              {opt.label}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </ScrollView>
                  </View>

                  <View style={{ flex: 1 }} /> 

                  <Pressable 
                    style={[styles.saveButton, (!name || !amount || !day) && styles.saveButtonDisabled]} 
                    onPress={handleSave}
                  >
                    <Text style={styles.saveButtonText}>Confirm Recurring Expense</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        )}
      </SlidingSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: "transparent" },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, minHeight: 40 },
  headerSide: { width: 40 },
  mainTitle: { fontSize: 20, fontWeight: "800", color: "#1F1F1F" },
  subtitle: { fontSize: 13, color: "#666", marginTop: 2, marginBottom: 12, textAlign: "center" },
  scrollContent: { paddingBottom: 20 },
  summaryCard: { backgroundColor: '#F7F7F7', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, borderWidth: 1, borderColor: '#EEEEEE' },
  summaryLabel: { fontSize: 12, color: '#666', fontWeight: '700', textTransform: 'uppercase' },
  summaryAmount: { fontSize: 26, fontWeight: '800', color: '#1F1F1F', marginTop: 4 },
  summaryCurrency: { fontSize: 16, fontWeight: '600', color: '#999', marginBottom: 2 },
  summaryAnnual: { marginTop: 4, fontSize: 12, fontWeight: '600', color: '#4B5563' },
  calendarSection: { marginTop: -2, marginBottom: 12 },
  calendarHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  calendarMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calendarLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  calendarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  calendarLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calendarLegendDotToday: {
    backgroundColor: '#111827',
  },
  calendarLegendDotDue: {
    backgroundColor: '#D1D5DB',
  },
  calendarLegendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarWeekLabel: {
    width: '13.5%',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: '#9AA2AF',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 7,
  },
  calendarDayCell: {
    width: '13.5%',
    minHeight: 66,
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  calendarDayCellEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
  },
  calendarDayCellWeekend: {
    backgroundColor: '#FCFCFD',
  },
  calendarDayCellActive: {
    backgroundColor: '#1E1E22',
    borderColor: '#2B2B31',
  },
  calendarDayCellToday: {
    borderColor: '#111827',
    backgroundColor: '#F3F4F6',
  },
  calendarDayTopRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  calendarDayNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4B5563',
    textAlign: 'center',
  },
  calendarDayNumberToday: {
    color: '#111827',
  },
  calendarDayNumberOnDark: {
    color: '#FFFFFF',
  },
  calendarLogoRow: {
    flex: 1,
    width: '100%',
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignContent: 'center',
    gap: 3,
    flexWrap: 'wrap',
  },
  calendarLogoChip: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarLogoChipOnDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  calendarOverflowText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4B5563',
  },
  calendarOverflowTextOnDark: {
    color: '#E5E7EB',
  },
  sectionHeader: { fontSize: 15, fontWeight: '700', color: '#1F1F1F', marginBottom: 12 },
  paymentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  iconContainer: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  paymentInfo: { flex: 1 },
  paymentName: { fontSize: 16, fontWeight: '600', color: '#1F1F1F' },
  paymentDate: { fontSize: 13, color: '#999', marginTop: 2 },
  paymentAmount: { fontSize: 16, fontWeight: '700', color: '#FE5A59' },
  convertedText: { fontSize: 11, color: '#BBB', textAlign: 'right', marginTop: 2 },
  addButton: { flexDirection: 'row', backgroundColor: '#1C1C1E', borderRadius: 16, paddingVertical: 16, justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 8 },
  addButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  formContainer: { flex: 1, marginTop: 10 },
  formSubtitle: { fontSize: 14, color: '#666', marginBottom: 24, textAlign: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#1F1F1F', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 14, padding: 16, fontSize: 16, color: '#1F1F1F', borderWidth: 1, borderColor: '#EEE' },
  brandPreviewPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  brandPreviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  rowInputs: { flexDirection: 'row' },
  saveButton: { backgroundColor: '#1F1F1F', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.3 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  currencyTrigger: { backgroundColor: '#F5F5F5', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#EEE', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currencyTriggerText: { fontSize: 16, color: '#1F1F1F', fontWeight: '500' },
  miniBadge: { backgroundColor: '#E0E0E0', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  miniBadgeText: { fontSize: 12, fontWeight: '700', color: '#333' },
  pickerContainer: { flex: 1, marginTop: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 20, gap: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#1F1F1F' },
  currencyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  currencyBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  currencyBadgeText: { fontSize: 16, fontWeight: '600', color: '#333' },
  currencyCode: { fontSize: 16, fontWeight: '700', color: '#1F1F1F' },
  currencyName: { fontSize: 13, color: '#666' },
  reminderOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F5F5F5', marginRight: 4, borderWidth: 1, borderColor: 'transparent' },
  reminderOptionActive: { backgroundColor: '#1F1F1F', borderColor: '#1F1F1F' },
  reminderText: { fontSize: 13, fontWeight: '600', color: '#666' },
  reminderTextActive: { color: 'white' },
});
