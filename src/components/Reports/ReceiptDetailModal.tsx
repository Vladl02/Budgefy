import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
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
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Info,
  ReceiptText,
  X,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { STATUS_CONFIG } from "./constants";
import type { ReceiptItem } from "./types";
import { SelectionModal } from "./SelectionModal";
import { SimpleDatePickerModal } from "./SimpleDatePickerModal";

const CURRENCY_OPTIONS = ["USD", "EUR", "RON", "GBP"];

type ReceiptDetailModalProps = {
  visible: boolean;
  item: ReceiptItem | null;
  categoryOptions: string[];
  categoryAccentMap: Record<string, string>;
  onClose: () => void;
  onSave: (updatedItem: ReceiptItem) => void;
};

function ReceiptDetailModal({
  visible,
  item,
  categoryOptions,
  categoryAccentMap,
  onClose,
  onSave,
}: ReceiptDetailModalProps) {
  const insets = useSafeAreaInsets();
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
  const selectedCategoryColor = categoryAccentMap[category] ?? "#D1D5DB";

  const handleSave = () => {
    if (!item) {
      return;
    }

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
      status: item.status,
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
  const notifySuccess = () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

  const pickReceiptPhoto = async (source: "camera" | "gallery"): Promise<string | null> => {
    if (source === "camera") {
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
      return !result.canceled && result.assets.length > 0 ? result.assets[0].uri : null;
    }

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
    return !result.canceled && result.assets.length > 0 ? result.assets[0].uri : null;
  };

  const updateReceiptPhoto = async (source: "camera" | "gallery") => {
    const uri = await pickReceiptPhoto(source);
    if (uri) {
      setReceiptPhotoUri(uri);
      await notifySuccess();
    }
  };

  const updatePreviewPhoto = async (source: "camera" | "gallery") => {
    const uri = await pickReceiptPhoto(source);
    if (uri) {
      setPreviewPhotoUri(uri);
      await notifySuccess();
    }
  };

  const handleReceiptPress = () => {
    void Haptics.selectionAsync().catch(() => undefined);

    if (!receiptPhotoUri) {
      Alert.alert("Add Receipt", "Choose how you want to attach the receipt.", [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: () => void updateReceiptPhoto("camera") },
        { text: "Choose from Gallery", onPress: () => void updateReceiptPhoto("gallery") },
      ]);
      return;
    }

    setPreviewPhotoUri(receiptPhotoUri);
    setShowReceiptPreview(true);
  };
  const closeWithDrag = useCallback(() => {
    Animated.timing(sheetTranslateY, {
      toValue: 700,
      duration: 180,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, sheetTranslateY]);
  const springBackAfterDrag = useCallback(() => {
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  }, [sheetTranslateY]);
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
    [closeWithDrag, sheetTranslateY, springBackAfterDrag],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      allowSwipeDismissal
      onRequestClose={onClose}
    >
      <Animated.View style={[editStyles.container, { transform: [{ translateY: sheetTranslateY }] }]}>
        {/* Header */}
        <View style={[editStyles.header, { paddingTop: insets.top }]} {...dragResponder.panHandlers}>
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

          <View style={{ height: 90 + insets.bottom }} />
        </ScrollView>

        {/* Sticky bottom Save bar */}
        <View style={[editStyles.bottomBar, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
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
        options={CURRENCY_OPTIONS}
        selected={currency}
        variant="currency"
        onClose={() => setShowCurrencyPicker(false)}
        onSelect={(val: string) => {
          setCurrency(val);
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
              onPress={() => void updatePreviewPhoto("camera")}
            >
              <Text style={editStyles.receiptPreviewActionText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={editStyles.receiptPreviewActionBtn}
              onPress={() => void updatePreviewPhoto("gallery")}
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

const editStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
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

export { ReceiptDetailModal };
