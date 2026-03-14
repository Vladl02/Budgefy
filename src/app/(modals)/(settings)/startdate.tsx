import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { SlidingSheet } from "@/src/components/SlidingSheet";
import { useAppTheme } from "@/src/providers/AppThemeProvider";

export default function StartDateSettings() {
  const { isDark } = useAppTheme();
  const router = useRouter();
  const navigation = useNavigation();
  
  // State for both options
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState<number>(1);
  const [startOfWeek, setStartOfWeek] = useState<string>("Monday");

  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
  const weekOptions = ["Monday", "Sunday"];

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

  return (
    <View style={styles.screenWrapper}>
      <SlidingSheet 
        onDismiss={handleDismiss} 
        heightPercent={0.8} // Increased height for more options
        backdropOpacity={0.4}
        sheetStyle={isDark ? styles.sheetContainerDark : undefined}
        handleStyle={isDark ? styles.sheetHandleDark : undefined}
      >
        {(closeSheet) => (
          <View style={styles.container}>
            <Text style={[styles.mainTitle, isDark ? styles.mainTitleDark : null]}>Calendar Settings</Text>

              
              {/* SECTION 1: START OF WEEK */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, isDark ? styles.sectionTitleDark : null]}>Start of Week</Text>
                <View style={[styles.weekPicker, isDark ? styles.weekPickerDark : null]}>
                  {weekOptions.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => setStartOfWeek(option)}
                      style={[
                        styles.weekButton,
                        startOfWeek === option && styles.activeButton,
                        isDark && startOfWeek === option ? styles.activeButtonDark : null,
                      ]}
                    >
                      <Text style={[
                        styles.weekButtonText,
                        isDark ? styles.weekButtonTextDark : null,
                        startOfWeek === option && styles.activeButtonText,
                        isDark && startOfWeek === option ? styles.activeButtonTextDark : null,
                      ]}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* SECTION 2: START OF MONTH */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, isDark ? styles.sectionTitleDark : null]}>Start of Month</Text>
                <Text style={[styles.subtitle, isDark ? styles.subtitleDark : null]}>Financial cycle begins on day:</Text>
                <View style={styles.grid}>
                  {daysInMonth.map((day) => {
                    const isActive = day === selectedDayOfMonth;
                    return (
                      <Pressable
                        key={day}
                        onPress={() => setSelectedDayOfMonth(day)}
                        style={[
                          styles.dayCircle,
                          isDark ? styles.dayCircleDark : null,
                          isActive && styles.dayCircleActive,
                          isDark && isActive ? styles.dayCircleActiveDark : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isDark ? styles.dayTextDark : null,
                            isActive && styles.dayTextActive,
                            isDark && isActive ? styles.dayTextActiveDark : null,
                          ]}
                        >
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
                style={[styles.saveButton, isDark ? styles.saveButtonDark : null]}
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
  sheetContainerDark: {
    backgroundColor: "#1C1C1D",
  },
  sheetHandleDark: {
    backgroundColor: "#9CA3AF",
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F1F1F",
    marginBottom: 24,
    textAlign: "center",
  },
  mainTitleDark: {
    color: "#F9FAFB",
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
  sectionTitleDark: {
    color: "#F3F4F6",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
  },
  subtitleDark: {
    color: "#9CA3AF",
  },
  /* Week Picker Styles */
  weekPicker: {
    flexDirection: 'row',
    backgroundColor: '#F3F3F3',
    borderRadius: 12,
    padding: 4,
  },
  weekPickerDark: {
    backgroundColor: "#1C1C1D",
    borderWidth: 1,
    borderColor: "#2E2E2E",
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
  activeButtonDark: {
    backgroundColor: "#111111",
    shadowOpacity: 0,
    elevation: 0,
  },
  weekButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  weekButtonTextDark: {
    color: "#D1D5DB",
  },
  activeButtonText: {
    color: "#1F1F1F",
  },
  activeButtonTextDark: {
    color: "#F9FAFB",
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
  dayCircleDark: {
    backgroundColor: "#1C1C1D",
    borderWidth: 1,
    borderColor: "#2E2E2E",
  },
  dayCircleActive: {
    backgroundColor: "#0e16213a",
    borderWidth: 1.5,
    borderColor: "#0E1621",
  },
  dayCircleActiveDark: {
    backgroundColor: "#111111",
    borderColor: "#4B5563",
  },
  dayText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  dayTextDark: {
    color: "#F3F4F6",
  },
  dayTextActive: {
    color: "#0E1621",
  },
  dayTextActiveDark: {
    color: "#FFFFFF",
  },
  /* Action Button */
  saveButton: {
    backgroundColor: '#1F1F1F',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 0,
  },
  saveButtonDark: {
    backgroundColor: "#000000",
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  }
});
