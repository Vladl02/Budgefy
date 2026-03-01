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
import { Plus, CreditCard, ChevronLeft, Bell, Trash2, Search, Check, ChevronRight, BellRing, CalendarClock, Sparkles } from 'lucide-react-native';

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
const TIMELINE_MIN_GAP_PERCENT = 8;
const TIMELINE_MAX_LANES = 3;

const OPTIONAL_SUBSCRIPTION_KEYWORDS = [
  "netflix",
  "spotify",
  "hbo",
  "disney",
  "prime",
  "youtube",
  "apple",
  "icloud",
  "adobe",
  "gym",
];

export default function RecurringExpense() {
  const router = useRouter();
  
  // UI States
  const [isAdding, setIsAdding] = useState(false);
  const [isSelectingCurrency, setIsSelectingCurrency] = useState(false); 
  const [searchText, setSearchText] = useState("");
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  // Data States
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("");
  const [currency, setCurrency] = useState<CurrencyOption>(CURRENCY_DATA[0]);
  
  const [reminderOffset, setReminderOffset] = useState(0); 
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [reviewingSuggestionIds, setReviewingSuggestionIds] = useState<string[]>([]);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>([]);

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
    
    const notificationId = await scheduleReminder(name, amountStr, day, reminderOffset);

    const newPayment: Payment = {
      id: Math.random().toString(),
      name,
      amount: parseFloat(amount),
      day: day.padStart(2, '0'),
      color: ICON_PALETTE[payments.length % ICON_PALETTE.length],
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
  const timelineMonthLabel = useMemo(
    () => new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    [],
  );

  const chargeProjections = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentMonthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const nextMonthDays = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();

    return payments.map((payment) => {
      const rate = exchangeRates[payment.currency] || 1;
      const safeRate = rate === 0 ? 1 : rate;
      const ronAmount = payment.amount / safeRate;
      const rawDay = Number.parseInt(payment.day, 10);
      const billingDay = Number.isFinite(rawDay) && rawDay > 0 ? rawDay : 1;
      const dueThisMonth = Math.min(billingDay, currentMonthDays);

      let nextDate = new Date(now.getFullYear(), now.getMonth(), dueThisMonth);
      let isCurrentMonth = true;

      if (dueThisMonth < now.getDate()) {
        const dueNextMonth = Math.min(billingDay, nextMonthDays);
        nextDate = new Date(now.getFullYear(), now.getMonth() + 1, dueNextMonth);
        isCurrentMonth = false;
      }

      const daysUntil = Math.max(0, Math.round((nextDate.getTime() - todayStart.getTime()) / 86400000));
      const rawMarkerPercent = isCurrentMonth
        ? (currentMonthDays <= 1 ? 0 : ((dueThisMonth - 1) / (currentMonthDays - 1)) * 100)
        : 100;
      const markerPercent = Math.max(2, Math.min(98, rawMarkerPercent));

      return {
        ...payment,
        ronAmount,
        nextDate,
        daysUntil,
        markerPercent,
        dueThisMonth,
        isCurrentMonth,
      };
    });
  }, [payments, exchangeRates]);

  const nextCharge = useMemo(() => {
    if (chargeProjections.length === 0) return null;
    return [...chargeProjections].sort((a, b) => a.daysUntil - b.daysUntil || b.ronAmount - a.ronAmount)[0];
  }, [chargeProjections]);

  const timelineCharges = useMemo(() => {
    const currentMonthUpcoming = chargeProjections
      .filter((item) => item.isCurrentMonth)
      .sort((a, b) => a.dueThisMonth - b.dueThisMonth);
    if (currentMonthUpcoming.length > 0) return currentMonthUpcoming;
    return nextCharge ? [nextCharge] : [];
  }, [chargeProjections, nextCharge]);
  const timelineMarkers = useMemo(() => {
    const laneLastPercent = Array.from({ length: TIMELINE_MAX_LANES }, () => -999);

    return timelineCharges.map((charge) => {
      let lane = laneLastPercent.findIndex(
        (lastPercent) => charge.markerPercent - lastPercent >= TIMELINE_MIN_GAP_PERCENT,
      );

      if (lane === -1) {
        lane = laneLastPercent.reduce((bestLane, lastPercent, index) => {
          if (lastPercent < laneLastPercent[bestLane]) return index;
          return bestLane;
        }, 0);
      }

      laneLastPercent[lane] = charge.markerPercent;

      return {
        ...charge,
        lane,
      };
    });
  }, [timelineCharges]);
  const timelineLegendItems = useMemo(() => timelineMarkers.slice(0, 3), [timelineMarkers]);
  const timelineLegendExtra = Math.max(timelineMarkers.length - timelineLegendItems.length, 0);

  const smartSuggestion = useMemo(() => {
    if (chargeProjections.length === 0) return null;
    const optional = chargeProjections.filter((item) =>
      OPTIONAL_SUBSCRIPTION_KEYWORDS.some((keyword) => item.name.toLowerCase().includes(keyword)),
    );
    const candidatePool = optional.length > 0 ? optional : chargeProjections;
    const candidate = [...candidatePool].sort((a, b) => b.ronAmount - a.ronAmount)[0];
    if (!candidate) return null;

    return {
      id: candidate.id,
      name: candidate.name,
      potentialSavingsRON: Math.round(candidate.ronAmount),
      sharePercent: totalMonthlyRON > 0 ? Math.round((candidate.ronAmount / totalMonthlyRON) * 100) : 0,
    };
  }, [chargeProjections, totalMonthlyRON]);

  const activeSuggestion = useMemo(() => {
    if (!smartSuggestion) return null;
    if (dismissedSuggestionIds.includes(smartSuggestion.id)) return null;
    return smartSuggestion;
  }, [smartSuggestion, dismissedSuggestionIds]);

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
              <View style={styles.header}>
                <View style={styles.headerSide}>
                  {(isAdding || isSelectingCurrency) && (
                    <Pressable onPress={() => isSelectingCurrency ? setIsSelectingCurrency(false) : setIsAdding(false)} hitSlop={10}>
                      <ChevronLeft size={24} color="#1F1F1F" />
                    </Pressable>
                  )}
                </View>
                <Text style={styles.mainTitle}>
                  {isSelectingCurrency ? "Select Currency" : isAdding ? "Add Payment" : "Recurring"}
                </Text>
                <View style={styles.headerSide} />
              </View>

              {/* View Switcher */}
              {isSelectingCurrency ? renderCurrencyPicker() : !isAdding ? (
                
                // --- LIST VIEW ---
                <View style={{ flex: 1 }}>
                  <Text style={styles.subtitle}>Manage your automated monthly bills</Text>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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

                    {nextCharge ? (
                      <View style={styles.insightCard}>
                        <View style={styles.insightRow}>
                          <View style={styles.insightBadge}>
                            <CalendarClock size={14} color="#111827" />
                          </View>
                          <Text style={styles.insightText}>
                            Next payment in {nextCharge.daysUntil} day{nextCharge.daysUntil === 1 ? "" : "s"} — {nextCharge.name} ({nextCharge.ronAmount.toFixed(0)} RON)
                          </Text>
                        </View>
                        <View style={styles.timelineHead}>
                          <Text style={styles.timelineTitle}>Upcoming charges</Text>
                          <Text style={styles.timelineMonth}>{timelineMonthLabel}</Text>
                        </View>
                        <View style={styles.timelineTrackWrap}>
                          <View style={styles.timelineTrack} />
                          <View style={styles.timelineMarkerLayer}>
                            {timelineMarkers.map((charge) => (
                              <View
                                key={`timeline-${charge.id}`}
                                style={[
                                  styles.timelineMarkerWrap,
                                  {
                                    left: `${charge.markerPercent}%`,
                                    top: 3 + charge.lane * 7,
                                  },
                                ]}
                              >
                                <View style={[styles.timelineMarker, { backgroundColor: charge.color }]} />
                              </View>
                            ))}
                          </View>
                        </View>
                        <View style={styles.timelineLegend}>
                          {timelineLegendItems.map((charge) => (
                            <View key={`legend-${charge.id}`} style={styles.timelineLegendItem}>
                              <View style={[styles.timelineLegendDot, { backgroundColor: charge.color }]} />
                              <Text style={styles.timelineLegendText}>
                                D{charge.nextDate.getDate()} {charge.name}
                              </Text>
                            </View>
                          ))}
                          {timelineLegendExtra > 0 ? (
                            <Text style={styles.timelineMoreText}>+{timelineLegendExtra} more</Text>
                          ) : null}
                        </View>
                      </View>
                    ) : null}

                    {activeSuggestion ? (
                      <View style={styles.suggestionCard}>
                        <View style={styles.suggestionTop}>
                          <View style={styles.suggestionBadge}>
                            <Sparkles size={14} color="#FFFFFF" />
                          </View>
                          <Text style={styles.suggestionEyebrow}>Smart Suggestion</Text>
                        </View>
                        <Text style={styles.suggestionText}>
                          You haven&apos;t used {activeSuggestion.name} this month. Cancel to save {activeSuggestion.potentialSavingsRON} RON?
                        </Text>
                        <Text style={styles.suggestionMeta}>
                          Potential savings: {activeSuggestion.potentialSavingsRON} RON / month ({activeSuggestion.sharePercent}% of recurring spend)
                        </Text>
                        {reviewingSuggestionIds.includes(activeSuggestion.id) ? (
                          <View style={styles.reviewingPill}>
                            <Text style={styles.reviewingPillText}>Marked as reviewing</Text>
                          </View>
                        ) : (
                          <View style={styles.suggestionActions}>
                            <Pressable
                              style={styles.reviewBtn}
                              onPress={() =>
                                setReviewingSuggestionIds((prev) =>
                                  prev.includes(activeSuggestion.id) ? prev : [...prev, activeSuggestion.id],
                                )
                              }
                            >
                              <Text style={styles.reviewBtnText}>Mark as reviewing</Text>
                            </Pressable>
                            <Pressable
                              style={styles.dismissBtn}
                              onPress={() =>
                                setDismissedSuggestionIds((prev) =>
                                  prev.includes(activeSuggestion.id) ? prev : [...prev, activeSuggestion.id],
                                )
                              }
                            >
                              <Text style={styles.dismissBtnText}>Dismiss</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    ) : null}

                    <Text style={styles.sectionHeader}>Active Subscriptions</Text>
                    
                    {payments.map((item) => (
                      <View key={item.id} style={styles.paymentItem}>
                        <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                          <CreditCard size={18} color={item.color} />
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
                    ))}

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
  subtitle: { fontSize: 13, color: "#666", marginBottom: 20, textAlign: "center" },
  scrollContent: { paddingBottom: 20 },
  summaryCard: { backgroundColor: '#F7F7F7', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, borderWidth: 1, borderColor: '#EEEEEE' },
  summaryLabel: { fontSize: 12, color: '#666', fontWeight: '700', textTransform: 'uppercase' },
  summaryAmount: { fontSize: 26, fontWeight: '800', color: '#1F1F1F', marginTop: 4 },
  summaryCurrency: { fontSize: 16, fontWeight: '600', color: '#999', marginBottom: 2 },
  summaryAnnual: { marginTop: 4, fontSize: 12, fontWeight: '600', color: '#4B5563' },
  insightCard: { marginTop: -10, marginBottom: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', padding: 12 },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  insightBadge: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  insightText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#111827' },
  timelineHead: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timelineTitle: { fontSize: 11, fontWeight: '700', color: '#4B5563', textTransform: 'uppercase' },
  timelineMonth: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  timelineTrackWrap: { marginTop: 10, height: 28, justifyContent: 'center', position: 'relative' },
  timelineTrack: { height: 8, borderRadius: 999, backgroundColor: '#E5E7EB' },
  timelineMarkerLayer: { ...StyleSheet.absoluteFillObject },
  timelineMarkerWrap: { position: 'absolute', marginLeft: -6 },
  timelineMarker: { width: 12, height: 12, borderRadius: 999, borderWidth: 2, borderColor: '#FFFFFF' },
  timelineLegend: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timelineLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  timelineLegendDot: { width: 6, height: 6, borderRadius: 999 },
  timelineLegendText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  timelineMoreText: { alignSelf: 'center', fontSize: 11, fontWeight: '700', color: '#6B7280' },
  suggestionCard: { marginBottom: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 12 },
  suggestionTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  suggestionBadge: { width: 22, height: 22, borderRadius: 7, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  suggestionEyebrow: { fontSize: 11, fontWeight: '800', color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 },
  suggestionText: { marginTop: 8, fontSize: 14, fontWeight: '700', color: '#111827', lineHeight: 20 },
  suggestionMeta: { marginTop: 6, fontSize: 12, color: '#6B7280', fontWeight: '500' },
  suggestionActions: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewBtn: { backgroundColor: '#111827', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  reviewBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  dismissBtn: { borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', paddingVertical: 9, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  dismissBtnText: { color: '#374151', fontSize: 12, fontWeight: '700' },
  reviewingPill: { marginTop: 10, alignSelf: 'flex-start', borderRadius: 999, backgroundColor: '#ECFDF3', borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 10, paddingVertical: 6 },
  reviewingPillText: { color: '#047857', fontSize: 12, fontWeight: '700' },
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
