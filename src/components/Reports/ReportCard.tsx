import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { ReceiptText } from "lucide-react-native";

import { STATUS_CONFIG } from "./constants";

type ReportCardProps = {
  title: string;
  date: string;
  amount: string;
  status: "processed" | "needs action" | "failed";
  receiptPhotoUri?: string | null;
};

const ReportCard = React.memo(function ReportCard({
  title,
  date,
  amount,
  status,
  receiptPhotoUri,
}: ReportCardProps) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.processed;

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.iconContainer}>
        {receiptPhotoUri ? (
          <Image source={{ uri: receiptPhotoUri }} style={cardStyles.receiptImage} />
        ) : (
          <ReceiptText size={22} color="#111111" />
        )}
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
});

const cardStyles = StyleSheet.create({
  card: {
    width: "95%",
    alignSelf: "center",
    paddingVertical: 14,
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
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    overflow: "hidden",
  },
  receiptImage: {
    width: "100%",
    height: "100%",
  },
  textColumn: { justifyContent: "center", gap: 4 },
  titleText: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  metaText: { fontSize: 13, fontWeight: "500", color: "#8E8E93" },
  rightColumn: { alignItems: "flex-end", gap: 6 },
  amount: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
  statusPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: "600" },
});

export { ReportCard };
