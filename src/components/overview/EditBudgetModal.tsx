import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Platform,
  FlatList,
  Alert,
  Animated,
  PanResponder,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Keyboard,
  KeyboardEvent,
} from "react-native";
import { Plus, Trash2, X, Check, ArrowLeft, Grid } from "lucide-react-native";
import { CATEGORY_STYLES, IconKey } from "@/src/components/overview/category";

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type SummaryItem = {
  id: string;
  title: string;
  spent: number;
  budget: number;
  icon: IconKey;
  color: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  initialItems: Omit<SummaryItem, 'color'>[];
  onSave: (newItems: SummaryItem[]) => void;
};

const THEME = {
  primary: "#000000",
  danger: "#FF3B30",
  background: "#FFFFFF",
  secondaryBackground: "#F2F2F7",
  textPrimary: "#000000",
  textSecondary: "#8E8E93",
  borderColor: "#E5E5EA",
};

const PRESET_COLORS = [
  "#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#00C7BE", "#30B0C7",
  "#32ADE6", "#007AFF", "#5856D6", "#AF52DE", "#FF2D55", "#A2845E",
  "#8E8E93", "#1F1F1F", "#FF5757", "#7E57FF", "#00DDB7", "#FFC83C",
];

const CATEGORY_KEYS = Object.keys(CATEGORY_STYLES) as IconKey[];

