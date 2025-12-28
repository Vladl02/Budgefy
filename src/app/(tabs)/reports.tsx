import React, { useRef, useState } from "react";
import { View, Text, FlatList, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeArea } from "@/src/components/SafeArea";
import ReportCard from "@/src/components/Reports/ReportsCard";
import ReportsDropdown from "@/src/components/Reports/ReportsDropdown";
import { ChevronDown } from "lucide-react-native";

const DATA = [
  { id: "1", title: "Media Galaxy", date: "Dec 27 · Cash", amount: "RON 429.90" },
  { id: "2", title: "Kaufland", date: "Dec 21 · Card", amount: "RON 85.50" },
  { id: "3", title: "Lidl", date: "Nov 29 · Card", amount: "RON 142.40" },
  { id: "4", title: "Altex", date: "Nov 11 · Cash", amount: "RON 560" },
  { id: "5", title: "Darwin", date: "Nov 8 · Card", amount: "RON 1450.69" },
  { id: "6", title: "Metro", date: "Nov 2 · Cash", amount: "RON 245.30" },
];

export default function Reports() {
  const [expenseType, setExpenseType] = useState<"Cash" | "Card">("Cash");
  const [range, setRange] = useState<"This Week" | "Last Week" | "This Month">("This Week");
  const [date, setDate] = useState<"None" | "Last Week" | "This Month">("None");
  const scrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef(0);

  const scrollIntoViewThenOpen = (trigger: any, open: () => void) => {
    const sv: any = scrollRef.current;

    // If we can't measure, just open.
    if (
      !trigger ||
      !sv ||
      typeof trigger.measureInWindow !== "function" ||
      typeof sv.measureInWindow !== "function"
    ) {
      open();
      return;
    }

    const padding = 20;

    // Measure both trigger and scrollview in window coords.
    trigger.measureInWindow((tx: number, _ty: number, tw: number) => {
      sv.measureInWindow((sx: number, _sy: number, sw: number) => {
        const left = tx - sx;
        const right = left + tw;

        const fullyVisible = left >= padding && right <= sw - padding;

        if (!fullyVisible) {
          // Scroll so the trigger starts near left padding.
          const targetX = Math.max(scrollXRef.current + left - padding, 0);
          sv.scrollTo({ x: targetX, animated: true });
          setTimeout(open, 220);
          return;
        }

        open();
      });
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={styles.background}>
      <SafeArea>
        <Text style={styles.title}>Reports</Text>

        {/* header */}
        <View>
          <View style={styles.search}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for something"
              placeholderTextColor="rgba(0,0,0,0.6)"
              returnKeyType="search"
            />
          </View>

          <View style={styles.filtersRow}>
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ overflow: "visible" }} // for shadows
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingVertical: 6,
                alignItems: "center",
              }}
              onScroll={(e) => {
                scrollXRef.current = e.nativeEvent.contentOffset.x;
              }}
              scrollEventThrottle={16}
            >
            
            <ReportsDropdown
              label="Expense"
              value={expenseType}
              options={["Cash", "Card"]}
              onSelect={(v) => setExpenseType(v as "Cash" | "Card")}
              beforeOpen={(trigger, open) => scrollIntoViewThenOpen(trigger, open)}
            />
            <ReportsDropdown
              label="Range"
              value={range}
              options={["This Week", "Last Week", "This Month"]}
              onSelect={(v) => setRange(v as "This Week" | "Last Week" | "This Month")}
              beforeOpen={(trigger, open) => scrollIntoViewThenOpen(trigger, open)}
            />
            {/* To be set up */}
            <ReportsDropdown
              label="Date"
              value={date}
              options={["None", "Last Week", "This Month"]}
              onSelect={(v) => setDate(v as "None" | "Last Week" | "This Month")}
              beforeOpen={(trigger, open) => scrollIntoViewThenOpen(trigger, open)}
            />
            </ScrollView>
          </View>
        </View>

        <FlatList
          data={DATA}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReportCard
              title={item.title}
              date={item.date}
              amount={item.amount}
            />
          )}
        />
      </SafeArea>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#ffffffff",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    paddingLeft: 20,
    paddingBottom: 20,
  },
  search: {
    width: "90%",
    height: 45,            
    backgroundColor: 'rgba(149, 149, 149, 0.52)',
    borderRadius: 30,
    alignSelf: 'center',
    marginBottom: 10,
    justifyContent: 'center',
},
  searchText:{
    fontSize: 17,
    fontWeight: 700,
    marginLeft: 10
  },
  filtersRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 20,
  },

    expenseText:{
    fontSize: 15,
    fontWeight: 500,
  },
  range: {
    width: 90,
    height: 30,
    backgroundColor: 'rgba(149, 149, 149, 0.52)',
    borderRadius: 30,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  rangeText: {
    fontSize: 15,
    fontWeight: 500,
    marginLeft: 5,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  date: {
    width: 70,
    height: 30,
    backgroundColor: 'rgba(149, 149, 149, 0.52)',
    borderRadius: 30,
    justifyContent: 'center',
    flexDirection: 'row',
    
  },
  dateText:{
    fontSize: 15,
    fontWeight: 500,
    marginLeft: 10
  },
  card1: {
    width: '90%',
    height: 80,
    borderRadius: 15,
    backgroundColor: '#5E6C37',
    alignSelf: 'center',
    flexDirection: 'row',        
    alignItems: 'center',               
},
  cardText: {
    fontSize: 15,
    fontWeight: 900,
    color: '#FEFADF'
},
  photo:{
    width:70,
    height:70,
    backgroundColor: 'white',
    borderRadius: 10,
    marginLeft: 5,
  },
  textColumn: {
  marginLeft: 10,
  justifyContent: 'center',
},

metaText: {
  fontSize: 12,
  fontWeight: 600,
  color: '#EAE8C7',
  marginBottom: 2,
},
amountText: {
  fontSize: 15,
  fontWeight: 900,
  color: '#FEFADF',
  alignSelf: 'flex-end',
  marginBottom: 12,
  marginRight: 12,
},
statusBox: {
  width: 110,
  height: 30,
  borderWidth: 1,
  borderColor: '#fff',
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 8,
  marginBottom: 10,
  marginRight: 10,
},
status: {
  color: 'white',
  fontWeight: '900',
  fontSize: 13,
},
searchInput: {
  fontSize: 17,
  fontWeight: "700",
  marginLeft: 10,
}, 
});