import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  CheckSquare,
  ChevronRight,
  PlusCircle,
  Receipt,
  Search,
  ShoppingBag,
  Square,
  TrendingUp,
  X
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

// --- TYPES ---
interface ReceiptItem {
  id: string;
  title: string;
  date: string;
  amount: string;
  fullDate: string;
  category: string;
  currency: string;
  tax: number;
  comment: string;
  reimbursable: boolean;
  fullPage: boolean;
  status: "processed" | "needs action" | "failed";
}

// --- INITIAL DATA ---
const INITIAL_DATA: ReceiptItem[] = [
  { id: "1", title: "Media Galaxy", date: "Dec 27 · Cash", amount: "RON 429.90", fullDate: "2025-12-27", category: "Tech", currency: "RON", tax: 0, comment: "", reimbursable: false, fullPage: false, status: "processed" },
  { id: "2", title: "Kaufland", date: "Dec 21 · Card", amount: "RON 85.50", fullDate: "2025-12-21", category: "Groceries", currency: "RON", tax: 0, comment: "", reimbursable: true, fullPage: false, status: "processed" },
  { id: "3", title: "Lidl", date: "Nov 29 · Card", amount: "RON 142.40", fullDate: "2025-11-29", category: "Groceries", currency: "RON", tax: 0, comment: "", reimbursable: false, fullPage: true, status: "processed" },
  { id: "4", title: "Altex", date: "Nov 11 · Cash", amount: "RON 560", fullDate: "2025-11-11", category: "Tech", currency: "RON", tax: 0, comment: "", reimbursable: false, fullPage: false, status: "failed" },
  { id: "5", title: "Darwin", date: "Nov 8 · Card", amount: "RON 1450.69", fullDate: "2025-11-08", category: "Tech", currency: "RON", tax: 0, comment: "", reimbursable: true, fullPage: true, status: "needs action" },
  { id: "6", title: "Metro", date: "Nov 2 · Cash", amount: "RON 245.30", fullDate: "2025-11-02", category: "Wholesale", currency: "RON", tax: 0, comment: "", reimbursable: false, fullPage: false, status: "needs action" },
];

