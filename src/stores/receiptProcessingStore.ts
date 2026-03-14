import type { ReceiptItem } from "@/src/components/Reports/types";
import { useSyncExternalStore } from "react";

type ProcessingReceiptRecord = ReceiptItem & {
  createdAtMs: number;
};

let processingState: Record<string, ProcessingReceiptRecord> = {};
let cachedSnapshot: ReceiptItem[] = [];
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const emit = () => {
  listeners.forEach((listener) => listener());
};

const toPublicReceipts = (state: Record<string, ProcessingReceiptRecord>): ReceiptItem[] =>
  Object.values(state)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .map(({ createdAtMs: _createdAtMs, ...receipt }) => receipt);

const refreshSnapshot = () => {
  cachedSnapshot = toPublicReceipts(processingState);
};

const getSnapshot = () => cachedSnapshot;

const normalizeReceiptPhotoUri = (value: string | null | undefined): string | null => {
  const raw = value?.trim();
  if (!raw) return null;

  if (
    raw.startsWith("file:") ||
    raw.startsWith("content:") ||
    raw.startsWith("ph://") ||
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:image/")
  ) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return `file://${raw}`;
  }

  return null;
};

const buildDefaultProcessingReceipt = (id: string, receiptPhotoUri: string | null): ProcessingReceiptRecord => {
  const now = new Date();
  const month = now.toLocaleDateString("en-US", { month: "short" });
  const day = now.getDate();
  const fullDate = now.toISOString().slice(0, 10);

  return {
    id,
    title: "Processing receipt...",
    date: `${month} ${day} - Scan`,
    amount: "RON 0.00",
    fullDate,
    category: "Processing",
    currency: "RON",
    comment: "Fetching name...",
    fullPage: false,
    receiptPhotoUri,
    status: "processing",
    sourceType: "receipt",
    categoryIconName: null,
    categoryColor: "#2563EB",
    createdAtMs: now.getTime(),
  };
};

export const addProcessingReceipt = (params?: {
  id?: string;
  receiptPhotoUri?: string | null;
  message?: string;
}): string => {
  const id = params?.id ?? `ghost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const receipt = buildDefaultProcessingReceipt(
    id,
    normalizeReceiptPhotoUri(params?.receiptPhotoUri),
  );
  if (params?.message?.trim()) {
    receipt.comment = params.message.trim();
  }

  processingState = {
    ...processingState,
    [id]: receipt,
  };
  refreshSnapshot();
  emit();

  return id;
};

export const updateProcessingReceipt = (id: string, patch: Partial<ReceiptItem>) => {
  const current = processingState[id];
  if (!current) return;

  const next: ProcessingReceiptRecord = {
    ...current,
    ...patch,
    receiptPhotoUri:
      patch.receiptPhotoUri !== undefined
        ? normalizeReceiptPhotoUri(patch.receiptPhotoUri)
        : current.receiptPhotoUri ?? null,
  };

  processingState = {
    ...processingState,
    [id]: next,
  };
  refreshSnapshot();
  emit();
};

export const setProcessingReceiptMessage = (id: string, message: string) => {
  updateProcessingReceipt(id, { comment: message });
};

export const markProcessingReceiptFailed = (id: string, message?: string) => {
  updateProcessingReceipt(id, {
    status: "failed",
    title: "Receipt processing failed",
    comment: message ?? "Something went wrong while analyzing this receipt.",
    category: "Error",
    categoryColor: "#DC2626",
  });
};

export const removeProcessingReceipt = (id: string) => {
  if (!(id in processingState)) return;
  const next = { ...processingState };
  delete next[id];
  processingState = next;
  refreshSnapshot();
  emit();
};

export const useProcessingReceiptsStore = () => {
  const processingReceipts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    processingReceipts,
  };
};
