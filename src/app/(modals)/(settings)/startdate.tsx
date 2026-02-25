import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SlidingSheet } from "@/src/components/SlidingSheet";

export default function StartDateSettings() {
  const router = useRouter();
  
  // State for both options
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState<number>(1);
  const [startOfWeek, setStartOfWeek] = useState<string>("Monday");

  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
  const weekOptions = ["Monday", "Sunday"];

  const handleDismiss = () => {
    router.back();
  };

  return (
    <View style={styles.screenWrapper}>
      <SlidingSheet 
        onDismiss={handleDismiss} 
        heightPercent={0.8} // Increased height for more options
        backdropOpacity={0.4}
      >
        {(closeSheet) => (
          <View style={styles.container}>
            <Text style={styles.mainTitle}>Calendar Settings</Text>

              
              {/* SECTION 1: START OF WEEK */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Start of Week</Text>
                <View style={styles.weekPicker}>
                  {weekOptions.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => setStartOfWeek(option)}
                      style={[
                        styles.weekButton,
                        startOfWeek === option && styles.activeButton
                      ]}
                    >
                      <Text style={[
                        styles.weekButtonText,
                        startOfWeek === option && styles.activeButtonText
                      ]}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* SECTION 2: START OF MONTH */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Start of Month</Text>
                <Text style={styles.subtitle}>Financial cycle begins on day:</Text>
                <View style={styles.grid}>
                  {daysInMonth.map((day) => {
                    const isActive = day === selectedDayOfMonth;
                    return (
                      <Pressable
                        key={day}
                        onPress={() => setSelectedDayOfMonth(day)}
                        style={[styles.dayCircle, isActive && styles.dayCircleActive]}
                      >
                        <Text style={[styles.dayText, isActive && styles.dayTextActive]}>
                          {day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              {/* SAVE BUTTON */}
              <Pressable 
                onPress={() => setTimeout(() => closeSheet(), 100)} 
                style={styles.saveButton}
              >
                <Text style={styles.saveButtonText}>Apply Settings</Text>
              </Pressable>
          </View>
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
    paddingBottom: 20, 
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F1F1F",
    marginBottom: 24,
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
  },
  /* Week Picker Styles */
  weekPicker: {
    flexDirection: 'row',
    backgroundColor: '#F3F3F3',
    borderRadius: 12,
    padding: 4,
  },
  weekButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeButton: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  weekButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  activeButtonText: {
    color: "#1F1F1F",
  },
  /* Grid Styles */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  dayCircle: {
    width: 45,
    height: 45,
    borderRadius: 12, // Switched to rounded square for a modern look
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleActive: {
    backgroundColor: "#0e16213a",
    borderWidth: 1.5,
    borderColor: "#0E1621",
  },
  dayText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  dayTextActive: {
    color: "#0E1621",
  },
  /* Action Button */
  saveButton: {
    backgroundColor: '#1F1F1F',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 0,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  }
});
