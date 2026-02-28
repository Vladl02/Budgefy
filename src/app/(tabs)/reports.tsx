import {
  AlertTriangle,
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  Minus,
  ReceiptText,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Linking,
  Modal,
  PanResponder,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { categoriesForMonth } from "@/src/utils/queries";
import { drizzle, useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useSQLiteContext } from "expo-sqlite";

// --- TYPES ---
interface ReceiptItem {
  id: string;
  title: string;
  date: string;
  amount: string;
  fullDate: string;
  category: string;
  currency: string;
  comment: string;
  fullPage: boolean;
  receiptPhotoUri?: string | null;
  status: "processed" | "needs action" | "failed";
}

// --- INITIAL DATA ---
const INITIAL_DATA: ReceiptItem[] = [
  {
    id: "1",
    title: "Media Galaxy",
    date: "Dec 27 · Cash",
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
    date: "Dec 21 · Card",
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
    date: "Nov 29 · Card",
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
    date: "Nov 11 · Cash",
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
    date: "Nov 8 · Card",
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
    date: "Nov 2 · Cash",
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
    date: "Jan 2 · Cash",
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
    date: "Jan 2 · Cash",
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
    date: "Feb 1 · Cash",
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
    date: "Feb 4 · Cash",
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
    date: "Feb 10 · Card",
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
    date: "Feb 22 · Cash",
    amount: "RON 240.30",
    fullDate: "2026-02-22",
    category: "Wholesale",
    currency: "RON",
    comment: "",
    fullPage: false,
    status: "processed",
  },
];

// --- MAIN SCREEN ---
export default function Reports() {
  const [receipts, setReceipts] = useState<ReceiptItem[]>(INITIAL_DATA);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showTrendInfo, setShowTrendInfo] = useState(false);
  const [selectedMonthStart, setSelectedMonthStart] = useState<Date>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const dbExpo = useSQLiteContext();
  const db = drizzle(dbExpo);
  const categoriesQuery = useMemo(() => categoriesForMonth(db, selectedMonthStart), [db, selectedMonthStart]);
  const { data: categoriesData } = useLiveQuery(categoriesQuery);
  const currentMonthLabel = useMemo(
    () => selectedMonthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    [selectedMonthStart],
  );

  const sortedReceipts = useMemo(() => {
    return [...receipts].sort((a, b) => new Date(b.fullDate).getTime() - new Date(a.fullDate).getTime());
  }, [receipts]);

  const monthFilteredReceipts = useMemo(() => {
    return sortedReceipts.filter((item) => {
      const date = new Date(item.fullDate);
      return (
        date.getFullYear() === selectedMonthStart.getFullYear() &&
        date.getMonth() === selectedMonthStart.getMonth()
      );
    });
  }, [sortedReceipts, selectedMonthStart]);

  const totalSpendValue = useMemo(() => {
    return monthFilteredReceipts.reduce((sum, item) => {
      const numericAmount = parseFloat(item.amount.replace(/[^0-9.]/g, "")) || 0;
      return sum + numericAmount;
    }, 0);
  }, [monthFilteredReceipts]);
  const totalSpend = useMemo(
    () => totalSpendValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [totalSpendValue],
  );

  const previousMonthStart = useMemo(
    () => new Date(selectedMonthStart.getFullYear(), selectedMonthStart.getMonth() - 1, 1),
    [selectedMonthStart],
  );
  const previousMonthTotalSpendValue = useMemo(() => {
    return sortedReceipts.reduce((sum, item) => {
      const itemDate = new Date(item.fullDate);
      if (
        itemDate.getFullYear() === previousMonthStart.getFullYear() &&
        itemDate.getMonth() === previousMonthStart.getMonth()
      ) {
        const numericAmount = parseFloat(item.amount.replace(/[^0-9.]/g, "")) || 0;
        return sum + numericAmount;
      }
      return sum;
    }, 0);
  }, [previousMonthStart, sortedReceipts]);
  const trendDifferenceValue = useMemo(
    () => totalSpendValue - previousMonthTotalSpendValue,
    [totalSpendValue, previousMonthTotalSpendValue],
  );
  const trendDirection = trendDifferenceValue > 0 ? "up" : trendDifferenceValue < 0 ? "down" : "flat";
  const trendColor = trendDirection === "up" ? "#FF3B30" : trendDirection === "down" ? "#16A34A" : "#6B7280";
  const trendBackgroundColor =
    trendDirection === "up" ? "#FFECEC" : trendDirection === "down" ? "#E8F9EE" : "#F3F4F6";
  const TrendIcon = trendDirection === "down" ? TrendingDown : TrendingUp;
  const trendLabel = useMemo(() => {
    const sign = trendDifferenceValue > 0 ? "+" : trendDifferenceValue < 0 ? "-" : "";
    const absValue = Math.abs(trendDifferenceValue).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${sign}RON ${absValue}`;
  }, [trendDifferenceValue]);

  const filteredReceipts = useMemo(() => {
    if (activeFilter === "All") return monthFilteredReceipts;
    if (activeFilter === "Receipts") return monthFilteredReceipts;
    if (activeFilter === "Needs Action") return monthFilteredReceipts.filter((r) => r.status === "needs action");
    return monthFilteredReceipts.filter((r) => r.date.includes(activeFilter));
  }, [activeFilter, monthFilteredReceipts]);

  const handleOpenReceipt = (item: ReceiptItem) => {
    setSelectedReceipt(item);
    setModalVisible(true);
  };

  const handleSaveReceipt = (updatedItem: ReceiptItem) => {
    setReceipts((prev) => {
      const exists = prev.find((r) => r.id === updatedItem.id);
      if (exists) return prev.map((r) => (r.id === updatedItem.id ? updatedItem : r));
      return [updatedItem, ...prev];
    });
    setModalVisible(false);
  };

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
  const availableMonthStarts = useMemo(() => {
    const toKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;
    const monthMap = new Map<string, Date>();

    monthMap.set(toKey(selectedMonthStart), new Date(selectedMonthStart.getFullYear(), selectedMonthStart.getMonth(), 1));
    monthMap.set(toKey(new Date()), new Date(new Date().getFullYear(), new Date().getMonth(), 1));

    receipts.forEach((item) => {
      const itemDate = new Date(item.fullDate);
      if (Number.isNaN(itemDate.getTime())) return;
      const monthStart = new Date(itemDate.getFullYear(), itemDate.getMonth(), 1);
      monthMap.set(toKey(monthStart), monthStart);
    });

    return Array.from(monthMap.values()).sort((a, b) => b.getTime() - a.getTime());
  }, [receipts, selectedMonthStart]);
  const monthOptions = useMemo(
    () => availableMonthStarts.map((date) => date.toLocaleDateString("en-US", { month: "long", year: "numeric" })),
    [availableMonthStarts],
  );

  return (
    <View style={styles.background}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header & Summary */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.pageTitle}>Reports</Text>
            </View>
            <TouchableOpacity style={styles.headerBadge} activeOpacity={0.85} onPress={() => setShowMonthPicker(true)}>
              <View style={styles.headerBadgeDot} />
              <Text style={styles.headerBadgeText}>{currentMonthLabel}</Text>
              <ChevronDown size={14} color="#111827" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.summaryCard}>
            <View>
              <Text style={styles.summaryLabel}>Total Spend</Text>
              <Text style={styles.summaryAmount}>RON {totalSpend}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowTrendInfo(true)}
              style={[styles.trendBadge, { backgroundColor: trendBackgroundColor }]}
            >
              <TrendIcon size={14} color={trendColor} />
              <Text style={[styles.trendText, { color: trendColor }]}>{trendLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* List */}
        <FlatList
          data={filteredReceipts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.controlsSection}>
              <View style={styles.searchBar}>
                <Search size={20} color="#8E8E93" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search reports..."
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                {["All", "Receipts", "Cash", "Card", "Needs Action"].map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                    onPress={() => setActiveFilter(filter)}
                  >
                    <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                      {filter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.7} onPress={() => handleOpenReceipt(item)}>
              <ReportCard
                title={item.title}
                date={item.date}
                amount={item.amount}
                status={item.status}
                receiptPhotoUri={item.receiptPhotoUri}
              />
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>

      {/* Editor Modal */}
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
        onSelect={(label: string) => {
          const month = availableMonthStarts.find(
            (date) => date.toLocaleDateString("en-US", { month: "long", year: "numeric" }) === label,
          );
          if (month) {
            setSelectedMonthStart(new Date(month.getFullYear(), month.getMonth(), 1));
          }
          setShowMonthPicker(false);
        }}
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
              <TouchableOpacity
                onPress={() => setShowTrendInfo(false)}
                style={styles.trendInfoCloseBtn}
                hitSlop={8}
              >
                <X size={16} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.trendInfoFormulaCard}>
              <Text style={styles.trendInfoFormulaLabel}>Formula</Text>
              <Text style={styles.trendInfoFormulaText}>
                Difference = selected month spend - previous month spend
              </Text>
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

// --- COMPONENT: MODERN REPORT CARD ---
const STATUS_CONFIG = {
  processed: { bg: "#E6F9EA", color: "#34C759", label: "Processed" },
  "needs action": { bg: "#FFF4E5", color: "#FF9500", label: "Review" },
  failed: { bg: "#FFEBEE", color: "#FF3B30", label: "Failed" },
};

function ReportCard({ title, date, amount, status, receiptPhotoUri }: any) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.processed;

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.iconContainer}>
        {receiptPhotoUri ? (
          <Image source={{ uri: receiptPhotoUri }} style={cardStyles.receiptImage} />
        ) : (
          <ReceiptText size={22} color="#111111" />
        )}
      </View>
      <View style={cardStyles.textColumn}>
        <Text style={cardStyles.titleText}>{title}</Text>
        <Text style={cardStyles.metaText}>{date}</Text>
      </View>
      <View style={{ flex: 1 }} />
      <View style={cardStyles.rightColumn}>
        <Text style={cardStyles.amount}>{amount}</Text>
        <View style={[cardStyles.statusPill, { backgroundColor: config.bg }]}>
          <View style={[cardStyles.statusDot, { backgroundColor: config.color }]} />
          <Text style={[cardStyles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>
    </View>
  );
}

// --- RECEIPT DETAIL MODAL (NEW DESIGN: Sticky summary + sticky Save) ---
function ReceiptDetailModal({ visible, item, categoryOptions, categoryAccentMap, onClose, onSave }: any) {
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const [name, setName] = useState("");
  const [dateVal, setDateVal] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("Uncategorized");
  const [isFullPage, setIsFullPage] = useState(false);
  const [comment, setComment] = useState("");
  const [receiptPhotoUri, setReceiptPhotoUri] = useState<string | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [previewPhotoUri, setPreviewPhotoUri] = useState<string | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showStatusInfo, setShowStatusInfo] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.title);
      const rawPrice = item.amount.replace(/[^0-9.]/g, "");
      setPrice(rawPrice);
      const detectedCurrency = item.currency || (item.amount.includes("RON") ? "RON" : "USD");
      setCurrency(detectedCurrency);
      setDateVal(item.fullDate || "2025-12-31");
      setCategory(item.category || "General");
      setIsFullPage(item.fullPage || false);
      setComment(item.comment || "");
      setReceiptPhotoUri(item.receiptPhotoUri ?? null);
    }
  }, [item, visible]);
  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(0);
    }
  }, [visible, sheetTranslateY]);

  const statusConfig =
    STATUS_CONFIG[(item?.status as keyof typeof STATUS_CONFIG) ?? "processed"] ?? STATUS_CONFIG.processed;

  const isValid = useMemo(() => {
    const num = parseFloat(price || "0");
    return name.trim().length > 0 && !Number.isNaN(num) && num >= 0 && !!dateVal;
  }, [name, price, dateVal]);
  const dateDisplay = useMemo(() => {
    const parsed = new Date(dateVal);
    if (Number.isNaN(parsed.getTime())) {
      return { primary: dateVal || "Select date", secondary: "Tap to choose" };
    }
    return {
      primary: parsed.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
      secondary: parsed.toLocaleDateString("en-US", { weekday: "short", year: "numeric" }),
    };
  }, [dateVal]);
  const selectedCategoryColor = categoryAccentMap?.[category] ?? "#D1D5DB";

  const handleSave = () => {
    const numericPrice = parseFloat(price || "0");
    const formattedAmount = `${currency} ${numericPrice.toFixed(2)}`;

    const dateObj = new Date(dateVal);
    const shortDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const updatedItem: ReceiptItem = {
      ...item,
      title: name,
      fullDate: dateVal,
      date: `${shortDate} · ${currency}`,
      amount: formattedAmount,
      currency,
      category,
      fullPage: isFullPage,
      comment,
      receiptPhotoUri,
      status: item?.status || "processed",
    };

    onSave(updatedItem);
  };
  const promptOpenSettings = (title: string, message: string) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Open Settings",
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ]);
  };

  const captureReceiptPhoto = async (): Promise<string | null> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      promptOpenSettings("Camera access needed", "Please allow camera access to take a receipt photo.");
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.75,
    });

    if (!result.canceled && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    return null;
  };
  const pickReceiptFromGallery = async (): Promise<string | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      promptOpenSettings("Photo access needed", "Please allow photo library access to attach a receipt.");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    return null;
  };
  const applyRetakeToReceipt = async () => {
    const uri = await captureReceiptPhoto();
    if (uri) {
      setReceiptPhotoUri(uri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  };
  const applyGalleryToReceipt = async () => {
    const uri = await pickReceiptFromGallery();
    if (uri) {
      setReceiptPhotoUri(uri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  };

  const handleReceiptPress = () => {
    void Haptics.selectionAsync().catch(() => undefined);

    if (!receiptPhotoUri) {
      Alert.alert("Add Receipt", "Choose how you want to attach the receipt.", [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: () => void applyRetakeToReceipt() },
        { text: "Choose from Gallery", onPress: () => void applyGalleryToReceipt() },
      ]);
      return;
    }

    setPreviewPhotoUri(receiptPhotoUri);
    setShowReceiptPreview(true);
  };
  const closeWithDrag = () => {
    Animated.timing(sheetTranslateY, {
      toValue: 700,
      duration: 180,
      useNativeDriver: true,
    }).start(() => onClose());
  };
  const springBackAfterDrag = () => {
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };
  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 3 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 0.7,
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          gestureState.dy > 3 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 0.7,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            sheetTranslateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 80 || gestureState.vy > 0.9) {
            closeWithDrag();
            return;
          }
          springBackAfterDrag();
        },
        onPanResponderTerminate: () => {
          springBackAfterDrag();
        },
      }),
    [sheetTranslateY],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal
      onRequestClose={onClose}
    >
      <Animated.View style={[editStyles.container, { transform: [{ translateY: sheetTranslateY }] }]}>
        <View style={editStyles.dragHandleArea} {...dragResponder.panHandlers}>
          <View style={editStyles.dragHandle} />
        </View>
        {/* Header */}
        <View style={editStyles.header} {...dragResponder.panHandlers}>
          <TouchableOpacity onPress={onClose} style={editStyles.headerIconBtn}>
            <ArrowLeft color="#111" size={20} />
          </TouchableOpacity>

          <View style={editStyles.headerTitleWrap}>
            <Text style={editStyles.headerTitle}>Edit Receipt</Text>
            <Text style={editStyles.headerSubtitle}>Review and update details</Text>
          </View>

          {/* Keep header clean; Save is sticky at bottom */}
          <View style={editStyles.headerGhostBtn} />
        </View>

        {/* Sticky Summary Card */}
        <View style={editStyles.stickySummaryWrap}>
          <View style={editStyles.summaryCard}>
            <View style={{ flex: 1 }}>
              <Text style={editStyles.summaryLabel}>Amount</Text>
              <Text style={editStyles.summaryAmount}>
                {currency} {Number(parseFloat(price || "0")).toFixed(2)}
              </Text>

              <View style={editStyles.pillsRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[editStyles.pill, editStyles.pillDark]}
                  onPress={() => setShowCurrencyPicker(true)}
                >
                  <Text style={editStyles.pillTextDark}>{currency}</Text>
                  <ChevronRight size={14} color="#fff" style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowStatusInfo(true)}
                  style={[editStyles.statusPill, { backgroundColor: statusConfig.bg }]}
                >
                  <View style={[editStyles.statusDot, { backgroundColor: statusConfig.color }]} />
                  <Text style={[editStyles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                  <Info size={12} color={statusConfig.color} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={editStyles.receiptThumb}
              activeOpacity={0.85}
              onPress={handleReceiptPress}
            >
              {receiptPhotoUri ? (
                <Image source={{ uri: receiptPhotoUri }} style={editStyles.receiptImage} />
              ) : (
                <>
                  <ReceiptText color="#A1A1AA" size={22} />
                  <Text style={editStyles.receiptThumbText}>Receipt</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Form */}
        <ScrollView contentContainerStyle={editStyles.content} showsVerticalScrollIndicator={false}>
          {/* Merchant */}
          <View style={editStyles.sectionCard}>
            <Text style={editStyles.sectionTitle}>Merchant</Text>
            <View style={editStyles.inputWrap}>
              <TextInput
                style={editStyles.input}
                placeholder="Name"
                placeholderTextColor="#A1A1AA"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Date + Price */}
          <View style={editStyles.row}>
            <TouchableOpacity style={[editStyles.sectionCard, editStyles.half]} onPress={() => setShowDatePicker(true)}>
              <Text style={editStyles.sectionTitle}>Date</Text>
              <View style={editStyles.valueRow}>
                <View style={editStyles.dateValueWrap}>
                  <View style={editStyles.dateValueIcon}>
                    <CalendarIcon size={14} color="#111" />
                  </View>
                  <View>
                    <Text style={editStyles.datePrimary}>{dateDisplay.primary}</Text>
                    <Text style={editStyles.dateSecondary}>{dateDisplay.secondary}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            <View style={[editStyles.sectionCard, editStyles.half]}>
              <Text style={editStyles.sectionTitle}>Price</Text>
              <View style={editStyles.inputWrap}>
                <TextInput
                  style={editStyles.input}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#A1A1AA"
                />
              </View>
            </View>
          </View>

          {/* Category */}
          <TouchableOpacity style={editStyles.sectionCard} onPress={() => setShowCategoryPicker(true)}>
            <Text style={editStyles.sectionTitle}>Category</Text>
            <View style={editStyles.valueRow}>
              <View style={editStyles.categoryValueWrap}>
                <View style={[editStyles.categoryColorDot, { backgroundColor: selectedCategoryColor }]} />
                <Text style={editStyles.valueText}>{category}</Text>
              </View>
              <ChevronRight size={16} color="#C7C7CC" style={{ marginLeft: 8 }} />
            </View>
          </TouchableOpacity>

          {/* Notes */}
          <View style={editStyles.sectionCard}>
            <Text style={editStyles.sectionTitle}>Notes</Text>
            <View style={[editStyles.inputWrap, { height: 110, paddingVertical: 10 }]}>
              <TextInput
                style={[editStyles.input, { height: "100%", textAlignVertical: "top" }]}
                placeholder="Add a note (optional)"
                placeholderTextColor="#A1A1AA"
                value={comment}
                onChangeText={setComment}
                multiline
              />
            </View>
          </View>

          {/* Toggles */}
          <View style={editStyles.sectionCard}>
            <Text style={editStyles.sectionTitle}>Options</Text>

            <TouchableOpacity
              style={[editStyles.toggleRow, isFullPage && editStyles.toggleRowActive]}
              onPress={() => setIsFullPage(!isFullPage)}
              activeOpacity={0.85}
            >
              <View style={[editStyles.checkBox, isFullPage && editStyles.checkBoxActive]}>
                {isFullPage && <Check size={12} color="#fff" strokeWidth={4} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={editStyles.toggleTitle}>Full-Page</Text>
                <Text style={editStyles.toggleSubtitle}>Mark if the receipt image is a full page.</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ height: 90 }} />
        </ScrollView>

        {/* Sticky bottom Save bar */}
        <View style={editStyles.bottomBar}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSave}
            disabled={!isValid}
            style={[editStyles.saveBtn, !isValid && editStyles.saveBtnDisabled]}
          >
            <Text style={[editStyles.saveBtnText, !isValid && editStyles.saveBtnTextDisabled]}>Save changes</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Pickers */}
      <SimpleDatePickerModal
        visible={showDatePicker}
        currentDate={dateVal}
        onClose={() => setShowDatePicker(false)}
        onSelect={(d: string) => {
          setDateVal(d);
          setShowDatePicker(false);
        }}
      />
      <SelectionModal
        visible={showCurrencyPicker}
        title="Select Currency"
        options={["USD", "EUR", "RON", "GBP"]}
        selected={currency}
        variant="currency"
        onClose={() => setShowCurrencyPicker(false)}
        onSelect={(val: string) => {
          setCurrency(val);
          setShowCurrencyPicker(false);
        }}
      />
      <SelectionModal
        visible={showCategoryPicker}
        title="Select Category"
        options={categoryOptions}
        selected={category}
        variant="category"
        accentMap={categoryAccentMap}
        onClose={() => setShowCategoryPicker(false)}
        onSelect={(val: string) => {
          setCategory(val);
          setShowCategoryPicker(false);
        }}
      />
      <Modal
        visible={showReceiptPreview}
        transparent={false}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowReceiptPreview(false)}
      >
        <SafeAreaView style={editStyles.receiptPreviewOverlay}>
          <View style={editStyles.receiptPreviewTopBar}>
            <TouchableOpacity
              style={editStyles.receiptPreviewTopBtn}
              onPress={() => setShowReceiptPreview(false)}
              hitSlop={10}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={editStyles.receiptPreviewZoomWrap}
            contentContainerStyle={editStyles.receiptPreviewZoomContent}
            minimumZoomScale={1}
            maximumZoomScale={4}
            centerContent
            bouncesZoom
            pinchGestureEnabled
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            {previewPhotoUri ? (
              <Image source={{ uri: previewPhotoUri }} style={editStyles.receiptPreviewImage} resizeMode="contain" />
            ) : null}
          </ScrollView>
          <View style={editStyles.receiptPreviewActionBar}>
            <TouchableOpacity
              style={editStyles.receiptPreviewActionBtn}
              onPress={async () => {
                const uri = await captureReceiptPhoto();
                if (uri) {
                  setPreviewPhotoUri(uri);
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
                }
              }}
            >
              <Text style={editStyles.receiptPreviewActionText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={editStyles.receiptPreviewActionBtn}
              onPress={async () => {
                const uri = await pickReceiptFromGallery();
                if (uri) {
                  setPreviewPhotoUri(uri);
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
                }
              }}
            >
              <Text style={editStyles.receiptPreviewActionText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[editStyles.receiptPreviewActionBtn, editStyles.receiptPreviewDeleteBtn]}
              onPress={() => {
                setPreviewPhotoUri(null);
                setReceiptPhotoUri(null);
                setShowReceiptPreview(false);
              }}
            >
              <Text style={[editStyles.receiptPreviewActionText, editStyles.receiptPreviewDeleteText]}>Delete</Text>
            </TouchableOpacity>
          </View>
          <View style={editStyles.receiptPreviewFooter}>
            <TouchableOpacity
              style={editStyles.receiptPreviewFooterGhostBtn}
              onPress={() => {
                setPreviewPhotoUri(receiptPhotoUri ?? null);
                setShowReceiptPreview(false);
              }}
            >
              <Text style={editStyles.receiptPreviewFooterGhostText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={editStyles.receiptPreviewFooterPrimaryBtn}
              onPress={() => {
                setReceiptPhotoUri(previewPhotoUri ?? null);
                setShowReceiptPreview(false);
              }}
            >
              <Text style={editStyles.receiptPreviewFooterPrimaryText}>Save</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      <Modal visible={showStatusInfo} transparent animationType="fade" onRequestClose={() => setShowStatusInfo(false)}>
        <TouchableOpacity style={editStyles.statusInfoOverlay} activeOpacity={1} onPress={() => setShowStatusInfo(false)}>
          <View style={editStyles.statusInfoCard} onStartShouldSetResponder={() => true}>
            <View style={editStyles.statusInfoHeader}>
              <Text style={editStyles.statusInfoTitle}>Receipt Status Guide</Text>
              <TouchableOpacity onPress={() => setShowStatusInfo(false)} hitSlop={8}>
                <X size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={editStyles.statusInfoRow}>
              <View style={[editStyles.statusInfoIconWrap, { backgroundColor: "#E6F9EA" }]}>
                <CheckCircle2 size={15} color="#34C759" />
              </View>
              <View style={editStyles.statusInfoTextWrap}>
                <Text style={editStyles.statusInfoLabel}>Processed</Text>
                <Text style={editStyles.statusInfoText}>Receipt data was read successfully and looks valid.</Text>
              </View>
            </View>

            <View style={editStyles.statusInfoRow}>
              <View style={[editStyles.statusInfoIconWrap, { backgroundColor: "#FFF4E5" }]}>
                <Clock3 size={15} color="#FF9500" />
              </View>
              <View style={editStyles.statusInfoTextWrap}>
                <Text style={editStyles.statusInfoLabel}>Needs action</Text>
                <Text style={editStyles.statusInfoText}>Some fields may be missing; review and confirm details.</Text>
              </View>
            </View>

            <View style={editStyles.statusInfoRow}>
              <View style={[editStyles.statusInfoIconWrap, { backgroundColor: "#FFEBEE" }]}>
                <AlertTriangle size={15} color="#FF3B30" />
              </View>
              <View style={editStyles.statusInfoTextWrap}>
                <Text style={editStyles.statusInfoLabel}>Failed</Text>
                <Text style={editStyles.statusInfoText}>Receipt parsing failed, so manual review is required.</Text>
              </View>
            </View>

            <Text style={editStyles.statusInfoHint}>Tap outside to dismiss.</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

// --- SUB-COMPONENTS (Date/Select Modals) ---
interface DatePickerProps {
  visible: boolean;
  currentDate: string;
  onClose: () => void;
  onSelect: (date: string) => void;
}
const SimpleDatePickerModal = ({ visible, currentDate, onClose, onSelect }: DatePickerProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [showModal, setShowModal] = useState(visible);
  const [displayMonth, setDisplayMonth] = useState(() => {
    const parsed = new Date(currentDate);
    const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const selectedDate = useMemo(() => {
    const parsed = new Date(currentDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [currentDate]);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const calendarTitle = useMemo(
    () => displayMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    [displayMonth],
  );
  const calendarCells = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ key: string; day: number | null; date: Date | null }> = [];

    for (let i = 0; i < firstDayOfMonth; i += 1) {
      cells.push({ key: `empty-start-${i}`, day: null, date: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      cells.push({ key: `day-${year}-${month}-${day}`, day, date });
    }

    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let i = remainder; i < 7; i += 1) {
        cells.push({ key: `empty-end-${i}`, day: null, date: null });
      }
    }

    return cells;
  }, [displayMonth]);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      const parsed = new Date(currentDate);
      const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
      setDisplayMonth(new Date(base.getFullYear(), base.getMonth(), 1));
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 250, useNativeDriver: true }),
      ]).start(() => setShowModal(false));
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!showModal) return null;
  const formatIsoDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const isSameDay = (first: Date | null, second: Date | null) =>
    !!first &&
    !!second &&
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();
  const goToPreviousMonth = () =>
    setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () =>
    setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const handleSelectToday = () => {
    const today = new Date();
    onSelect(formatIsoDate(today));
  };

  return (
    <Modal visible={showModal} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[modalStyles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[pickerStyles.container, { transform: [{ translateY: slideAnim }] }]}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Select Date</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="#000" />
            </TouchableOpacity>
          </View>
          <View style={pickerStyles.monthRow}>
            <TouchableOpacity style={pickerStyles.monthNavBtn} onPress={goToPreviousMonth}>
              <ChevronLeft size={18} color="#111827" />
            </TouchableOpacity>
            <Text style={pickerStyles.monthLabel}>{calendarTitle}</Text>
            <TouchableOpacity style={pickerStyles.monthNavBtn} onPress={goToNextMonth}>
              <ChevronRight size={18} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={pickerStyles.weekHeaderRow}>
            {weekDays.map((weekday) => (
              <Text key={weekday} style={pickerStyles.weekHeaderText}>
                {weekday}
              </Text>
            ))}
          </View>

          <View style={pickerStyles.grid}>
            {calendarCells.map((cell) => {
              if (!cell.day || !cell.date) {
                return <View key={cell.key} style={pickerStyles.dayCell} />;
              }

              const isSelected = isSameDay(selectedDate, cell.date);
              const isToday = isSameDay(new Date(), cell.date);

              return (
                <TouchableOpacity
                  key={cell.key}
                  style={pickerStyles.dayCell}
                  onPress={() => onSelect(formatIsoDate(cell.date as Date))}
                >
                  <View
                    style={[
                      pickerStyles.dayPill,
                      isSelected && pickerStyles.selectedDay,
                      !isSelected && isToday ? pickerStyles.todayDay : null,
                    ]}
                  >
                    <Text
                      style={[
                        pickerStyles.dayText,
                        isSelected && pickerStyles.selectedDayText,
                        !isSelected && isToday ? pickerStyles.todayDayText : null,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={pickerStyles.todayBtn} onPress={handleSelectToday}>
            <Text style={pickerStyles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

interface SelectionModalProps {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  variant?: "default" | "category" | "currency";
  accentMap?: Record<string, string>;
  onClose: () => void;
  onSelect: (value: string) => void;
}
const SelectionModal = ({ visible, title, options, selected, variant = "default", accentMap, onClose, onSelect }: SelectionModalProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [showModal, setShowModal] = useState(visible);
  const isCategorySheet = variant === "category";
  const isCurrencySheet = variant === "currency";
  const categoryAccents: Record<string, string> = {
    Groceries: "#22C55E",
    Tech: "#3B82F6",
    Transport: "#F59E0B",
    Bills: "#EF4444",
    Wholesale: "#14B8A6",
    General: "#8B5CF6",
  };
  const currencyAccents: Record<string, string> = {
    USD: "#2563EB",
    EUR: "#7C3AED",
    RON: "#0891B2",
    GBP: "#16A34A",
  };
  const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "EUR",
    RON: "RON",
    GBP: "GBP",
  };

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 250, useNativeDriver: true }),
      ]).start(() => setShowModal(false));
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!showModal) return null;

  return (
    <Modal visible={showModal} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[modalStyles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[selectionStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={selectionStyles.handle} />
          <View style={selectionStyles.header}>
            <Text style={selectionStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>
          {isCategorySheet && <Text style={selectionStyles.subtitle}>Choose a category for this receipt</Text>}
          {isCurrencySheet && <Text style={selectionStyles.subtitle}>Choose a currency for this receipt</Text>}
          <ScrollView>
            {isCategorySheet || isCurrencySheet ? (
              <View style={selectionStyles.categoryGrid}>
                {options.map((opt: string) => {
                  const isSelected = selected === opt;
                  const accent = isCategorySheet
                    ? accentMap?.[opt] ?? categoryAccents[opt] ?? "#8E8E93"
                    : currencyAccents[opt] ?? "#8E8E93";

                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[selectionStyles.categoryChip, isSelected && selectionStyles.categoryChipSelected]}
                      onPress={() => onSelect(opt)}
                    >
                      <View style={[selectionStyles.categoryDot, { backgroundColor: accent }]} />
                      <View style={selectionStyles.categoryChipTextWrap}>
                        <Text
                          style={[
                            selectionStyles.categoryChipText,
                            isSelected && selectionStyles.categoryChipTextSelected,
                          ]}
                        >
                          {opt}
                        </Text>
                        {isCurrencySheet ? (
                          <Text style={selectionStyles.categoryChipMeta}>{currencySymbols[opt] ?? opt}</Text>
                        ) : null}
                      </View>
                      {isSelected ? (
                        <View style={selectionStyles.categoryCheckWrap}>
                          <Check size={14} color="#111" strokeWidth={3} />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              options.map((opt: string) => (
                <TouchableOpacity
                  key={opt}
                  style={[selectionStyles.option, selected === opt && selectionStyles.selectedOption]}
                  onPress={() => onSelect(opt)}
                >
                  <Text style={[selectionStyles.optionText, selected === opt && selectionStyles.selectedOptionText]}>
                    {opt}
                  </Text>
                  {selected === opt && <Check size={20} color="#ffffff" />}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// --- STYLES (Main list) ---
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#F8F9FA" },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    marginBottom: 14,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  pageEyebrow: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#6B7280",
    fontWeight: "700",
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  headerBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#34C759",
    marginRight: 7,
  },
  headerBadgeText: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "700",
  },
  summaryCard: {
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
  summaryLabel: { fontSize: 14, color: "#8E8E93", fontWeight: "600", marginBottom: 6 },
  summaryAmount: { fontSize: 28, color: "#1A1A1A", fontWeight: "900" },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E6F9EA",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  trendText: { color: "#34C759", fontWeight: "700", fontSize: 13, marginLeft: 4 },
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
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: "#1A1A1A" },
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
  filterChipActive: { backgroundColor: "#1A1A1A", borderColor: "#1A1A1A" },
  filterText: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  filterTextActive: { color: "#fff" },

  listContent: { paddingTop: 10, paddingBottom: 100 },
});

// --- STYLES (Report card) ---
const cardStyles = StyleSheet.create({
  card: {
    width: "95%",
    alignSelf: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F2F2F7",
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    overflow: "hidden",
  },
  receiptImage: {
    width: "100%",
    height: "100%",
  },
  textColumn: { justifyContent: "center", gap: 4 },
  titleText: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  metaText: { fontSize: 13, fontWeight: "500", color: "#8E8E93" },
  rightColumn: { alignItems: "flex-end", gap: 6 },
  amount: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
  statusPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: "600" },
});

// --- Picker/Selection styles ---
const pickerStyles = StyleSheet.create({
  container: {
    width: "90%",
    maxWidth: 430,
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
  },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  monthLabel: { fontSize: 17, color: "#111827", fontWeight: "800" },
  weekHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  weekHeaderText: {
    width: "14.2%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  dayCell: { width: "14.2%", aspectRatio: 1, justifyContent: "center", alignItems: "center" },
  dayPill: { width: "84%", aspectRatio: 1, borderRadius: 999, justifyContent: "center", alignItems: "center" },
  selectedDay: { backgroundColor: "#000000" },
  todayDay: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  dayText: { fontSize: 15, color: "#333", fontWeight: "600" },
  todayDayText: { color: "#111827", fontWeight: "800" },
  selectedDayText: { color: "#fff", fontWeight: "700" },
  todayBtn: {
    marginTop: 10,
    alignSelf: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
});

const selectionStyles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 34,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  handle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D4D4D8",
    marginBottom: 16,
  },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, alignItems: "center" },
  title: { fontSize: 20, fontWeight: "800", color: "#111" },
  subtitle: { fontSize: 13, color: "#71717A", marginBottom: 16, fontWeight: "600" },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#F1F1F3",
    marginBottom: 10,
  },
  selectedOption: { backgroundColor: "#000000", borderColor: "#000000" },
  optionText: { fontSize: 16, color: "#333", fontWeight: "600" },
  selectedOptionText: { color: "#ffffff", fontWeight: "600" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryChip: {
    width: "48.5%",
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#ECECF1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryChipSelected: {
    backgroundColor: "#EEF4FF",
    borderColor: "#111",
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 10,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  categoryChipTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  categoryChipTextSelected: {
    color: "#111",
  },
  categoryChipMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
  categoryCheckWrap: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D4D4D8",
  },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
});

// --- NEW EDIT SHEET STYLES ---
const editStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  dragHandleArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#F7F7FA",
  },
  dragHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
  },

  header: {
    backgroundColor: "#F7F7FA",
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerTitleWrap: { alignItems: "center" },
  headerTitle: { color: "#111", fontSize: 18, fontWeight: "800", letterSpacing: 0.2 },
  headerSubtitle: { marginTop: 1, color: "#6B7280", fontSize: 12, fontWeight: "600" },
  headerGhostBtn: {
    width: 36,
    height: 36,
  },

  stickySummaryWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: "#F2F2F7",
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#EFEFF4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: { fontSize: 12, color: "#8E8E93", fontWeight: "700" },
  summaryAmount: { fontSize: 24, color: "#111", fontWeight: "900", marginTop: 2 },

  pillsRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillDark: { backgroundColor: "#111" },
  pillTextDark: { color: "#fff", fontWeight: "800", fontSize: 13 },

  statusPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999 },
  statusDot: { width: 7, height: 7, borderRadius: 999, marginRight: 8 },
  statusText: { fontSize: 12, fontWeight: "800" },

  receiptThumb: {
    width: 86,
    height: 86,
    borderRadius: 18,
    backgroundColor: "#F5F5F7",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  receiptImage: {
    width: "100%",
    height: "100%",
  },
  receiptPreviewOverlay: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 18,
  },
  receiptPreviewTopBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
  },
  receiptPreviewTopBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  receiptPreviewZoomWrap: {
    width: "100%",
    flex: 1,
  },
  receiptPreviewZoomContent: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  receiptPreviewImage: {
    width: "100%",
    height: "100%",
  },
  receiptPreviewActionBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  receiptPreviewActionBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 11,
    alignItems: "center",
  },
  receiptPreviewActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  receiptPreviewDeleteBtn: {
    backgroundColor: "rgba(239,68,68,0.22)",
    borderColor: "rgba(239,68,68,0.45)",
  },
  receiptPreviewDeleteText: {
    color: "#FECACA",
  },
  receiptPreviewFooter: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  receiptPreviewFooterGhostBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  receiptPreviewFooterGhostText: {
    fontSize: 14,
    color: "#E5E7EB",
    fontWeight: "700",
  },
  receiptPreviewFooterPrimaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  receiptPreviewFooterPrimaryText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "800",
  },
  receiptThumbText: { marginTop: 6, fontSize: 11, color: "#8E8E93", fontWeight: "700" },

  content: { paddingHorizontal: 16, paddingBottom: 0 },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EFEFF4",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: { fontSize: 13, color: "#8E8E93", fontWeight: "800", marginBottom: 10, letterSpacing: 0.2 },

  inputWrap: {
    backgroundColor: "#F7F7FA",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EFEFF4",
  },
  input: { fontSize: 16, color: "#111", fontWeight: "600" },

  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },

  valueRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateValueWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateValueIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  datePrimary: { fontSize: 17, color: "#111", fontWeight: "900", letterSpacing: 0.2 },
  dateSecondary: { marginTop: 1, fontSize: 11, color: "#6B7280", fontWeight: "700" },
  categoryValueWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryColorDot: { width: 10, height: 10, borderRadius: 999 },
  valueText: { fontSize: 16, color: "#111", fontWeight: "800" },
  statusInfoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  statusInfoCard: {
    width: "100%",
    maxWidth: 430,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  statusInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusInfoTitle: {
    fontSize: 17,
    color: "#111827",
    fontWeight: "800",
  },
  statusInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 9,
  },
  statusInfoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },
  statusInfoTextWrap: { flex: 1 },
  statusInfoLabel: { fontSize: 14, color: "#111827", fontWeight: "800" },
  statusInfoText: { marginTop: 2, fontSize: 12, lineHeight: 18, color: "#4B5563", fontWeight: "600" },
  statusInfoHint: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "700",
  },

  toggleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EFEFF4",
    backgroundColor: "#F7F7FA",
    gap: 10,
  },
  toggleRowActive: { backgroundColor: "#F5F3FF", borderColor: "#111" },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#C7C7CC",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkBoxActive: { backgroundColor: "#7E57FF", borderColor: "#7E57FF" },
  toggleTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  toggleSubtitle: { marginTop: 2, fontSize: 12, fontWeight: "700", color: "#8E8E93" },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: "rgba(242,242,247,0.92)",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  saveBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { backgroundColor: "#D1D1D6" },
  saveBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  saveBtnTextDisabled: { color: "#8E8E93" },
});
