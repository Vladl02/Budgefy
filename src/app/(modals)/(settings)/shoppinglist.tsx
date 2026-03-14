import React, { useState } from "react";
import { 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  LayoutAnimation,
  UIManager,
  Alert,
  Animated // Used for the swipe animation
} from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { SlidingSheet } from "@/src/components/SlidingSheet";
import { useAppTheme } from "@/src/providers/AppThemeProvider";
import { Check, Plus, MoreHorizontal, Trash2 } from "lucide-react-native";

// 1. Import Gesture Handler components
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface NoteItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export default function NotesScreen() {
  const { isDark } = useAppTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const [text, setText] = useState("");
  const [items, setItems] = useState<NoteItem[]>([
    { id: '1', text: 'Milk & Eggs', isCompleted: false },
    { id: '2', text: 'Fresh Vegetables', isCompleted: true },
  ]);

  const handleDismiss = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const parent = navigation.getParent();
    if (parent?.canGoBack()) {
      parent.goBack();
      return;
    }
    router.replace("/(tabs)/settings");
  };

  const addItem = () => {
    if (!text.trim()) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newItem: NoteItem = { id: Date.now().toString(), text: text.trim(), isCompleted: false };
    setItems([newItem, ...items]);
    setText("");
  };

  const toggleItem = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems(items.map(item => 
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    ));
  };

  const deleteItem = (id: string) => {
    // Small delay to let the animation finish before removing from state
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleOptions = () => {
    const hasItems = items.length > 0;
    if (!hasItems) return;

    Alert.alert(
      "Manage List",
      "Choose an action for your shopping list",
      [
        {
          text: "Uncheck All",
          onPress: () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setItems(items.map(i => ({...i, isCompleted: false})));
          }
        },
        {
          text: "Delete All",
          style: "destructive",
          onPress: () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setItems([]);
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  // 2. Render the "Hidden" delete action behind the row
  const renderRightActions = (progress: any, dragX: any, id: string) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.deleteActionContainer}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Trash2 size={24} color="white" />
        </Animated.View>
        <Animated.Text style={[styles.deleteActionText, { transform: [{ scale }] }]}>
          Delete
        </Animated.Text>
      </View>
    );
  };

  const completedCount = items.filter(i => i.isCompleted).length;
  const totalCount = items.length;

  return (
    <View style={styles.screenWrapper}>
      <SlidingSheet
        onDismiss={handleDismiss}
        heightPercent={0.85}
        backdropOpacity={0.4}
        sheetStyle={isDark ? styles.sheetContainerDark : undefined}
        handleStyle={isDark ? styles.sheetHandleDark : undefined}
      >
        {(closeSheet) => (
          // 3. Wrap in GestureHandlerRootView for gestures to work
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={[styles.container, isDark ? styles.containerDark : null]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={[styles.title, isDark ? styles.titleDark : null]}>Shopping List</Text>
                  <Text style={[styles.subtitle, isDark ? styles.subtitleDark : null]}>
                    {totalCount === 0 
                      ? "Start adding items below" 
                      : `${completedCount}/${totalCount} items bought`}
                  </Text>
                </View>
                <Pressable
                  style={[styles.iconCircle, isDark ? styles.iconCircleDark : null]}
                  onPress={handleOptions}
                  disabled={items.length === 0}
                >
                  <MoreHorizontal size={24} color={items.length > 0 ? (isDark ? "#F3F4F6" : "#1F1F1F") : "#CCC"} />
                </Pressable>
              </View>

              {/* Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, isDark ? styles.inputDark : null]}
                  placeholder="Add item..."
                  placeholderTextColor={isDark ? "#9CA3AF" : "#999"}
                  value={text}
                  onChangeText={setText}
                  onSubmitEditing={addItem}
                  returnKeyType="done"
                />
                <Pressable 
                  style={[
                    styles.addButton,
                    isDark ? styles.addButtonDark : null,
                    !text.trim() && styles.addButtonDisabled,
                    isDark && !text.trim() ? styles.addButtonDisabledDark : null,
                  ]} 
                  onPress={addItem}
                  disabled={!text.trim()}
                >
                  <Plus size={24} color="white" />
                </Pressable>
              </View>

              {/* List */}
              <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {items.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, isDark ? styles.emptyTextDark : null]}>Your list is empty.</Text>
                    <Text style={[styles.emptySubText, isDark ? styles.emptySubTextDark : null]}>
                      Add items to track your shopping.
                    </Text>
                  </View>
                ) : (
                  items.map((item) => (
                    // 4. Wrap row in Swipeable
                    <View key={item.id} style={styles.itemWrapper}> 
                      <Swipeable
                        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item.id)}
                        onSwipeableOpen={() => deleteItem(item.id)}
                        // 5. This is the logic: Only enabled if Completed
                        enabled={item.isCompleted} 
                        friction={2}
                      >
                        <View
                          style={[
                            styles.itemRow,
                            isDark ? styles.itemRowDark : null,
                            item.isCompleted && styles.itemRowCompleted,
                            isDark && item.isCompleted ? styles.itemRowCompletedDark : null,
                          ]}
                        >
                          <Pressable 
                            style={[
                              styles.checkbox,
                              isDark ? styles.checkboxDark : null,
                              item.isCompleted && styles.checkboxChecked,
                            ]} 
                            onPress={() => toggleItem(item.id)}
                          >
                            {item.isCompleted && <Check size={14} color="white" strokeWidth={4} />}
                          </Pressable>
                          
                          <Text
                            style={[
                              styles.itemText,
                              isDark ? styles.itemTextDark : null,
                              item.isCompleted && styles.itemTextCompleted,
                              isDark && item.isCompleted ? styles.itemTextCompletedDark : null,
                            ]}
                          >
                            {item.text}
                          </Text>
                          
                          {/* Visual Hint for Swipe */}
                          {item.isCompleted && (
                            <Text style={[styles.swipeHint, isDark ? styles.swipeHintDark : null]}>Swipe to delete</Text>
                          )}
                        </View>
                      </Swipeable>
                    </View>
                  ))
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </GestureHandlerRootView>
        )}
      </SlidingSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: "transparent" },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  containerDark: { backgroundColor: "#1C1C1D" },
  sheetContainerDark: { backgroundColor: "#1C1C1D" },
  sheetHandleDark: { backgroundColor: "#9CA3AF" },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#1F1F1F', letterSpacing: -0.5 },
  titleDark: { color: "#F9FAFB" },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, fontWeight: '500' },
  subtitleDark: { color: "#9CA3AF" },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  iconCircleDark: { backgroundColor: "#1C1C1D", borderWidth: 1, borderColor: "#2E2E2E" },

  // Input
  inputContainer: { flexDirection: 'row', marginBottom: 24, gap: 12 },
  input: { flex: 1, height: 52, backgroundColor: '#F5F5F5', borderRadius: 16, paddingHorizontal: 16, fontSize: 16, color: '#1F1F1F', borderWidth: 1, borderColor: '#EFEFEF' },
  inputDark: { backgroundColor: "#1C1C1D", borderColor: "#2E2E2E", color: "#F3F4F6" },
  addButton: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#1F1F1F', alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  addButtonDark: { backgroundColor: "#000000" },
  addButtonDisabled: { backgroundColor: '#E0E0E0', shadowOpacity: 0, elevation: 0 },
  addButtonDisabledDark: { backgroundColor: "#4B5563" },

  // List Items
  listContent: { paddingBottom: 40 },
  itemWrapper: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' }, // Needed for swipe clipping
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, height: 60, borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  itemRowDark: { backgroundColor: "#1C1C1D", borderColor: "#2E2E2E" },
  itemRowCompleted: { backgroundColor: '#F9F9F9', borderColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  itemRowCompletedDark: { backgroundColor: "#111111", borderColor: "#2E2E2E" },
  
  checkbox: { width: 24, height: 24, borderRadius: 999, borderWidth: 2, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  checkboxDark: { borderColor: "#4B5563" },
  checkboxChecked: { backgroundColor: '#4ADE80', borderColor: '#4ADE80' },
  
  itemText: { flex: 1, fontSize: 16, color: '#1F1F1F', fontWeight: '600' },
  itemTextDark: { color: "#F3F4F6" },
  itemTextCompleted: { color: '#A0A0A0', textDecorationLine: 'line-through', fontWeight: '500' },
  itemTextCompletedDark: { color: "#9CA3AF" },
  
  swipeHint: { fontSize: 10, color: '#CCC', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  swipeHintDark: { color: "#9CA3AF" },

  // Swipe Action Styles
  deleteActionContainer: {
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: '100%',
    height: '100%',
    paddingRight: 24,
    borderRadius: 16,
  },
  deleteActionText: { color: 'white', fontSize: 12, fontWeight: '700', marginTop: 4 },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, opacity: 0.6 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#1F1F1F', marginBottom: 4 },
  emptyTextDark: { color: "#F3F4F6" },
  emptySubText: { fontSize: 14, color: '#666' },
  emptySubTextDark: { color: "#9CA3AF" }
});
