import React from "react";
import { StyleSheet, Text, View } from "react-native";

type ProgressBarProps = {
  spent: number;
  total: number;
  trackColor?: string;
  fillColor?: string;
  labelColor?: string;
  leftLabelColor?: string;
};

export function ProgressBar({
  spent,
  total,
  trackColor,
  fillColor,
  labelColor,
  leftLabelColor,
}: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 0;
  const safeSpent = Math.max(spent, 0);
  const clampedSpent = safeTotal > 0 ? Math.min(safeSpent, safeTotal) : 0;
  const remaining = Math.max(safeTotal - clampedSpent, 0);
  const percentSpent = safeTotal > 0 ? clampedSpent / safeTotal : 0;
  const percentLabel = Math.round(percentSpent * 100);
  const percentLeftLabel = 100 - percentLabel;
  const labelStyle = labelColor ? { color: labelColor } : null;
  const leftLabelStyle = leftLabelColor ? { color: leftLabelColor } : null;

  return (
    <View style={[styles.progressBar, trackColor ? { backgroundColor: trackColor } : null]}>
      <View
        style={[
          styles.progressFill,
          { width: `${percentSpent * 100}%` },
          fillColor ? { backgroundColor: fillColor } : null,
        ]}
      />
      <View style={styles.progressContent}>
        <View style={styles.progressLeft}>
          <Text style={[styles.progressAmount, labelStyle, leftLabelStyle]}>RON {clampedSpent}</Text>
          <Text style={[styles.progressLabel, labelStyle, leftLabelStyle]}>{percentLabel}% Spent</Text>
        </View>
        <View style={styles.progressRight}>
          <Text style={[styles.progressAmount, labelStyle]}>RON {remaining}</Text>
          <Text style={[styles.progressLabel, labelStyle]}>{percentLeftLabel}% Left</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressBar: {
    backgroundColor: "#F1D6D6",
    paddingVertical: 6,
    paddingHorizontal: 12,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#F6B3B3",
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  progressContent: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLeft: {
    alignItems: "flex-start",
  },
  progressRight: {
    alignItems: "flex-end",
  },
  progressAmount: {
    color: "#D63A3A",
    fontWeight: "700",
  },
  progressLabel: {
    color: "#D63A3A",
    fontSize: 12,
  },
});
