import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";

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
  const [displayMonth, setDisplayMonth] = useState(() => {
    const parsed = new Date(currentDate);
    const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const selectedDate = useMemo(() => {
    const parsed = new Date(currentDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [currentDate]);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const calendarTitle = useMemo(
    () => displayMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    [displayMonth],
  );
  const calendarCells = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { key: string; day: number | null; date: Date | null }[] = [];

    for (let i = 0; i < firstDayOfMonth; i += 1) {
      cells.push({ key: `empty-start-${i}`, day: null, date: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      cells.push({ key: `day-${year}-${month}-${day}`, day, date });
    }

    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let i = remainder; i < 7; i += 1) {
        cells.push({ key: `empty-end-${i}`, day: null, date: null });
      }
    }

    return cells;
  }, [displayMonth]);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      const parsed = new Date(currentDate);
      const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
      setDisplayMonth(new Date(base.getFullYear(), base.getMonth(), 1));
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 250, useNativeDriver: true }),
      ]).start(() => setShowModal(false));
    }
  }, [currentDate, fadeAnim, slideAnim, visible]);

  if (!showModal) return null;
  const formatIsoDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const isSameDay = (first: Date | null, second: Date | null) =>
    !!first &&
    !!second &&
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();
  const goToPreviousMonth = () =>
    setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () =>
    setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const handleSelectToday = () => {
    const today = new Date();
    onSelect(formatIsoDate(today));
  };

  return (
    <Modal visible={showModal} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[modalStyles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[pickerStyles.container, { transform: [{ translateY: slideAnim }] }]}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Select Date</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="#000" />
            </TouchableOpacity>
          </View>
          <View style={pickerStyles.monthRow}>
            <TouchableOpacity style={pickerStyles.monthNavBtn} onPress={goToPreviousMonth}>
              <ChevronLeft size={18} color="#111827" />
            </TouchableOpacity>
            <Text style={pickerStyles.monthLabel}>{calendarTitle}</Text>
            <TouchableOpacity style={pickerStyles.monthNavBtn} onPress={goToNextMonth}>
              <ChevronRight size={18} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={pickerStyles.weekHeaderRow}>
            {weekDays.map((weekday) => (
              <Text key={weekday} style={pickerStyles.weekHeaderText}>
                {weekday}
              </Text>
            ))}
          </View>

          <View style={pickerStyles.grid}>
            {calendarCells.map((cell) => {
              if (!cell.day || !cell.date) {
                return <View key={cell.key} style={pickerStyles.dayCell} />;
              }

              const isSelected = isSameDay(selectedDate, cell.date);
              const isToday = isSameDay(new Date(), cell.date);

              return (
                <TouchableOpacity
                  key={cell.key}
                  style={pickerStyles.dayCell}
                  onPress={() => onSelect(formatIsoDate(cell.date as Date))}
                >
                  <View
                    style={[
                      pickerStyles.dayPill,
                      isSelected && pickerStyles.selectedDay,
                      !isSelected && isToday ? pickerStyles.todayDay : null,
                    ]}
                  >
                    <Text
                      style={[
                        pickerStyles.dayText,
                        isSelected && pickerStyles.selectedDayText,
                        !isSelected && isToday ? pickerStyles.todayDayText : null,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={pickerStyles.todayBtn} onPress={handleSelectToday}>
            <Text style={pickerStyles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const pickerStyles = StyleSheet.create({
  container: {
    width: "90%",
    maxWidth: 430,
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
  },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  monthLabel: { fontSize: 17, color: "#111827", fontWeight: "800" },
  weekHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  weekHeaderText: {
    width: "14.2%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  dayCell: { width: "14.2%", aspectRatio: 1, justifyContent: "center", alignItems: "center" },
  dayPill: { width: "84%", aspectRatio: 1, borderRadius: 999, justifyContent: "center", alignItems: "center" },
  selectedDay: { backgroundColor: "#000000" },
  todayDay: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  dayText: { fontSize: 15, color: "#333", fontWeight: "600" },
  todayDayText: { color: "#111827", fontWeight: "800" },
  selectedDayText: { color: "#fff", fontWeight: "700" },
  todayBtn: {
    marginTop: 10,
    alignSelf: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
});

export { SimpleDatePickerModal };
