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
  Keyboard
} from "react-native";
import { useRouter } from "expo-router";
import { SlidingSheet } from "@/src/components/SlidingSheet";
import { Plus, CreditCard, ChevronLeft, Bell, Trash2 } from 'lucide-react-native';

interface Payment {
  id: string;
  name: string;
  amount: number;
  day: string;
  color: string; 
}

// 2. Align Initial Data with the Interface (use color strings, not JSX)
const INITIAL_PAYMENTS: Payment[] = [
  { id: '1', name: 'Netflix', amount: 15.99, day: '12', color: "#E50914" },
  { id: '2', name: 'Spotify', amount: 9.99, day: '01', color: "#1DB954" },
  { id: '3', name: 'Cursor', amount: 19.99, day: '01', color: "#FFC83C" },
  { id: '4', name: 'Gym Membership', amount: 29.99, day: '20', color: "#57A7FD" },
];

const ICON_PALETTE = [
  "#57A7FD", "#FE5A59", "#FFC83C", "#00DDB7", "#7E57FF", "#FF8544", "#F472B6",
];

export default function RecurringExpense() {
  const router = useRouter();
  
  const [isAdding, setIsAdding] = useState(false);
  // 3. Explicitly type the state
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("");

  const handleDismiss = () => {
    router.back();
  };

  const handleSave = () => {
    if (!name || !amount || !day) return;

    const colorIndex = payments.length % ICON_PALETTE.length;
    const chosenColor = ICON_PALETTE[colorIndex];

    const newPayment: Payment = {
      id: Math.random().toString(),
      name,
      amount: parseFloat(amount),
      day: day.padStart(2, '0'),
      color: chosenColor, 
    };
    
    setPayments([...payments, newPayment]);
    
    setIsAdding(false);
    setName("");
    setAmount("");
    setDay("");
    Keyboard.dismiss();
  };

  const deletePayment = (id: string) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  const totalMonthly = payments.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <View style={styles.screenWrapper}>
      <SlidingSheet onDismiss={handleDismiss} heightPercent={0.85} backdropOpacity={0.4}>
        {(closeSheet) => (
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={{ flex: 1 }}
          >
            <View style={styles.container}>
              
              <View style={styles.header}>
                <View style={styles.headerSide}>
                  {isAdding && (
                    <Pressable onPress={() => setIsAdding(false)} hitSlop={10}>
                      <ChevronLeft size={24} color="#1F1F1F" />
                    </Pressable>
                  )}
                </View>
                <Text style={styles.mainTitle}>
                  {isAdding ? "Add Payment" : "Recurring"}
                </Text>
                <View style={styles.headerSide} />
              </View>

              {!isAdding ? (
                <View style={{ flex: 1 }}>
                  <Text style={styles.subtitle}>Manage your automated monthly bills</Text>
                  
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.summaryCard}>
                      <View>
                        <Text style={styles.summaryLabel}>Total Monthly Commitment</Text>
                        <Text style={styles.summaryAmount}>${totalMonthly.toFixed(2)}</Text>
                      </View>
                      <Bell size={22} color="#1F1F1F" strokeWidth={2} />
                    </View>

                    <Text style={styles.sectionHeader}>Active Subscriptions</Text>
                    
                    {payments.map((item) => (
                      <View key={item.id} style={styles.paymentItem}>
                        {/* 4. Render the Icon using the stored color string */}
                        <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                          <CreditCard size={18} color={item.color} />
                        </View>
                        <View style={styles.paymentInfo}>
                          <Text style={styles.paymentName}>{item.name}</Text>
                          <Text style={styles.paymentDate}>Due every {item.day}th</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.paymentAmount}>-${item.amount.toFixed(2)}</Text>
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
                <View style={styles.formContainer}>
                  <Text style={styles.formSubtitle}>Enter details for your new recurring expense</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Service / Bill Name</Text>
                    <TextInput 
                      style={styles.input}
                      placeholder="e.g. Rent, Gym, Disney+"
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

                  <View style={{ flex: 1 }} /> 

                  <Pressable 
                    style={[styles.saveButton, (!name || !amount || !day) && styles.saveButtonDisabled]} 
                    onPress={handleSave}
                  >
                    <Text style={styles.saveButtonText}>Confirm Payment</Text>
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
    screenWrapper: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerSide: {
    width: 40,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F1F1F",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F1F1F',
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1F1F',
  },
  paymentDate: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FE5A59',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  formContainer: {
    flex: 1,
    marginTop: 10,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  saveButton: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.3,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

});