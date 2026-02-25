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
import { SlidingSheet } from "@/src/components/SlidingSheet";
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
  const router = useRouter();
  const [text, setText] = useState("");
  const [items, setItems] = useState<NoteItem[]>([
    { id: '1', text: 'Milk & Eggs', isCompleted: false },
    { id: '2', text: 'Fresh Vegetables', isCompleted: true },
  ]);

  const handleDismiss = () => router.back();

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
      <SlidingSheet onDismiss={handleDismiss} heightPercent={0.85} backdropOpacity={0.4}>
        {(closeSheet) => (
          // 3. Wrap in GestureHandlerRootView for gestures to work
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.container}
            >
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>Shopping List</Text>
                  <Text style={styles.subtitle}>
                    {totalCount === 0 
                      ? "Start adding items below" 
                      : `${completedCount}/${totalCount} items bought`}
                  </Text>
                </View>
                <Pressable style={styles.iconCircle} onPress={handleOptions} disabled={items.length === 0}>
                  <MoreHorizontal size={24} color={items.length > 0 ? "#1F1F1F" : "#CCC"} />
                </Pressable>
              </View>

              {/* Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Add item..."
                  placeholderTextColor="#999"
                  value={text}
                  onChangeText={setText}
                  onSubmitEditing={addItem}
                  returnKeyType="done"
                />
                <Pressable 
                  style={[styles.addButton, !text.trim() && styles.addButtonDisabled]} 
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
                    <Text style={styles.emptyText}>Your list is empty.</Text>
                    <Text style={styles.emptySubText}>Add items to track your shopping.</Text>
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
                        <View style={[styles.itemRow, item.isCompleted && styles.itemRowCompleted]}>
                          <Pressable 
                            style={[styles.checkbox, item.isCompleted && styles.checkboxChecked]} 
                            onPress={() => toggleItem(item.id)}
                          >
                            {item.isCompleted && <Check size={14} color="white" strokeWidth={4} />}
                          </Pressable>
                          
                          <Text style={[styles.itemText, item.isCompleted && styles.itemTextCompleted]}>
                            {item.text}
                          </Text>
                          
                          {/* Visual Hint for Swipe */}
                          {item.isCompleted && (
                            <Text style={styles.swipeHint}>Swipe to delete</Text>
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
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#1F1F1F', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, fontWeight: '500' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },

  // Input
  inputContainer: { flexDirection: 'row', marginBottom: 24, gap: 12 },
  input: { flex: 1, height: 52, backgroundColor: '#F5F5F5', borderRadius: 16, paddingHorizontal: 16, fontSize: 16, color: '#1F1F1F', borderWidth: 1, borderColor: '#EFEFEF' },
  addButton: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#1F1F1F', alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  addButtonDisabled: { backgroundColor: '#E0E0E0', shadowOpacity: 0, elevation: 0 },

  // List Items
  listContent: { paddingBottom: 40 },
  itemWrapper: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' }, // Needed for swipe clipping
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, height: 60, borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  itemRowCompleted: { backgroundColor: '#F9F9F9', borderColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  checkboxChecked: { backgroundColor: '#4ADE80', borderColor: '#4ADE80' },
  
  itemText: { flex: 1, fontSize: 16, color: '#1F1F1F', fontWeight: '600' },
  itemTextCompleted: { color: '#A0A0A0', textDecorationLine: 'line-through', fontWeight: '500' },
  
  swipeHint: { fontSize: 10, color: '#CCC', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

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
  emptySubText: { fontSize: 14, color: '#666' }
});