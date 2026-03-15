import { TagSearchModal } from "@/src/components/TagSearchModal";
import { Nunito_900Black } from "@expo-google-fonts/nunito";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useFonts } from "expo-font";
import { Image as ExpoImage } from "expo-image";
import { useSQLiteContext } from "expo-sqlite";
import { Calendar, Check, ChevronDown, ChevronRight, Coins, MapPin, Trash2, X } from "lucide-react-native";
import React from "react";
import { Animated, Modal, PanResponder, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ReceiptItem } from "./types";

type ReceiptDetailModalProps = {
  visible: boolean;
  item: ReceiptItem | null;
  categoryOptions: string[];
  categoryAccentMap: Record<string, string>;
  onClose: () => void;
  onSave: (updatedItem: ReceiptItem) => void;
};

type ReceiptLineItem = {
  id: string;
  dbProductId: number | null;
  userId: number | null;
  name: string;
  amountLabel: string;
  totalValue: number;
  quantity: string;
  unit: string;
  categoryName: string;
  subcategoryName: string;
  categoryColor: string;
};

const withAlpha = (hexColor: string, alpha: number): string => {
  const normalized = (hexColor || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(17, 24, 39, ${alpha})`;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatDatePillValue = (rawDate: Date | string | null | undefined): string => {
  if (!rawDate) return "5 Mar 2026";
  const parsed =
    rawDate instanceof Date
      ? rawDate
      : /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? new Date(
            Number.parseInt(rawDate.slice(0, 4), 10),
            Number.parseInt(rawDate.slice(5, 7), 10) - 1,
            Number.parseInt(rawDate.slice(8, 10), 10),
          )
        : new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return "5 Mar 2026";
  const day = parsed.getDate();
  const month = parsed.toLocaleDateString("en-US", { month: "short" });
  const year = parsed.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatTimePillValue = (rawDate: Date | string | null | undefined): string => {
  if (!rawDate) return "00:00";
  const parsed = rawDate instanceof Date ? rawDate : new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return "00:00";
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const parseEditableDateTime = (dateLabel: string, timeLabel: string): Date => {
  const now = new Date();
  const monthLookup: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };

  let year = now.getFullYear();
  let month = now.getMonth();
  let day = now.getDate();
  const dateMatch = dateLabel.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (dateMatch) {
    const parsedDay = Number.parseInt(dateMatch[1], 10);
    const parsedMonth = monthLookup[dateMatch[2].toLowerCase()];
    const parsedYear = Number.parseInt(dateMatch[3], 10);
    if (
      Number.isFinite(parsedDay) &&
      Number.isFinite(parsedMonth) &&
      Number.isFinite(parsedYear) &&
      parsedDay >= 1 &&
      parsedDay <= 31
    ) {
      day = parsedDay;
      month = parsedMonth;
      year = parsedYear;
    }
  }

  let hours = now.getHours();
  let minutes = now.getMinutes();
  const timeMatch = timeLabel.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const parsedHours = Number.parseInt(timeMatch[1], 10);
    const parsedMinutes = Number.parseInt(timeMatch[2], 10);
    if (parsedHours >= 0 && parsedHours <= 23) {
      hours = parsedHours;
    }
    if (parsedMinutes >= 0 && parsedMinutes <= 59) {
      minutes = parsedMinutes;
    }
  }

  const parsed = new Date(year, month, day, hours, minutes, 0, 0);
  return Number.isNaN(parsed.getTime()) ? now : parsed;
};

const parseAmountFromLabel = (rawAmountLabel: string): number => {
  const sanitized = rawAmountLabel.replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  if (!sanitized) return 0;
  const normalized = sanitized.includes(",") ? sanitized.replace(",", ".") : sanitized;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getUniqueNames = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of values) {
    const value = raw?.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }
  return unique;
};

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

function ReceiptDetailModal({ visible, item, categoryOptions, categoryAccentMap, onClose }: ReceiptDetailModalProps) {
  const [fontsLoaded] = useFonts({
    Nunito_900Black,
  });
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [resolvedReceiptPhotoUri, setResolvedReceiptPhotoUri] = React.useState<string | null>(null);
  const hasImage = Boolean(resolvedReceiptPhotoUri);
  const currencyValue = item?.currency ?? "RON";
  const [editableDate, setEditableDate] = React.useState("5 Mar 2026");
  const [editableTime, setEditableTime] = React.useState("00:00");
  const [showDatePickerModal, setShowDatePickerModal] = React.useState(false);
  const [pendingDatePickerValue, setPendingDatePickerValue] = React.useState(new Date());
  const [showTimePickerModal, setShowTimePickerModal] = React.useState(false);
  const [pendingTimePickerValue, setPendingTimePickerValue] = React.useState(new Date());
  const [receiptItems, setReceiptItems] = React.useState<ReceiptLineItem[]>([]);
  const [showEditItemModal, setShowEditItemModal] = React.useState(false);
  const [selectedLineItem, setSelectedLineItem] = React.useState<ReceiptLineItem | null>(null);
  const [editItemName, setEditItemName] = React.useState("");
  const [editItemQuantity, setEditItemQuantity] = React.useState("1");
  const [editItemUnit, setEditItemUnit] = React.useState("pcs");
  const [editItemTotalPrice, setEditItemTotalPrice] = React.useState("0.00");
  const [editItemCategory, setEditItemCategory] = React.useState("");
  const [editItemSubcategory, setEditItemSubcategory] = React.useState("");
  const [editItemSubcategoryOptions, setEditItemSubcategoryOptions] = React.useState<string[]>([]);
  const [activeFallbackPicker, setActiveFallbackPicker] = React.useState<"category" | "subcategory" | null>(null);
  const editItemSheetTranslateY = React.useRef(new Animated.Value(900)).current;
  const editItemCategoryOptions = React.useMemo(() => {
    const normalized = getUniqueNames(categoryOptions);
    const seen = new Set(normalized.map((option) => option.toLowerCase()));

    const current = editItemCategory.trim();
    if (current && !seen.has(current.toLowerCase())) {
      normalized.unshift(current);
    }

    if (normalized.length === 0) {
      normalized.push("General");
    }
    return normalized;
  }, [categoryOptions, editItemCategory]);

  React.useEffect(() => {
    if (!visible) return;
    const formattedDate = formatDatePillValue(item?.fullDate);
    const formattedTime = formatTimePillValue(item?.fullDate);
    setEditableDate(formattedDate);
    setEditableTime(formattedTime);
    const initialDateTime = parseEditableDateTime(formattedDate, formattedTime);
    setPendingDatePickerValue(initialDateTime);
    setPendingTimePickerValue(initialDateTime);
  }, [item?.fullDate, visible]);
  React.useEffect(() => {
    if (!visible || !item) {
      setResolvedReceiptPhotoUri(null);
      return;
    }

    let isCancelled = false;
    const fallbackUri = normalizeReceiptPhotoUri(item.receiptPhotoUri ?? null);
    setResolvedReceiptPhotoUri(fallbackUri);

    const paymentId = item.id.startsWith("db-") ? Number(item.id.replace("db-", "")) : NaN;
    if (!Number.isFinite(paymentId) || paymentId <= 0) {
      return;
    }

    const loadFromDb = async () => {
      try {
        const row = await db.getFirstAsync<{ receiptPhotoLink: string | null }>(
          `SELECT receipt_photo_link AS receiptPhotoLink
           FROM payments
           WHERE id = ?
           LIMIT 1`,
          [paymentId],
        );
        const dbUri = normalizeReceiptPhotoUri(row?.receiptPhotoLink ?? null);
        if (!isCancelled) {
          setResolvedReceiptPhotoUri(dbUri ?? fallbackUri);
        }
      } catch (error) {
        if (!isCancelled) {
          setResolvedReceiptPhotoUri(fallbackUri);
        }
        console.error("Failed loading receipt photo link:", error);
      }
    };

    void loadFromDb();

    return () => {
      isCancelled = true;
    };
  }, [db, item, visible]);
  React.useEffect(() => {
    if (!visible) {
      setShowDatePickerModal(false);
      setShowTimePickerModal(false);
      setShowEditItemModal(false);
      setSelectedLineItem(null);
      setEditItemName("");
      setEditItemQuantity("1");
      setEditItemUnit("pcs");
      setEditItemTotalPrice("0.00");
      setEditItemCategory("");
      setEditItemSubcategory("");
      setEditItemSubcategoryOptions([]);
      setActiveFallbackPicker(null);
      editItemSheetTranslateY.setValue(900);
    }
  }, [editItemSheetTranslateY, visible]);

  React.useEffect(() => {
    let isCancelled = false;

    const setFallbackItem = () => {
      const fallbackCategory = item?.category || "General";
      const fallbackCategoryColor = categoryAccentMap[fallbackCategory] ?? "#6B7280";
      const fallback: ReceiptLineItem[] = item
        ? [
            {
              id: `fallback-${item.id}`,
              dbProductId: null,
              userId: null,
              name: item.title || "Item",
              amountLabel: item.amount || `${currencyValue} 0.00`,
              totalValue: parseAmountFromLabel(item.amount || ""),
              quantity: "1",
              unit: "pcs",
              categoryName: fallbackCategory,
              subcategoryName: "",
              categoryColor: fallbackCategoryColor,
            },
          ]
        : [];
      if (!isCancelled) {
        setReceiptItems(fallback);
      }
    };

    const loadItems = async () => {
      if (!visible || !item) {
        if (!isCancelled) {
          setReceiptItems([]);
        }
        return;
      }

      if (!item.id.startsWith("db-")) {
        setFallbackItem();
        return;
      }

      const paymentId = Number(item.id.replace("db-", ""));
      if (!Number.isFinite(paymentId) || paymentId <= 0) {
        setFallbackItem();
        return;
      }

      try {
        const rows = await db.getAllAsync<{
          id: number;
          userId: number;
          name: string;
          price: number;
          firstSubcategory: string | null;
          categoryName: string | null;
          categoryColor: string | null;
        }>(
          `SELECT p.id AS id,
                  p.user_id AS userId,
                  p.name AS name,
                  p.price AS price,
                  p.first_subcategory AS firstSubcategory,
                  c.category_name AS categoryName,
                  c.color AS categoryColor
           FROM products p
           LEFT JOIN categories c ON c.id = p.category_id
           WHERE payment_id = ?
           ORDER BY p.id ASC`,
          [paymentId],
        );

        const mapped = rows.map((row) => ({
            id: `product-${row.id}`,
            dbProductId: row.id,
            userId: row.userId ?? null,
            name: row.name?.trim() || "Unnamed item",
            amountLabel: `${currencyValue} ${(Number(row.price ?? 0) / 100).toFixed(2)}`,
            totalValue: Number(row.price ?? 0) / 100,
            quantity: "1",
            unit: "pcs",
            categoryName: row.categoryName?.trim() || item.category || "General",
            subcategoryName: row.firstSubcategory?.trim() || "",
            categoryColor:
              row.categoryColor?.trim() ||
              categoryAccentMap[row.categoryName?.trim() || ""] ||
              categoryAccentMap[item.category] ||
              "#6B7280",
        }));

        if (!isCancelled) {
          setReceiptItems(mapped.length > 0 ? mapped : []);
        }
      } catch {
        setFallbackItem();
      }
    };

    void loadItems();

    return () => {
      isCancelled = true;
    };
  }, [categoryAccentMap, currencyValue, db, item, visible]);

  React.useEffect(() => {
    if (!showEditItemModal) {
      setEditItemSubcategoryOptions([]);
      return;
    }

    let isCancelled = false;

    const loadSubcategoryOptions = async () => {
      const categoryName =
        editItemCategory.trim() ||
        selectedLineItem?.categoryName?.trim() ||
        item?.category?.trim() ||
        "General";
      const currentSubcategory = editItemSubcategory.trim();
      const userId = selectedLineItem?.userId;

      try {
        const rows = userId
          ? await db.getAllAsync<{ name: string | null }>(
              `SELECT name
               FROM subcategory_presets
               WHERE user_id = ? AND category_name = ? AND is_archived = 0
               ORDER BY use_count DESC, last_used_at DESC, name ASC`,
              [userId, categoryName],
            )
          : await db.getAllAsync<{ name: string | null }>(
              `SELECT name
               FROM subcategory_presets
               WHERE category_name = ? AND is_archived = 0
               ORDER BY use_count DESC, last_used_at DESC, name ASC`,
              [categoryName],
            );

        const presetOptions = getUniqueNames(rows.map((row) => row.name));
        const mergedOptions = getUniqueNames([currentSubcategory, ...presetOptions]);

        if (!isCancelled) {
          setEditItemSubcategoryOptions(mergedOptions);
        }
      } catch (error) {
        if (!isCancelled) {
          setEditItemSubcategoryOptions(getUniqueNames([currentSubcategory]));
        }
        console.error("Failed to load subcategory options:", error);
      }
    };

    void loadSubcategoryOptions();

    return () => {
      isCancelled = true;
    };
  }, [db, editItemCategory, editItemSubcategory, item?.category, selectedLineItem, showEditItemModal]);

  const categoryPickerItems = React.useMemo(
    () => editItemCategoryOptions.map((option) => ({ label: option, value: option })),
    [editItemCategoryOptions],
  );
  const categoryFallbackItems = React.useMemo(
    () => categoryPickerItems.map((item) => item.label),
    [categoryPickerItems],
  );
  const subcategoryPickerItems = React.useMemo(
    () => [
      { label: "Not set", value: "" },
      ...getUniqueNames([editItemSubcategory, ...editItemSubcategoryOptions]).map((option) => ({
        label: option,
        value: option,
      })),
    ],
    [editItemSubcategory, editItemSubcategoryOptions],
  );
  const subcategoryFallbackItems = React.useMemo(
    () => subcategoryPickerItems.map((item) => item.label),
    [subcategoryPickerItems],
  );
  const isNativePickerAvailable = React.useMemo(() => {
    if (Platform.OS === "web") return false;
    const getConfig = UIManager.getViewManagerConfig?.bind(UIManager);
    if (!getConfig) return false;
    if (Platform.OS === "ios") {
      return Boolean(getConfig("RNCPicker"));
    }
    if (Platform.OS === "android") {
      return Boolean(
        getConfig("RNCPicker") ||
          getConfig("RNCAndroidDialogPicker") ||
          getConfig("RNCAndroidDropdownPicker"),
      );
    }
    return true;
  }, []);

  const receiptDateTime = `${editableDate.toLowerCase()} at ${editableTime}`;
  const openNativeDatePicker = React.useCallback(() => {
    const initialValue = parseEditableDateTime(editableDate, editableTime);
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        mode: "date",
        value: initialValue,
        is24Hour: true,
        onChange: (_event, selectedDate) => {
          if (!selectedDate) return;
          setEditableDate(formatDatePillValue(selectedDate));
          setPendingDatePickerValue(selectedDate);
        },
      });
      return;
    }

    setPendingDatePickerValue(initialValue);
    setShowDatePickerModal(true);
  }, [editableDate, editableTime]);
  const confirmIosDatePicker = React.useCallback(() => {
    setEditableDate(formatDatePillValue(pendingDatePickerValue));
    setShowDatePickerModal(false);
  }, [pendingDatePickerValue]);
  const openNativeTimePicker = React.useCallback(() => {
    const initialValue = parseEditableDateTime(editableDate, editableTime);
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        mode: "time",
        value: initialValue,
        is24Hour: true,
        onChange: (_event, selectedDate) => {
          if (!selectedDate) return;
          setEditableTime(formatTimePillValue(selectedDate));
          setPendingTimePickerValue(selectedDate);
        },
      });
      return;
    }

    setPendingTimePickerValue(initialValue);
    setShowTimePickerModal(true);
  }, [editableDate, editableTime]);
  const confirmIosTimePicker = React.useCallback(() => {
    setEditableTime(formatTimePillValue(pendingTimePickerValue));
    setShowTimePickerModal(false);
  }, [pendingTimePickerValue]);
  const closeEditItemModal = React.useCallback(() => {
    Animated.timing(editItemSheetTranslateY, {
      toValue: 900,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setShowEditItemModal(false);
      setSelectedLineItem(null);
      setEditItemName("");
      setEditItemQuantity("1");
      setEditItemUnit("pcs");
      setEditItemTotalPrice("0.00");
      setEditItemCategory("");
      setEditItemSubcategory("");
      setEditItemSubcategoryOptions([]);
      setActiveFallbackPicker(null);
    });
  }, [editItemSheetTranslateY]);
  const springBackEditItemModal = React.useCallback(() => {
    Animated.spring(editItemSheetTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 22,
      bounciness: 5,
    }).start();
  }, [editItemSheetTranslateY]);
  const handleSelectEditCategory = React.useCallback(
    (option: string) => {
      const next = option.trim();
      const prev = editItemCategory.trim();
      setEditItemCategory(next);
      if (next.toLowerCase() !== prev.toLowerCase()) {
        setEditItemSubcategory("");
      }
    },
    [editItemCategory],
  );
  const handleSelectEditSubcategory = React.useCallback((option: string) => {
    setEditItemSubcategory(option);
  }, []);
  const handleSaveEditedItem = React.useCallback(() => {
    if (!selectedLineItem) return;

    const normalizedName = editItemName.trim() || "Unnamed item";
    const normalizedQuantity = editItemQuantity.trim() || "1";
    const normalizedUnit = editItemUnit.trim() || "pcs";
    const parsedTotal = Number.parseFloat(editItemTotalPrice.replace(",", "."));
    const safeTotal = Number.isFinite(parsedTotal) && parsedTotal >= 0 ? parsedTotal : 0;
    const updatedAmountLabel = `${currencyValue} ${safeTotal.toFixed(2)}`;
    const normalizedCategory =
      editItemCategory.trim() ||
      selectedLineItem.categoryName ||
      categoryOptions[0]?.trim() ||
      item?.category?.trim() ||
      "General";
    const normalizedSubcategory = editItemSubcategory.trim();
    const persistedSubcategory = normalizedSubcategory.length > 0 ? normalizedSubcategory : null;
    const updatedCategoryColor =
      categoryAccentMap[normalizedCategory] || selectedLineItem.categoryColor || categoryAccentMap[item?.category || ""] || "#6B7280";

    setReceiptItems((prev) =>
      prev.map((lineItem) =>
        lineItem.id === selectedLineItem.id
          ? {
              ...lineItem,
              name: normalizedName,
              quantity: normalizedQuantity,
              unit: normalizedUnit,
              totalValue: safeTotal,
              amountLabel: updatedAmountLabel,
              categoryName: normalizedCategory,
              subcategoryName: normalizedSubcategory,
              categoryColor: updatedCategoryColor,
            }
          : lineItem,
      ),
    );

    if (selectedLineItem.dbProductId) {
      const totalCents = Math.max(0, Math.round((safeTotal + Number.EPSILON) * 100));
      void db
        .runAsync(
          `UPDATE products
           SET name = ?,
               price = ?,
               first_subcategory = ?,
               category_id = COALESCE(
                 (SELECT id FROM categories WHERE category_name = ? ORDER BY id DESC LIMIT 1),
                 category_id
               )
           WHERE id = ?`,
          [
            normalizedName,
            totalCents,
            persistedSubcategory,
            normalizedCategory,
            selectedLineItem.dbProductId,
          ],
        )
        .catch((error) => {
          console.error("Failed to update item:", error);
        });
    }

    closeEditItemModal();
  }, [
    closeEditItemModal,
    currencyValue,
    db,
    categoryAccentMap,
    categoryOptions,
    editItemCategory,
    editItemName,
    editItemQuantity,
    editItemSubcategory,
    editItemTotalPrice,
    editItemUnit,
    item?.category,
    selectedLineItem,
  ]);
  const handleDeleteEditedItem = React.useCallback(() => {
    if (!selectedLineItem) return;

    setReceiptItems((prev) => prev.filter((lineItem) => lineItem.id !== selectedLineItem.id));

    if (selectedLineItem.dbProductId) {
      void db
        .runAsync(`DELETE FROM products WHERE id = ?`, [selectedLineItem.dbProductId])
        .catch((error) => {
          console.error("Failed to delete item:", error);
        });
    }

    closeEditItemModal();
  }, [closeEditItemModal, db, selectedLineItem]);
  const openEditItemModal = (lineItem: ReceiptLineItem) => {
    setEditItemName(lineItem.name);
    setEditItemQuantity(lineItem.quantity);
    setEditItemUnit(lineItem.unit);
    setEditItemTotalPrice(lineItem.totalValue.toFixed(2));
    setEditItemCategory(lineItem.categoryName);
    setEditItemSubcategory(lineItem.subcategoryName || "");
    setActiveFallbackPicker(null);
    setSelectedLineItem(lineItem);
    setShowEditItemModal(true);
    editItemSheetTranslateY.setValue(900);
    requestAnimationFrame(() => {
      Animated.timing(editItemSheetTranslateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    });
  };
  const editItemDragResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 2 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.1,
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          gestureState.dy > 2 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.1,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            editItemSheetTranslateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 105 || gestureState.vy > 0.95) {
            closeEditItemModal();
            return;
          }
          springBackEditItemModal();
        },
        onPanResponderTerminate: () => {
          springBackEditItemModal();
        },
      }),
    [closeEditItemModal, editItemSheetTranslateY, springBackEditItemModal],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.container}>
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}> 
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>Edit Receipt</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <X size={18} color="#111111" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.imageContainer}>
              {hasImage ? (
                <ExpoImage source={resolvedReceiptPhotoUri} contentFit="contain" style={styles.receiptImage} />
              ) : (
                <Text style={styles.noImageText}>(no image yet)</Text>
              )}
            </View>

            <View style={styles.infoCard}>
              <View style={styles.checkCircle}>
                <Check size={20} color="#FFFFFF" strokeWidth={2.8} />
              </View>
              <Text style={styles.storeName}>{item?.title ?? "Unknown store"}</Text>
              <Text style={[styles.totalSum, fontsLoaded ? styles.totalSumRoundedBold : null]}>
                {item?.amount ?? "RON 0.00"}
              </Text>
              <Text style={styles.dateText}>{receiptDateTime}</Text>
            </View>

            <Text style={styles.billDetailsTitle}>Bill Details</Text>
            <View style={styles.editDateCard}>
              <View style={styles.detailsRow}>
                <View style={styles.editDateLabelWrap}>
                  <Calendar size={15} color="#6B7280" />
                  <Text style={styles.editDateLabel}>Date</Text>
                </View>
                <View style={styles.editDatePillsWrap}>
                  <TouchableOpacity style={styles.editPill} activeOpacity={0.85} onPress={openNativeDatePicker} hitSlop={8}>
                    <Text style={styles.editPillText}>{editableDate}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editPill} activeOpacity={0.85} onPress={openNativeTimePicker} hitSlop={8}>
                    <Text style={[styles.editPillText, styles.editTimeText]}>{editableTime}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.detailsSeparator, styles.detailsSeparatorLarge]} />

              <View style={styles.detailsRow}>
                <View style={styles.editDateLabelWrap}>
                  <MapPin size={15} color="#6B7280" />
                  <Text style={styles.editDateLabel}>Location</Text>
                </View>
                <Text style={styles.locationValue}>placeholder</Text>
              </View>

              <View style={styles.detailsSeparator} />

              <View style={styles.detailsRow}>
                <View style={styles.editDateLabelWrap}>
                  <Coins size={15} color="#6B7280" />
                  <Text style={styles.editDateLabel}>Currency</Text>
                </View>
                <View style={styles.currencyValueWrap}>
                  <Text style={styles.locationValue}>{currencyValue}</Text>
                  <ChevronRight size={15} color="#9CA3AF" />
                </View>
              </View>
            </View>

            <View style={styles.itemsSectionHeader}>
              <Text style={styles.itemsSectionTitle}>Items</Text>
              <Text style={styles.itemsCountText}>({receiptItems.length})</Text>
            </View>
            <View style={styles.itemsCard}>
              {receiptItems.length === 0 ? (
                <Text style={styles.itemsEmptyText}>(no items yet)</Text>
              ) : (
                receiptItems.map((receiptItem, index) => {
                  return (
                    <View key={receiptItem.id}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => openEditItemModal(receiptItem)}
                      style={styles.itemsEntry}
                    >
                      <View style={styles.itemsRow}>
                        <View style={styles.itemsMainCol}>
                          <Text style={styles.itemsName} numberOfLines={1}>
                            {receiptItem.name}
                          </Text>
                          <View style={styles.itemBadgesRow}>
                            <View
                              style={[
                                styles.itemCategoryBadge,
                                {
                                  backgroundColor: withAlpha(receiptItem.categoryColor, 0.14),
                                  borderColor: withAlpha(receiptItem.categoryColor, 0.32),
                                },
                              ]}
                            >
                              <Text style={[styles.itemCategoryBadgeText, { color: receiptItem.categoryColor }]}>
                                {receiptItem.categoryName}
                              </Text>
                            </View>
                            {receiptItem.subcategoryName.trim().length > 0 ? (
                              <View style={styles.itemSubcategoryBadge}>
                                <Text style={styles.itemSubcategoryBadgeText}>
                                  {receiptItem.subcategoryName}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                        <View style={styles.itemsAmountWrap}>
                          <Text style={styles.itemsAmount}>{receiptItem.amountLabel}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    {index < receiptItems.length - 1 ? <View style={styles.itemsSeparator} /> : null}
                  </View>
                  );
                })
              )}
            </View>
          </ScrollView>
          {showEditItemModal ? (
            <View style={styles.editItemOverlay}>
              <Animated.View
                style={[
                  styles.editItemSheet,
                  {
                    paddingBottom: Math.max(16, insets.bottom + 8),
                    transform: [{ translateY: editItemSheetTranslateY }],
                  },
                ]}
              >
                <View style={styles.editItemDragArea} {...editItemDragResponder.panHandlers}>
                  <View style={styles.editItemDragHandle} />
                </View>

                <View style={styles.editItemSheetHeader}>
                  <View style={styles.editItemHeaderSpacer} />
                  <Text style={styles.editItemSheetTitle}>Edit Item</Text>
                  <TouchableOpacity onPress={closeEditItemModal} style={styles.editItemHeaderCloseBtn} hitSlop={8}>
                    <X size={18} color="#111111" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.editItemContentScroll}
                  contentContainerStyle={styles.editItemContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.editItemSectionTitle}>Item Details</Text>
                  <View style={styles.editItemCard}>
                    <TextInput
                      style={styles.editItemNameInput}
                      value={editItemName}
                      onChangeText={setEditItemName}
                      placeholder="Item name"
                      placeholderTextColor="#9CA3AF"
                    />
                    <View style={styles.editItemSeparator} />

                    <View style={styles.editItemRow}>
                      <Text style={styles.editItemLabel}>Quantity</Text>
                      <TextInput
                        style={styles.editItemValueInput}
                        value={editItemQuantity}
                        onChangeText={setEditItemQuantity}
                        placeholder="1"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                    <View style={styles.editItemSeparator} />

                    <View style={styles.editItemRow}>
                      <Text style={styles.editItemLabel}>Unit</Text>
                      <TextInput
                        style={styles.editItemValueInput}
                        value={editItemUnit}
                        onChangeText={setEditItemUnit}
                        placeholder="pcs"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.editItemSeparator} />

                    <View style={styles.editItemRow}>
                      <Text style={styles.editItemLabel}>Total price</Text>
                      <TextInput
                        style={styles.editItemValueInput}
                        value={editItemTotalPrice}
                        onChangeText={setEditItemTotalPrice}
                        placeholder="0.00"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  <Text style={styles.editItemHelperText}>Edit the item name, quantity, unit, and price.</Text>
                  <Text style={styles.editItemCategorySectionTitle}>Category</Text>
                  <View style={styles.editItemCategoryCard}>
                    <View style={styles.editItemRow}>
                      <Text style={styles.editItemLabel}>Category</Text>
                      <View style={styles.editItemCategoryAnchor}>
                        {isNativePickerAvailable ? (
                          <RNPickerSelect
                            onValueChange={(value) => {
                              if (typeof value === "string" && value.trim()) {
                                handleSelectEditCategory(value);
                              }
                            }}
                            items={categoryPickerItems}
                            value={editItemCategory.trim() || "General"}
                            useNativeAndroidPickerStyle={false}
                            placeholder={{ label: "Select category", value: null }}
                            Icon={() => <ChevronDown size={14} color="#6B7280" />}
                            style={{
                              viewContainer: styles.editItemPickerViewContainer,
                              iconContainer: styles.editItemPickerIconContainer,
                              inputIOS: styles.editItemPickerInput,
                              inputAndroid: styles.editItemPickerInput,
                              placeholder: styles.editItemPickerPlaceholder,
                            }}
                          />
                        ) : (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.editItemPickerFallbackButton}
                            onPress={() => setActiveFallbackPicker("category")}
                          >
                            <Text style={styles.editItemPickerFallbackText} numberOfLines={1}>
                              {editItemCategory.trim() || "General"}
                            </Text>
                            <ChevronDown size={14} color="#6B7280" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.editItemCategorySectionTitle,{ marginTop:20, marginBottom: -5}]}>Subcategory</Text>
                  <View style={styles.editItemCategoryCard}>
                    <View style={styles.editItemRow}>
                      <Text style={styles.editItemLabel}>Subcategory</Text>
                      <View style={styles.editItemSubcategoryAnchor}>
                        {isNativePickerAvailable ? (
                          <RNPickerSelect
                            onValueChange={(value) => {
                              if (typeof value === "string") {
                                handleSelectEditSubcategory(value);
                              }
                            }}
                            items={subcategoryPickerItems}
                            value={editItemSubcategory.trim()}
                            useNativeAndroidPickerStyle={false}
                            placeholder={{ label: "Not set", value: "" }}
                            Icon={() => <ChevronDown size={14} color="#6B7280" />}
                            style={{
                              viewContainer: styles.editItemPickerViewContainer,
                              iconContainer: styles.editItemPickerIconContainer,
                              inputIOS: styles.editItemPickerInput,
                              inputAndroid: styles.editItemPickerInput,
                              placeholder: styles.editItemPickerPlaceholder,
                            }}
                          />
                        ) : (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.editItemPickerFallbackButton}
                            onPress={() => setActiveFallbackPicker("subcategory")}
                          >
                            <Text style={styles.editItemPickerFallbackText} numberOfLines={1}>
                              {editItemSubcategory.trim() || "Not set"}
                            </Text>
                            <ChevronDown size={14} color="#6B7280" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.editItemActionsTitle}>Actions</Text>

                  <TouchableOpacity style={styles.editItemSaveBtn} onPress={handleSaveEditedItem} activeOpacity={0.85}>
                    <View style={styles.editItemBtnContent}>
                      <Check size={16} color="#FFFFFF" strokeWidth={2.8} />
                      <Text style={styles.editItemSaveBtnText}>Save Item</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editItemDeleteBtn} onPress={handleDeleteEditedItem} activeOpacity={0.85}>
                    <View style={styles.editItemBtnContent}>
                      <Trash2 size={16} color="#FFFFFF" strokeWidth={2.4} />
                      <Text style={styles.editItemDeleteBtnText}>Delete Item</Text>
                    </View>
                  </TouchableOpacity>
                </ScrollView>
              </Animated.View>
            </View>
          ) : null}
          <TagSearchModal
            visible={activeFallbackPicker === "category"}
            title="Select category"
            items={categoryFallbackItems}
            placeholder="Search categories"
            addLabel="Select"
            cornerRadius={26}
            saveMatchedValueOnDismiss
            dismissOnItemPress
            onAdd={(value) => {
              const normalized = value.trim();
              if (!normalized) return;
              handleSelectEditCategory(normalized);
              setActiveFallbackPicker(null);
            }}
            onDismiss={() => setActiveFallbackPicker(null)}
          />
          <TagSearchModal
            visible={activeFallbackPicker === "subcategory"}
            title="Select subcategory"
            items={subcategoryFallbackItems}
            placeholder="Search subcategories"
            addLabel="Select"
            cornerRadius={26}
            saveMatchedValueOnDismiss
            dismissOnItemPress
            onAdd={(value) => {
              const normalized = value.trim();
              if (normalized.toLowerCase() === "not set") {
                handleSelectEditSubcategory("");
              } else {
                handleSelectEditSubcategory(normalized);
              }
              setActiveFallbackPicker(null);
            }}
            onDismiss={() => setActiveFallbackPicker(null)}
          />
          {Platform.OS !== "android" && showDatePickerModal ? (
            <Modal transparent animationType="fade" visible onRequestClose={() => setShowDatePickerModal(false)}>
              <View style={styles.datePickerOverlay}>
                <View style={styles.datePickerCard}>
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity onPress={() => setShowDatePickerModal(false)} hitSlop={8}>
                      <Text style={styles.datePickerActionText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.datePickerTitle}>Select Date</Text>
                    <TouchableOpacity onPress={confirmIosDatePicker} hitSlop={8}>
                      <Text style={styles.datePickerActionText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={pendingDatePickerValue}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_event, selectedDate) => {
                      if (selectedDate) {
                        setPendingDatePickerValue(selectedDate);
                      }
                    }}
                  />
                </View>
              </View>
            </Modal>
          ) : null}
          {Platform.OS !== "android" && showTimePickerModal ? (
            <Modal transparent animationType="fade" visible onRequestClose={() => setShowTimePickerModal(false)}>
              <View style={styles.datePickerOverlay}>
                <View style={styles.datePickerCard}>
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity onPress={() => setShowTimePickerModal(false)} hitSlop={8}>
                      <Text style={styles.datePickerActionText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.datePickerTitle}>Select Time</Text>
                    <TouchableOpacity onPress={confirmIosTimePicker} hitSlop={8}>
                      <Text style={styles.datePickerActionText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={pendingTimePickerValue}
                    mode="time"
                    is24Hour
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_event, selectedDate) => {
                      if (selectedDate) {
                        setPendingTimePickerValue(selectedDate);
                      }
                    }}
                  />
                </View>
              </View>
            </Modal>
          ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSpacer: {
    width: 34,
    height: 34,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  contentScroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    alignItems: "center",
  },
  imageContainer: {
    width: "100%",
    maxWidth: 420,
    height: 320,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  receiptImage: {
    width: "100%",
    height: "100%",
  },
  noImageText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  billDetailsTitle: {
    width: "100%",
    maxWidth: 420,
    marginTop: 12,
    marginBottom: 4,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  infoCard: {
    width: "100%",
    maxWidth: 420,
    marginTop: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  checkCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  storeName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111111",
    textAlign: "center",
  },
  totalSum: {
    marginTop: 5,
    fontSize: 24,
    fontWeight: "900",
    color: "#111111",
    textAlign: "center",
  },
  totalSumRoundedBold: {
    fontFamily: "Nunito_900Black",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.1,
    lineHeight: 34,
  },
  dateText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
  },
  editDateCard: {
    width: "100%",
    maxWidth: 420,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 4,
  },
  detailsSeparator: {
    height: 1,
    backgroundColor: "#EEF0F3",
    marginVertical: 14,
  },
  detailsSeparatorLarge: {
    marginVertical: 18,
  },
  editDateLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editDateLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  editDatePillsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  editPill: {
    minWidth: 92,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  editPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    padding: 0,
  },
  editTimeText: {
    textAlign: "center",
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.24)",
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingBottom: 18,
  },
  datePickerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  datePickerHeader: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datePickerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  datePickerActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  locationValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  currencyValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemsCard: {
    width: "100%",
    maxWidth: 420,
    marginTop: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemsSectionHeader: {
    width: "100%",
    maxWidth: 420,
    marginTop: 12,
    marginBottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
  },
  itemsSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  itemsCountText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  itemsEmptyText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  itemsEntry: {
    paddingVertical: 3,
  },
  itemsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    minHeight: 56,
    paddingVertical: 4,
    gap: 12,
  },
  itemsMainCol: {
    flex: 1,
    minWidth: 0,
  },
  itemsName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  editItemOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.2)",
  },
  editItemSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "80%",
    backgroundColor: "#F8F9FA",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  editItemDragArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 8,
  },
  editItemDragHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginTop: 20,
  },
  editItemSheetHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
  },
  editItemSheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
    textAlign: "center",
  },
  editItemHeaderCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  editItemHeaderSpacer: {
    width: 34,
    height: 34,
  },
  itemsAmountWrap: {
    width: 108,
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  itemsAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    width: "100%",
  },
  itemCategoryBadge: {
    alignSelf: "flex-start",
    marginTop: 3,
    paddingHorizontal: 8,
    minHeight: 22,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
  },
  itemBadgesRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  itemSubcategoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    minHeight: 22,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EC4899",
    backgroundColor: "#FCE7F3",
    justifyContent: "center",
    maxWidth: "100%",
  },
  itemSubcategoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#BE185D",
  },
  itemCategoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  itemsSeparator: {
    height: 1,
    backgroundColor: "#EEF0F3",
    marginVertical: 4,
  },
  editItemContentScroll: {
    flex: 1,
    width: "100%",
  },
  editItemContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    alignItems: "center",
  },
  editItemSectionTitle: {
    width: "100%",
    maxWidth: 420,
    marginLeft: 25,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  editItemCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  editItemHelperText: {
    width: "100%",
    maxWidth: 420,
    marginTop: 6,
    marginLeft: 25,
    marginBottom: 20,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  editItemCategorySectionTitle: {
    width: "100%",
    maxWidth: 420,
    marginBottom: 2,
    marginLeft: 25,
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
  },
  editItemCategoryCard: {
    width: "100%",
    maxWidth: 420,
    marginTop: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  editItemNameInput: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 12,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  editItemRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editItemLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  editItemValueInput: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    minWidth: 72,
    textAlign: "right",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  editItemValueText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  editItemCategoryAnchor: {
    width: "30%",
    minWidth: 110,
    maxWidth: 170,
  },
  editItemSubcategoryAnchor: {
    width: "46%",
    minWidth: 150,
    maxWidth: 250,
  },
  editItemPickerViewContainer: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    minHeight: 34,
    justifyContent: "center",
    overflow: "hidden",
  },
  editItemPickerIconContainer: {
    top: 9,
    right: 8,
  },
  editItemPickerInput: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 26,
  },
  editItemPickerPlaceholder: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  editItemPickerFallbackButton: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    minHeight: 34,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  editItemPickerFallbackText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  editItemActionsTitle: {
    width: "100%",
    maxWidth: 420,
    marginTop: 20,
    marginLeft: 25,
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
  },
  editItemSeparator: {
    height: 1,
    backgroundColor: "#EEF0F3",
    marginVertical: 4,
  },
  editItemSaveBtn: {
    width: "100%",
    maxWidth: 420,
    marginTop: 12,
    height: 48,
    borderRadius: 100,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  editItemBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  editItemSaveBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  editItemDeleteBtn: {
    width: "100%",
    maxWidth: 420,
    marginTop: 10,
    height: 46,
    borderRadius: 100,
    backgroundColor: "#ff5050",
    alignItems: "center",
    justifyContent: "center",
  },
  editItemDeleteBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

export { ReceiptDetailModal };
