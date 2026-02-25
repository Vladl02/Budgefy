import { View, Text, StyleSheet } from "react-native";
import { ShoppingBag } from "lucide-react-native";

type ReportCardProps = {
  title: string;
  date: string;
  amount: string;
  status: "processed" | "needs action" | "failed";
};

// Configuration for status colors and labels
const STATUS_CONFIG = {
  processed: {
    bg: "#E6F9EA",      // Light Green
    color: "#34C759",   // Green
    label: "Processed"
  },
  "needs action": {
    bg: "#FFF4E5",      // Light Orange
    color: "#FF9500",   // Orange
    label: "Needs Action"
  },
  failed: {
    bg: "#FFEBEE",      // Light Red
    color: "#FF3B30",   // Red
    label: "Failed"
  }
};

export default function ReportCard({ title, date, amount, status }: ReportCardProps) {
  // Get style config based on status prop, fallback to processed if undefined
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.processed;

  return (
    <View style={styles.card}>
      {/* Icon / Image Placeholder */}
      <View style={styles.iconContainer}>
        <ShoppingBag size={24} color="#7E57FF" />
      </View>

      {/* Text Info */}
      <View style={styles.textColumn}>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.metaText}>{date}</Text>
      </View>

      <View style={{ flex: 1 }} />

      {/* Right Side: Amount & Status */}
      <View style={styles.rightColumn}>
        <Text style={styles.amount}>{amount}</Text>
        
        <View style={[styles.statusRow, { backgroundColor: config.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
            <Text style={[styles.statusText, { color: config.color }]}>
              {config.label}
            </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "90%",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    // Modern Soft Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F2F2F7",
  },
  iconContainer: {
    width: 50,
    height: 50,
    backgroundColor: "#F5F3FF", // Light Purple background
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  textColumn: {
    justifyContent: "center",
    gap: 4,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  metaText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#8E8E93",
  },
  rightColumn: {
    alignItems: "flex-end",
    gap: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  }
});