// --- MAIN SCREEN ---
export default function Reports() {
  const [receipts, setReceipts] = useState<ReceiptItem[]>(INITIAL_DATA);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  // 1. CALCULATE TOTAL SPEND DYNAMICALLY
  const totalSpend = useMemo(() => {
    const total = receipts.reduce((sum, item) => {
      // Remove non-numeric chars (except decimal point) to parse amount
      const numericAmount = parseFloat(item.amount.replace(/[^0-9.]/g, '')) || 0;
      return sum + numericAmount;
    }, 0);
    
    // Format back to currency string (e.g., "2,913.79")
    return total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [receipts]);

  // 2. SORT BY DATE (Most Recent -> Oldest)
  const sortedReceipts = useMemo(() => {
    return [...receipts].sort((a, b) => {
      return new Date(b.fullDate).getTime() - new Date(a.fullDate).getTime();
    });
  }, [receipts]);

  const filteredReceipts = useMemo(() => {
    if (activeFilter === "All") {
      return sortedReceipts;
    }

    if (activeFilter === "Needs Action") {
      return sortedReceipts.filter((receipt) => receipt.status === "needs action");
    }

    return sortedReceipts.filter((receipt) => receipt.date.includes(activeFilter));
  }, [activeFilter, sortedReceipts]);

  const handleOpenReceipt = (item: ReceiptItem) => {
    setSelectedReceipt(item);
    setModalVisible(true);
  };

  const handleSaveReceipt = (updatedItem: ReceiptItem) => {
    setReceipts((prevReceipts) => {
      // Check if item exists
      const exists = prevReceipts.find(r => r.id === updatedItem.id);
      if (exists) {
        return prevReceipts.map(r => r.id === updatedItem.id ? updatedItem : r);
      } else {
        // If it's a new item (though FAB is removed, logic remains robust)
        return [updatedItem, ...prevReceipts];
      }
    });
    setModalVisible(false);
  };

  return (
    <View style={styles.background}>
      <SafeAreaView style={{ flex: 1 }}>
        
        {/* Header & Summary */}
        <View style={styles.headerContainer}>
            <View style={styles.headerTop}>
                <Text style={styles.pageTitle}>Reports</Text>
            </View>

            {/* Summary Card with Dynamic Data */}
            <View style={styles.summaryCard}>
                <View>
                    <Text style={styles.summaryLabel}>Total Spend</Text>
                    <Text style={styles.summaryAmount}>RON {totalSpend}</Text>
                </View>
                <View style={styles.trendBadge}>
                    <TrendingUp size={14} color="#34C759" />
                    <Text style={styles.trendText}>+12%</Text>
                </View>
            </View>
        </View>

        {/* Search & Filters */}
        <View style={styles.controlsSection}>
            <View style={styles.searchBar}>
                <Search size={20} color="#8E8E93" />
                <TextInput 
                    style={styles.searchInput} 
                    placeholder="Search receipts..." 
                    placeholderTextColor="#8E8E93"
                />
            </View>

            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.filterScroll}
            >
                {["All", "Cash", "Card", "Needs Action"].map((filter) => (
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

        {/* List (Using Sorted Data) */}
        <FlatList
          data={filteredReceipts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.7} onPress={() => handleOpenReceipt(item)}>
              <ReportCard
                title={item.title}
                date={item.date}
                amount={item.amount}
                status={item.status}
              />
            </TouchableOpacity>
          )}
        />

      </SafeAreaView>

      {/* Editor Modal */}
      <ReceiptDetailModal 
        visible={modalVisible} 
        item={selectedReceipt} 
        onClose={() => setModalVisible(false)} 
        onSave={handleSaveReceipt}
      />
    </View>
  );
}

// --- COMPONENT: MODERN REPORT CARD ---
const STATUS_CONFIG = {
  processed: { bg: "#E6F9EA", color: "#34C759", label: "Processed" },
  "needs action": { bg: "#FFF4E5", color: "#FF9500", label: "Review" },
  failed: { bg: "#FFEBEE", color: "#FF3B30", label: "Failed" }
};

function ReportCard({ title, date, amount, status }: any) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.processed;
  
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.iconContainer}>
        <ShoppingBag size={22} color="#7E57FF" />
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


