import type { ReceiptStatus } from "./types";

export const STATUS_CONFIG: Record<ReceiptStatus, { bg: string; color: string; label: string }> = {
  processed: { bg: "#E6F9EA", color: "#34C759", label: "Processed" },
  processing: { bg: "#E8F1FF", color: "#2563EB", label: "Processing" },
  "needs action": { bg: "#FFF4E5", color: "#FF9500", label: "Review" },
  failed: { bg: "#FFEBEE", color: "#FF3B30", label: "Failed" },
};
