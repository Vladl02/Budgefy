import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView, // Changed to standard React Native component
  Alert,
} from "react-native";
import {
  PiggyBank,
  TrendingUp,
  ShieldCheck,
  Target,
  Plus,
  X,
  Minus,
} from "lucide-react-native";
import { SlidingSheet } from "@/src/components/SlidingSheet";
import { useRouter } from "expo-router";

// Initial Data
const INITIAL_GOALS = [
  { id: "1", name: "Emergency Fund", current: 4500, target: 10000, color: "#00DDB7", iconName: "shield" },
  { id: "2", name: "New MacBook", current: 1200, target: 2400, color: "#7E57FF", iconName: "target" },
  { id: "3", name: "Summer Trip", current: 800, target: 3000, color: "#FFC83C", iconName: "trend" },
];

export default function SavingsManager() {
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const router = useRouter();
  
  // State for Add Goal Modal
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");

  // State for Edit/Manage Modal
  const [selectedGoal, setSelectedGoal] = useState<any>(null); // Type 'any' used for simplicity if not using TS strictly
  const [transactionAmount, setTransactionAmount] = useState("");

  const totalSaved = goals.reduce((acc, goal) => acc + goal.current, 0);

  // --- ACTIONS ---

  const handleCreateGoal = () => {
    if (!newGoalName.trim() || !newGoalTarget.trim()) {
      Alert.alert("Error", "Please fill in both fields");
      return;
    }

    const targetAmount = parseFloat(newGoalTarget);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      Alert.alert("Error", "Please enter a valid target amount");
      return;
    }

    // FIX: Ensure valid 6-digit hex color
    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;

    const newGoal = {
      id: Date.now().toString(),
      name: newGoalName,
      current: 0,
      target: targetAmount,
      color: randomColor, 
      iconName: "piggy", 
    };
    setGoals([...goals, newGoal]);
    
    // Reset and Close
    setNewGoalName("");
    setNewGoalTarget("");
    setAddModalVisible(false);
  };

  const handleDismiss = () => {
    router.back();
  };
  const handleUpdateFunds = (type: 'add' | 'withdraw') => {
    if (!transactionAmount || !selectedGoal) return;
    
    const amount = parseFloat(transactionAmount);

    // FIX: Prevent NaN errors
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid number greater than 0");
      return;
    }

    const updatedGoals = goals.map((g) => {
      if (g.id === selectedGoal.id) {
        let newCurrent = type === 'add' ? g.current + amount : g.current - amount;
        return { ...g, current: Math.max(0, newCurrent) }; // Prevent negative balance
      }
      return g;
    });

    setGoals(updatedGoals);
    setTransactionAmount("");
    setSelectedGoal(null); // Close modal
  };

  // --- RENDER HELPERS ---

  const renderIcon = (name: string, color: string, size = 24) => {
    switch (name) {
      case "shield": return <ShieldCheck size={size} color={color} />;
      case "target": return <Target size={size} color={color} />;
      case "trend": return <TrendingUp size={size} color={color} />;
      default: return <PiggyBank size={size} color={color} />;
    }
  };

  return (
    <View style={styles.screenWrapper}>
          <SlidingSheet 
            onDismiss={handleDismiss} 
            heightPercent={0.8} // Increased height for more options
            backdropOpacity={0.4}
          >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 1. HERO STATS */}
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <PiggyBank size={32} color="#1F1F1F" />
          </View>
          <Text style={styles.totalLabel}>Total Savings</Text>
          <Text style={styles.totalAmount}>${totalSaved.toLocaleString()}</Text>
        </View>

        {/* 2. GOAL PROGRESS LIST */}
        <View>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Savings Goals</Text>
          </View>

          {goals.map((goal) => {
            const progress = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
            return (
              <Pressable 
                key={goal.id} 
                style={styles.goalCard} 
                onPress={() => setSelectedGoal(goal)}
              >
                <View style={styles.goalInfo}>
                  <View style={styles.goalIconContainer}>
                    {renderIcon(goal.iconName, goal.color)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    <Text style={styles.goalSubtext}>
                      ${goal.current.toLocaleString()} of ${goal.target.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.percentageText}>{Math.round(progress)}%</Text>
                </View>
                
                {/* Progress Bar Background */}
                <View style={styles.progressBarBg}>
                  {/* Active Progress */}
                  <View style={[styles.progressBarActive, { width: `${progress}%`, backgroundColor: goal.color }]} />
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* 3. QUICK ACTION: ADD SAVINGS */}
        <Pressable style={styles.quickAddButton} onPress={() => setAddModalVisible(true)}>
          <Plus size={20} color="white" />
          <Text style={styles.quickAddText}>New Savings Goal</Text>
        </Pressable>

      </ScrollView>

      {/* --- MODAL: ADD NEW GOAL --- */}
      <Modal visible={isAddModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Goal</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Goal Name</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. New Car" 
              placeholderTextColor="#999"
              value={newGoalName}
              onChangeText={setNewGoalName}
            />

            <Text style={styles.inputLabel}>Target Amount ($)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="10000" 
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={newGoalTarget}
              onChangeText={setNewGoalTarget}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleCreateGoal}>
              <Text style={styles.saveButtonText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- MODAL: MANAGE FUNDS --- */}
      <Modal visible={!!selectedGoal} animationType="fade" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedGoal?.name}</Text>
                <Text style={styles.modalSubtitle}>Current: ${selectedGoal?.current.toLocaleString()}</Text>
              </View>
              <TouchableOpacity onPress={() => { setSelectedGoal(null); setTransactionAmount(""); }}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
               <Text style={styles.currencyPrefix}>$</Text>
               <TextInput 
                  style={styles.hugeInput} 
                  placeholder="0" 
                  placeholderTextColor="#DDD"
                  keyboardType="numeric"
                  value={transactionAmount}
                  onChangeText={setTransactionAmount}
                  autoFocus
                />
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.withdrawButton]} 
                onPress={() => handleUpdateFunds("withdraw")}
              >
                <Minus size={20} color="#FF3B30" />
                <Text style={[styles.actionText, { color: "#FF3B30" }]}>Withdraw</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.depositButton]} 
                onPress={() => handleUpdateFunds("add")}
              >
                <Plus size={20} color="#34C759" />
                <Text style={[styles.actionText, { color: "#34C759" }]}>Deposit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SlidingSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },

  screenWrapper: {
    flex: 1,
    backgroundColor: "transparent",
  },

  heroSection: {
    alignItems: 'center',
    marginVertical: 20,
  },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  totalLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  totalAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1F1F1F',
    marginTop: 4,
  },


  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1F1F',
  },

  goalCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  goalIconContainer: {
    marginRight: 16,
    padding: 10,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
  },

  goalName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1F1F',
  },

  goalSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },

  percentageText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F1F1F',
  },

  progressBarBg: {
    height: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
    overflow: 'hidden',
  },

  progressBarActive: {
    height: '100%',
    borderRadius: 4,
  },

  quickAddButton: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
    position: 'fixed',
  },

  quickAddText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F1F1F',
  },

  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },

  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F1F1F',
  },

  saveButton: {
    backgroundColor: '#000000ff',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 32,
  },

  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  // Edit Modal Specific
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },

  currencyPrefix: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1F1F1F',
    marginRight: 4,
  },

  hugeInput: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1F1F1F',
    minWidth: 100,
    textAlign: 'center',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },

  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
  },

  withdrawButton: {
    backgroundColor: '#FFF0F0',
    borderColor: '#FFDBD9',
  },

  depositButton: {
    backgroundColor: '#F0FFF4',
    borderColor: '#D9FFDF',
  },

  actionText: {
    fontSize: 16,
    fontWeight: '700',
  },

});