// --- RECEIPT DETAIL MODAL ---
function ReceiptDetailModal({ visible, item, onClose, onSave }: any) {
  const [name, setName] = useState("");
  const [dateVal, setDateVal] = useState("");
  const [price, setPrice] = useState("");
  const [tax, setTax] = useState("0.00");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("Uncategorized");
  const [preTax, setPreTax] = useState(true);
  const [isReimbursable, setIsReimbursable] = useState(false);
  const [isFullPage, setIsFullPage] = useState(false);
  const [comment, setComment] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.title);
      const rawPrice = item.amount.replace(/[^0-9.]/g, ''); 
      setPrice(rawPrice);
      const detectedCurrency = item.currency || (item.amount.includes("RON") ? "RON" : "USD");
      setCurrency(detectedCurrency);
      setDateVal(item.fullDate || "2025-12-31");
      setTax(item.tax ? item.tax.toString() : "0.00");
      setCategory(item.category || "General");
      setIsReimbursable(item.reimbursable || false);
      setIsFullPage(item.fullPage || false);
      setComment(item.comment || "");
    }
  }, [item, visible]);

  const handleSave = () => {
    const numericPrice = parseFloat(price || "0");
    const formattedAmount = `${currency} ${numericPrice.toFixed(2)}`;
    
    // Create new display date based on dateVal
    const dateObj = new Date(dateVal);
    const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const updatedItem = {
      ...item, 
      title: name, 
      fullDate: dateVal, // Crucial for sorting
      date: `${shortDate} · ${currency}`, 
      amount: formattedAmount, 
      currency, 
      tax: parseFloat(tax),
      category, 
      reimbursable: isReimbursable, 
      fullPage: isFullPage, 
      comment, 
      status: item?.status || "processed"
    };
    onSave(updatedItem);
  };

  const addTax = () => {
    const val = parseFloat(price);
    if (!isNaN(val)) setTax((val * 0.19).toFixed(2));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose}><ArrowLeft color="#fff" size={24} /></TouchableOpacity>
          <Text style={modalStyles.headerTitle}>Edit Receipt</Text>
          <TouchableOpacity onPress={handleSave}><Text style={modalStyles.saveText}>Save</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modalStyles.content}>
          <View style={modalStyles.topRow}>
            <TouchableOpacity style={modalStyles.imageBox} onPress={() => Alert.alert("Upload", "Open Camera")}>
               <Receipt color="#A1A1AA" size={32} />
               <Text style={modalStyles.imagePlaceholderText}>Receipt</Text>
            </TouchableOpacity>
            <View style={modalStyles.topInputs}>
              <View style={modalStyles.inputContainer}>
                <TextInput style={modalStyles.input} placeholder="Name" placeholderTextColor="#A1A1AA" value={name} onChangeText={setName}/>
              </View>
              <TouchableOpacity style={[modalStyles.inputContainer, { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setShowDatePicker(true)}>
                <Text style={{ fontSize: 16, color: '#8E8E93', fontWeight: '500' }}>Date</Text>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={modalStyles.purpleText}>{dateVal}</Text>
                    <CalendarIcon size={16} color="#7E57FF" style={{marginLeft: 8}} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
          <View style={modalStyles.section}>
            <View style={modalStyles.inputContainer}>
                <TextInput style={modalStyles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="Price" placeholderTextColor="#A1A1AA"/>
            </View>
          </View>
          <TouchableOpacity style={modalStyles.checkboxRow} activeOpacity={0.8} onPress={() => setPreTax(!preTax)}>
            {preTax ? <CheckSquare color="#7E57FF" size={22} /> : <Square color="#C7C7CC" size={22} />}
            <Text style={modalStyles.checkboxLabel}>Price is pre-tax</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={modalStyles.addTaxRow} onPress={addTax}>
            <PlusCircle color="#7E57FF" size={20} />
            <Text style={modalStyles.addTaxText}>Add Standard VAT (19%)</Text>
          </TouchableOpacity>
          
          <View style={modalStyles.cardBox}>
             <Text style={modalStyles.cardLabel}>Total Tax</Text>
             <TextInput style={modalStyles.cardValue} value={tax} onChangeText={setTax} keyboardType="numeric"/>
          </View>
          <TouchableOpacity style={modalStyles.cardBox} onPress={() => setShowCurrencyPicker(true)}>
             <Text style={modalStyles.cardLabel}>Currency</Text>
             <View style={{flexDirection:'row', alignItems:'center'}}>
                <Text style={[modalStyles.cardValue, modalStyles.purpleText]}>{currency}</Text>
                <ChevronRight size={16} color="#C7C7CC" style={{marginLeft: 4}} />
             </View>
          </TouchableOpacity>
          <TouchableOpacity style={modalStyles.cardBox} onPress={() => setShowCategoryPicker(true)}>
             <Text style={modalStyles.cardLabel}>Category</Text>
             <View style={{flexDirection:'row', alignItems:'center'}}>
                <Text style={modalStyles.cardValue}>{category}</Text>
                <ChevronRight size={16} color="#C7C7CC" style={{marginLeft: 4}} />
             </View>
          </TouchableOpacity>
          <View style={modalStyles.togglesRow}>
            <TouchableOpacity style={[modalStyles.toggleBox, isReimbursable && modalStyles.toggleBoxActive]} onPress={() => setIsReimbursable(!isReimbursable)}>
              <View style={[modalStyles.checkCircle, isReimbursable && modalStyles.checkCircleActive]}>
                {isReimbursable && <Check size={12} color="#fff" strokeWidth={4}/>}
              </View>
              <Text style={modalStyles.toggleText}>Reimbursable</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalStyles.toggleBox, isFullPage && modalStyles.toggleBoxActive]} onPress={() => setIsFullPage(!isFullPage)}>
              <View style={[modalStyles.checkCircle, isFullPage && modalStyles.checkCircleActive]}>
                {isFullPage && <Check size={12} color="#fff" strokeWidth={4} />}
              </View>
              <Text style={modalStyles.toggleText}>Full-Page</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <SimpleDatePickerModal visible={showDatePicker} currentDate={dateVal} onClose={() => setShowDatePicker(false)} onSelect={(d: string) => { setDateVal(d); setShowDatePicker(false); }} />
      <SelectionModal visible={showCurrencyPicker} title="Select Currency" options={["USD", "EUR", "RON", "GBP"]} selected={currency} onClose={() => setShowCurrencyPicker(false)} onSelect={(val: string) => { setCurrency(val); setShowCurrencyPicker(false); }} />
      <SelectionModal visible={showCategoryPicker} title="Select Category" options={["Groceries", "Tech", "Transport", "Bills"]} selected={category} onClose={() => setShowCategoryPicker(false)} onSelect={(val: string) => { setCategory(val); setShowCategoryPicker(false); }} />
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
    useEffect(() => {
        if (visible) {
            setShowModal(true);
            Animated.parallel([Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }), Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true })]).start();
        } else {
            Animated.parallel([Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }), Animated.timing(slideAnim, { toValue: 300, duration: 250, useNativeDriver: true })]).start(() => setShowModal(false));
        }
    }, [visible, fadeAnim, slideAnim]);
    if (!showModal) return null;
    const days = Array.from({length: 31}, (_, i) => i + 1);
    return (
        <Modal visible={showModal} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[modalStyles.overlay, { opacity: fadeAnim }]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <Animated.View style={[pickerStyles.container, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={pickerStyles.header}>
                        <Text style={pickerStyles.title}>Select Date</Text>
                        <TouchableOpacity onPress={onClose}><X size={20} color="#000" /></TouchableOpacity>
                    </View>
                    <View style={pickerStyles.grid}>
                        {days.map(day => (
                            <TouchableOpacity key={day} style={[pickerStyles.dayCell, currentDate.endsWith(`-${day.toString().padStart(2,'0')}`) && pickerStyles.selectedDay]} onPress={() => onSelect(`2025-12-${day.toString().padStart(2,'0')}`)}>
                                <Text style={[pickerStyles.dayText, currentDate.endsWith(`-${day.toString().padStart(2,'0')}`) && pickerStyles.selectedDayText]}>{day}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
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
  onClose: () => void;
  onSelect: (value: string) => void;
}
const SelectionModal = ({ visible, title, options, selected, onClose, onSelect }: SelectionModalProps) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(300)).current; 
    const [showModal, setShowModal] = useState(visible);
    useEffect(() => {
        if (visible) {
            setShowModal(true);
            Animated.parallel([Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }), Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true })]).start();
        } else {
            Animated.parallel([Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }), Animated.timing(slideAnim, { toValue: 300, duration: 250, useNativeDriver: true })]).start(() => setShowModal(false));
        }
    }, [visible, fadeAnim, slideAnim]);
    if (!showModal) return null;
    return (
        <Modal visible={showModal} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[modalStyles.overlay, { opacity: fadeAnim }]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <Animated.View style={[selectionStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={selectionStyles.header}>
                        <Text style={selectionStyles.title}>{title}</Text>
                        <TouchableOpacity onPress={onClose}><X size={24} color="#000" /></TouchableOpacity>
                    </View>
                    <ScrollView>
                        {options.map((opt: string) => (
                            <TouchableOpacity key={opt} style={[selectionStyles.option, selected === opt && selectionStyles.selectedOption]} onPress={() => onSelect(opt)}>
                                <Text style={[selectionStyles.optionText, selected === opt && selectionStyles.selectedOptionText]}>{opt}</Text>
                                {selected === opt && <Check size={20} color="#7E57FF" />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

// --- STYLES ---

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#F8F9FA" }, // Light gray background
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  summaryLabel: { fontSize: 14, color: '#8E8E93', fontWeight: '600', marginBottom: 6 },
  summaryAmount: { fontSize: 28, color: '#1A1A1A', fontWeight: '900' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F9EA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  trendText: { color: '#34C759', fontWeight: '700', fontSize: 13, marginLeft: 4 },
  
  controlsSection: { paddingHorizontal: 20, marginBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#1A1A1A' },
  filterScroll: { paddingRight: 20 },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 100,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterChipActive: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  filterTextActive: { color: '#fff' },

  listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
});

const cardStyles = StyleSheet.create({
  card: {
    width: "100%",
    paddingVertical: 18,
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
  iconContainer: { width: 48, height: 48, backgroundColor: "#F5F3FF", borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 16 },
  textColumn: { justifyContent: "center", gap: 4 },
  titleText: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  metaText: { fontSize: 13, fontWeight: "500", color: "#8E8E93" },
  rightColumn: { alignItems: "flex-end", gap: 6 },
  amount: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: "600" }
});

const pickerStyles = StyleSheet.create({
    container: { width: '85%', backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: {width:0, height:4} },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '700' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
    dayCell: { width: '14.2%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
    selectedDay: { backgroundColor: '#7E57FF' },
    dayText: { fontSize: 15, color: '#333' },
    selectedDayText: { color: '#fff', fontWeight: '700' },
});
const selectionStyles = StyleSheet.create({
    sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, elevation: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '700' },
    option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
    selectedOption: { backgroundColor: '#F5F3FF', paddingHorizontal: 10, borderRadius: 8, borderBottomWidth: 0 },
    optionText: { fontSize: 16, color: '#333' },
    selectedOptionText: { color: '#7E57FF', fontWeight: '600' },
});
const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16, backgroundColor: '#000' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 50 },
  topRow: { flexDirection: 'row', marginBottom: 20 },
  imageBox: { width: 100, height: 120, backgroundColor: '#E5E5EA', borderRadius: 12, marginRight: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D1D1D6' },
  imagePlaceholderText: { marginTop: 8, fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  topInputs: { flex: 1, justifyContent: 'space-between' },
  inputContainer: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, height: 50, justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  input: { color: '#000000', fontSize: 16, width: '100%', fontWeight: '500' },
  purpleText: { color: '#7E57FF', fontWeight: '600', textAlign: 'right' },
  section: { marginBottom: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingLeft: 4 },
  checkboxLabel: { color: '#000', marginLeft: 10, fontSize: 15, fontWeight: '500' },
  addTaxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingLeft: 4 },
  addTaxText: { color: '#7E57FF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  cardBox: { backgroundColor: '#FFFFFF', height: 50, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardLabel: { color: '#8E8E93', fontSize: 16, fontWeight: '500' },
  cardValue: { color: '#000000', fontSize: 16, fontWeight: '600', textAlign: 'right', minWidth: 50 },
  togglesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  toggleBox: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: 'transparent' },
  toggleBoxActive: { borderColor: '#000', backgroundColor: '#F5F3FF' },
  checkCircle: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#C7C7CC', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkCircleActive: { backgroundColor: '#7E57FF', borderColor: '#7E57FF' },
  toggleText: { color: '#000', fontSize: 14, fontWeight: '500' },
});
