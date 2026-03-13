export type ReceiptStatus = "processed" | "needs action" | "failed";

export interface ReceiptItem {
  id: string;
  title: string;
  date: string;
  amount: string;
  fullDate: string;
  category: string;
  currency: string;
  comment: string;
  fullPage: boolean;
  receiptPhotoUri?: string | null;
  status: ReceiptStatus;
}