export default function EditBudgetModal({ visible, onClose, initialItems, onSave }: Props) {
  const [localItems, setLocalItems] = useState<SummaryItem[]>([]);
  
  // Interaction State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'iconPicker'>('form');

  // Form Data
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedIconKey, setSelectedIconKey] = useState<IconKey>('shopping');
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);

  // --- ANIMATION REFS ---
  const panY = useRef(new Animated.Value(0)).current;
  const keyboardPadding = useRef(new Animated.Value(0)).current;

  // --- KEYBOARD HANDLING ---
  // We manually handle padding because KeyboardAvoidingView is unreliable in PageSheet Modals
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: KeyboardEvent) => {
      Animated.timing(keyboardPadding, {
        toValue: e.endCoordinates.height,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    };

    const onHide = (e: KeyboardEvent) => {
      Animated.timing(keyboardPadding, {
        toValue: 0,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // --- PAN RESPONDER (Close on drag down) ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: Animated.event([null, { dy: panY }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          Keyboard.dismiss();
          onClose();
        } else {
          Animated.spring(panY, { toValue: 0, useNativeDriver: false, bounciness: 10 }).start();
        }
      },
    })
  ).current;

  // --- INITIALIZATION ---
  useEffect(() => {
    if (visible) {
      panY.setValue(0);
      const mappedItems = initialItems.map(item => ({
        ...item,
        color: (item as any).color || CATEGORY_STYLES[item.icon].color
      }));
      setLocalItems(JSON.parse(JSON.stringify(mappedItems)));
      resetForm();
    }
  }, [visible, initialItems]);

  const resetForm = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditingId(null);
    setIsAdding(false);
    setViewMode('form');
    setName("");
    setAmount("");
    setSelectedIconKey('shopping');
    setSelectedColor(PRESET_COLORS[0]);
    Keyboard.dismiss();
  };

  // ... (Keep existing Logic for Add, Edit, Delete, Submit - No changes needed here) ...
  const startAdding = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAdding(true);
    setEditingId(null);
    setName("");
    setAmount("");
    setSelectedIconKey('shopping');
    setSelectedColor(PRESET_COLORS[0]);
  };

  const startEditing = (item: SummaryItem) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditingId(item.id);
    setIsAdding(false);
    setName(item.title);
    setAmount(item.budget.toString());
    setSelectedIconKey(item.icon);
    setSelectedColor(item.color);
  };

  const handleDelete = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLocalItems((prev) => prev.filter((i) => i.id !== id));
    if (editingId === id) resetForm();
  };

  const handleSubmit = () => {
    if (!name.trim() || !amount.trim()) return;
    const budgetVal = parseFloat(amount);
    if (isNaN(budgetVal) || budgetVal <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid number");
      return;
    }
    const isDuplicate = localItems.some(item => {
        if (editingId && item.id === editingId) return false;
        return item.icon === selectedIconKey && item.color === selectedColor;
    });

    if (isDuplicate) {
        Alert.alert("Duplicate Category", "This Icon & Color combination already exists.");
        return;
    }

    if (editingId) {
      setLocalItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, title: name, budget: budgetVal, icon: selectedIconKey, color: selectedColor }
            : item
        )
      );
    } else {
      const newItem: SummaryItem = {
        id: Date.now().toString(),
        title: name,
        spent: 0,
        budget: budgetVal,
        icon: selectedIconKey,
        color: selectedColor,
      };
      setLocalItems([...localItems, newItem]);
    }
    resetForm(); 
  };

  const handleSaveAll = () => {
    onSave(localItems);
    onClose();
  };

  const isFormVisible = isAdding || !!editingId;

  // --- RENDERERS ---
  const renderItem = ({ item }: { item: SummaryItem }) => {
    const categoryStyle = CATEGORY_STYLES[item.icon] || CATEGORY_STYLES.shopping;
    const IconComponent = categoryStyle.Icon;
    const activeColor = item.color;
    const isEditingThis = editingId === item.id;

    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => startEditing(item)}
        style={[styles.itemCard, isEditingThis && styles.itemCardEditing]}
      >
        <View style={[styles.iconWrapper, { backgroundColor: activeColor + "20" }]}>
          <IconComponent size={20} color={activeColor} strokeWidth={2.5} />
        </View>
        <View style={styles.itemTextContainer}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemBudget}>Budget: ${item.budget.toFixed(2)}</Text>
        </View>
        
        {isEditingThis ? (
             <View style={styles.editingBadge}>
                 <Text style={styles.editingText}>Editing</Text>
             </View>
        ) : (
            <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                style={styles.deleteIconButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Trash2 size={18} color={THEME.danger} />
            </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      
      {/* Main Container is now an Animated.View.
        It listens to `keyboardPadding` to push the content up.
      */}
      <Animated.View 
        style={[
          styles.modalContainer, 
          { 
            transform: [{ translateY: panY }],
            paddingBottom: keyboardPadding 
          }
        ]}
      >
        
          <View {...panResponder.panHandlers}>
            <View style={styles.grabberBarContainer}>
                <View style={styles.grabberBar} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Budget</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* List takes all available space. When paddingBottom increases, this shrinks. */}
          <FlatList
            data={localItems}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }} 
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled" // Crucial for interacting with the form
            ListFooterComponent={
                <TouchableOpacity 
                    style={styles.addCard} 
                    onPress={startAdding}
                    activeOpacity={0.6}
                >
                    <View style={styles.addIconWrapper}>
                        <Plus size={22} color={THEME.textSecondary} />
                    </View>
                    <Text style={styles.addCardText}>Add New Category</Text>
                </TouchableOpacity>
            }
          />

          {/* Bottom Panel sits at the bottom of the "Safe" area (above keyboard) */}
          <View style={styles.bottomPanel}>
            
            {!isFormVisible ? (
                // State A: Idle
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAll}>
                    <Check size={20} color="white" style={{marginRight: 8}} strokeWidth={3}/>
                    <Text style={styles.saveBtnText}>Save All & Close</Text>
                </TouchableOpacity>
            ) : (
                // State B: Active Form
                <View>
                    {/* Header with Back Button */}
                    <View style={styles.panelHeaderRow}>
                        <TouchableOpacity 
                            onPress={() => {
                                if(viewMode === 'iconPicker') {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setViewMode('form');
                                } else {
                                    resetForm();
                                }
                            }} 
                            style={styles.backButton}
                        >
                            <ArrowLeft size={20} color={THEME.textPrimary} />
                            <Text style={styles.backText}>Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.panelTitle}>
                            {viewMode === 'iconPicker' ? "Select Icon" : (editingId ? "Edit Category" : "New Category")}
                        </Text>
                        <View style={{width: 60}} /> 
                    </View>

                    {/* SUB-VIEW 1: ICON GRID PICKER */}
                    {viewMode === 'iconPicker' && (
                         <View style={styles.gridContainer}>
                            <ScrollView contentContainerStyle={styles.gridScroll}>
                                <View style={styles.gridWrap}>
                                    {CATEGORY_KEYS.map((key) => {
                                        const style = CATEGORY_STYLES[key];
                                        const IconComp = style.Icon;
                                        const isSelected = selectedIconKey === key;
                                        return (
                                            <TouchableOpacity 
                                                key={key}
                                                style={[styles.gridItem, isSelected && { backgroundColor: selectedColor + '15', borderColor: selectedColor }]}
                                                onPress={() => {
                                                    setSelectedIconKey(key);
                                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                                    setViewMode('form');
                                                }}
                                            >
                                                <IconComp size={24} color={isSelected ? selectedColor : THEME.textSecondary} />
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            </ScrollView>
                         </View>
                    )}

                    {/* SUB-VIEW 2: INPUT FORM */}
                    {viewMode === 'form' && (
                        <View>
                            <View style={styles.selectionRow}>
                                <TouchableOpacity 
                                    style={[styles.iconSelector, { backgroundColor: selectedColor + '15', borderColor: selectedColor }]}
                                    onPress={() => {
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                        setViewMode('iconPicker');
                                    }}
                                >
                                    {(() => {
                                        const IconComp = CATEGORY_STYLES[selectedIconKey]?.Icon || CATEGORY_STYLES.shopping.Icon;
                                        return <IconComp size={28} color={selectedColor} />;
                                    })()}
                                    <View style={styles.editIconBadge}>
                                        <Grid size={10} color="white" />
                                    </View>
                                </TouchableOpacity>

                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll} keyboardShouldPersistTaps="handled">
                                    {PRESET_COLORS.map((color) => {
                                        const isSelected = selectedColor === color;
                                        return (
                                            <TouchableOpacity 
                                                key={color} 
                                                onPress={() => setSelectedColor(color)}
                                                style={[styles.swatch, isSelected && { borderColor: color, backgroundColor: color + '10', transform: [{scale: 1.1}] }]}
                                            >
                                                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: color }} />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                            
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={[styles.modernInput, { flex: 2 }]}
                                    placeholder="Name"
                                    placeholderTextColor={THEME.textSecondary}
                                    value={name}
                                    onChangeText={setName}
                                    autoFocus={true} 
                                />
                                <TextInput
                                    style={[styles.modernInput, { flex: 1 }]}
                                    placeholder="$0"
                                    placeholderTextColor={THEME.textSecondary}
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                />
                                <TouchableOpacity 
                                    style={[styles.actionButton, (!name || !amount) && styles.disabledButton]} 
                                    onPress={handleSubmit}
                                    disabled={!name || !amount}
                                >
                                    <Check size={24} color="white" strokeWidth={3} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            )}

          </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Main container needs background
  modalContainer: { flex: 1, backgroundColor: THEME.background },
  
  grabberBarContainer: { alignItems: 'center', paddingVertical: 12, backgroundColor: THEME.background },
  grabberBar: { width: 40, height: 5, backgroundColor: THEME.borderColor, borderRadius: 3 },
  
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingBottom: 20, backgroundColor: THEME.background },
  modalTitle: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  closeButton: { padding: 4, backgroundColor: THEME.secondaryBackground, borderRadius: 20 },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 20 }, 
  
  itemCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: THEME.background,
    paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12,
    borderRadius: 16, borderWidth: 1, borderColor: THEME.borderColor,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  itemCardEditing: { borderColor: THEME.primary, backgroundColor: THEME.secondaryBackground },
  iconWrapper: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 16 },
  itemTextContainer: { flex: 1 },
  itemTitle: { fontSize: 17, fontWeight: "600", color: THEME.textPrimary, marginBottom: 2 },
  itemBudget: { fontSize: 14, fontWeight: "500", color: THEME.textSecondary },
  deleteIconButton: { padding: 10, backgroundColor: THEME.danger + '15', borderRadius: 12 },
  
  editingBadge: { backgroundColor: THEME.primary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  editingText: { fontSize: 12, fontWeight: "700", color: THEME.primary },

  addCard: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 2, borderColor: THEME.borderColor, borderStyle: 'dashed',
      borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 20,
      justifyContent: 'center', backgroundColor: '#FAFAFA'
  },
  addIconWrapper: { marginRight: 8 },
  addCardText: { fontSize: 16, fontWeight: '600', color: THEME.textSecondary },

  bottomPanel: {
    padding: 24, backgroundColor: THEME.background,
    borderTopWidth: 1, borderTopColor: THEME.borderColor,
    paddingBottom: Platform.OS === 'ios' ? 24 : 24, // Reduced default padding since Animated View handles keyboard
  },
  
  panelHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  backText: { marginLeft: 4, fontSize: 16, color: THEME.textPrimary, fontWeight: '600' },
  panelTitle: { fontSize: 16, fontWeight: "700", color: THEME.textPrimary },

  selectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconSelector: {
      width: 56, height: 56, borderRadius: 18,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, marginRight: 16,
  },
  editIconBadge: {
      position: 'absolute', bottom: -6, right: -6,
      backgroundColor: THEME.primary, borderRadius: 10, padding: 4,
      borderWidth: 2, borderColor: 'white'
  },
  colorScroll: { flex: 1, padding:2 },
  swatch: {
      width: 44, height: 44, borderRadius: 14,padding: 2,
      justifyContent: 'center', alignItems: 'center',
      marginRight: 8, borderWidth: 1, borderColor: 'transparent',
      backgroundColor: '#F0F0F0'
  },

  inputRow: { flexDirection: "row", gap: 12 },
  modernInput: {
    backgroundColor: THEME.secondaryBackground, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: THEME.textPrimary,
  },
  actionButton: {
    backgroundColor: THEME.primary, borderRadius: 14, width: 54,
    justifyContent: "center", alignItems: "center",
  },
  disabledButton: { backgroundColor: THEME.textSecondary },
  
  saveBtn: {
    backgroundColor: THEME.primary, flexDirection: 'row',
    paddingVertical: 16, borderRadius: 18,
    alignItems: "center", justifyContent: 'center',
  },
  saveBtnText: { color: "white", fontSize: 17, fontWeight: "700" },

  gridContainer: { height: 250 },
  gridScroll: { paddingBottom: 20 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  gridItem: {
      width: '18%', aspectRatio: 1, 
      justifyContent: 'center', alignItems: 'center',
      margin: '1%', borderRadius: 12, borderWidth: 1, borderColor: 'transparent'
  },
});