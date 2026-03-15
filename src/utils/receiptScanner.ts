import { supabase } from "@/src/utils/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import * as FileSystem from "expo-file-system/legacy";
import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";

const RECEIPT_ANALYZE_FUNCTION = "clever-responder";

const DEFAULT_CATEGORY_NAME = "Uncategorized";
const DEFAULT_CATEGORY_COLOR = "#8E8E93";
const DEFAULT_CATEGORY_ICON = "CircleHelp";
const DEFAULT_MIME_TYPE = "image/jpeg";
const DEFAULT_SCANNED_ITEM_NAME = "Scanned item";

type UnknownRecord = Record<string, unknown>;
type ParsedReceiptItem = {
  name: string;
  priceCents: number;
  categoryName: string | null;
  firstSubcategory: string | null;
  otherSubcategories: string[];
};
type ParsedReceiptAnalysis = {
  marketName: string | null;
  totalCents: number | null;
  paymentDate: Date | null;
  items: ParsedReceiptItem[];
};

type SpendingContext = {
  userId: number;
  categoryId: number;
};

const resolveReceiptPhotoLink = (rawValue: string | null | undefined): string | null => {
  const raw = rawValue?.trim();
  if (!raw) return null;

  if (raw.startsWith("file://")) {
    return raw;
  }
  if (raw.startsWith("file:")) {
    const normalizedPath = raw.replace(/^file:\/*/, "/");
    return `file://${normalizedPath}`;
  }
  if (raw.startsWith("content://")) {
    return raw;
  }
  if (raw.startsWith("content:")) {
    const normalizedPath = raw.replace(/^content:\/*/, "");
    return `content://${normalizedPath}`;
  }
  if (
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

const resolveImagePayloadBase64 = async (rawValue: string): Promise<string | null> => {
  const raw = rawValue.trim();
  if (!raw) return null;

  if (raw.startsWith("data:image/")) {
    const commaIndex = raw.indexOf(",");
    if (commaIndex < 0) return null;
    const payload = raw.slice(commaIndex + 1).trim();
    return payload.length > 0 ? payload : null;
  }

  const normalizedBase64 = raw.replace(/\s+/g, "");
  const isBase64Like = /^[A-Za-z0-9+/=_-]+$/.test(normalizedBase64);
  if (!raw.includes("://") && !raw.startsWith("/") && isBase64Like && normalizedBase64.length > 64) {
    return normalizedBase64;
  }

  const receiptPhotoLink = resolveReceiptPhotoLink(raw);
  if (!receiptPhotoLink) return null;

  if (receiptPhotoLink.startsWith("file://") || receiptPhotoLink.startsWith("content://")) {
    try {
      const fileBase64 = await FileSystem.readAsStringAsync(receiptPhotoLink, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const normalizedFileBase64 = fileBase64.replace(/\s+/g, "");
      return normalizedFileBase64.length > 0 ? normalizedFileBase64 : null;
    } catch (error) {
      console.error("Failed reading scanned image as base64:", error);
      return null;
    }
  }

  return null;
};

export type ReceiptScanResult =
  | { status: "saved"; savedCount: number }
  | { status: "cancel" }
  | { status: "no_receipt" }
  | { status: "no_user_category" }
  | { status: "unavailable_native" }
  | { status: "unavailable_web" };

export type ReceiptScanOnlyResult =
  | { status: "success"; scannedImages: string[] }
  | { status: "cancel" }
  | { status: "no_receipt" }
  | { status: "unavailable_native" }
  | { status: "unavailable_web" };

export type ReceiptAnalyzeResult =
  | {
      status: "saved";
      saved: {
        paymentId: number;
        paymentDateSeconds: number;
        marketName: string | null;
      };
    }
  | { status: "failed"; reason: string };

type DocumentScannerModule = {
  scanDocument: (options: {
    responseType: string;
    croppedImageQuality: number;
    maxNumDocuments: number;
  }) => Promise<{
    status?: string;
    scannedImages?: string[];
  }>;
  ResponseType?: {
    Base64?: string;
    ImageFilePath?: string;
  };
  ScanDocumentResponseStatus?: {
    Cancel?: string;
  };
};

const isDocumentScannerModule = (value: unknown): value is DocumentScannerModule => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { scanDocument?: unknown };
  return typeof candidate.scanDocument === "function";
};

const loadDocumentScannerModule = async (): Promise<DocumentScannerModule | null> => {
  try {
    const scannerImport = await import("react-native-document-scanner-plugin");
    const scannerCandidate = (scannerImport as { default?: unknown }).default ?? scannerImport;

    if (!isDocumentScannerModule(scannerCandidate)) {
      console.warn("Document scanner module loaded without scanDocument API.");
      return null;
    }

    return scannerCandidate;
  } catch (error) {
    console.warn("Document scanner native module is not available in this build:", error);
    return null;
  }
};

const resolveSpendingContext = async (db: SQLiteDatabase): Promise<SpendingContext | null> => {
  const userRow = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM users ORDER BY id ASC LIMIT 1`,
  );

  if (!userRow?.id) {
    return null;
  }

  const monthStartMs = getCurrentMonthStartMs();

  let categoryRow = await db.getFirstAsync<{ id: number }>(
    `SELECT id
     FROM categories
     WHERE user_id = ? AND month_start = ?
     ORDER BY id ASC
     LIMIT 1`,
    [userRow.id, monthStartMs],
  );

  if (!categoryRow?.id) {
    categoryRow = await db.getFirstAsync<{ id: number }>(
      `SELECT id
       FROM categories
       WHERE user_id = ?
       ORDER BY id ASC
       LIMIT 1`,
      [userRow.id],
    );
  }

  if (!categoryRow?.id) {
    const insertResult = await db.runAsync(
      `INSERT INTO categories (category_name, color, icon, month_start, user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        DEFAULT_CATEGORY_NAME,
        DEFAULT_CATEGORY_COLOR,
        DEFAULT_CATEGORY_ICON,
        monthStartMs,
        userRow.id,
      ],
    );

    const insertedCategoryId = Number(insertResult.lastInsertRowId);
    if (!Number.isFinite(insertedCategoryId) || insertedCategoryId <= 0) {
      return null;
    }

    return { userId: userRow.id, categoryId: insertedCategoryId };
  }

  return { userId: userRow.id, categoryId: categoryRow.id };
};

const getCurrentMonthStartMs = (): number =>
  new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

const isMissingSourceTypeColumnError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes("source_type") && message.includes("no column");
};

const insertPaymentWithSourceTypeFallback = async (
  db: SQLiteDatabase,
  params: {
    sumCents: number;
    marketName: string | null;
    sourceType: "manual" | "receipt";
    userId: number;
    categoryId: number;
    receiptPhotoLink: string | null;
    timedAtSeconds: number;
  },
) => {
  try {
    return await db.runAsync(
      `INSERT INTO payments (sum, market_name, source_type, user_id, category_id, receipt_photo_link, timed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        params.sumCents,
        params.marketName,
        params.sourceType,
        params.userId,
        params.categoryId,
        params.receiptPhotoLink,
        params.timedAtSeconds,
      ],
    );
  } catch (error) {
    if (!isMissingSourceTypeColumnError(error)) {
      throw error;
    }
    console.warn("payments.source_type missing, using legacy insert fallback.");
    return db.runAsync(
      `INSERT INTO payments (sum, market_name, user_id, category_id, receipt_photo_link, timed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        params.sumCents,
        params.marketName,
        params.userId,
        params.categoryId,
        params.receiptPhotoLink,
        params.timedAtSeconds,
      ],
    );
  }
};

const toRecord = (value: unknown): UnknownRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
};

const normalizeName = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const normalizeCategoryKey = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "");

const splitCategoryPath = (value: string): string[] =>
  value
    .split(/>|\/|\\|\||:|;/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const normalizeOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
};

const getStringByKeys = (record: UnknownRecord, keys: string[]): string | null => {
  for (const key of keys) {
    const normalized = normalizeOrNull(record[key]);
    if (normalized) return normalized;
  }
  return null;
};

const getNestedStringFromObjectKeys = (
  record: UnknownRecord,
  keys: string[],
  nestedKeys: string[] = ["name", "value", "label", "title"],
): string | null => {
  for (const key of keys) {
    const nestedRecord = toRecord(record[key]);
    if (!nestedRecord) continue;
    const nestedValue = getStringByKeys(nestedRecord, nestedKeys);
    if (nestedValue) return nestedValue;
  }
  return null;
};

const parseAmountToCents = (value: unknown): number | null => {
  const nestedRecord = toRecord(value);
  if (nestedRecord) {
    const nested =
      parseAmountToCents(nestedRecord.value) ??
      parseAmountToCents(nestedRecord.amount) ??
      parseAmountToCents(nestedRecord.total) ??
      parseAmountToCents(nestedRecord.price);
    if (nested !== null) {
      return nested;
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round((value + Number.EPSILON) * 100);
  }

  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "")
    .trim();
  if (!cleaned) return null;

  const numeric = Number.parseFloat(cleaned);
  if (!Number.isFinite(numeric)) return null;
  return Math.round((numeric + Number.EPSILON) * 100);
};

const parseCentsToCents = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(Math.round(value), 0);
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d-]/g, "").trim();
    if (!cleaned) return null;
    const numeric = Number.parseInt(cleaned, 10);
    if (!Number.isFinite(numeric)) return null;
    return Math.max(numeric, 0);
  }

  const nestedRecord = toRecord(value);
  if (nestedRecord) {
    return (
      parseCentsToCents(nestedRecord.value) ??
      parseCentsToCents(nestedRecord.amount) ??
      parseCentsToCents(nestedRecord.total) ??
      parseCentsToCents(nestedRecord.price)
    );
  }

  return null;
};

const getAmountByKeys = (record: UnknownRecord, keys: string[]): number | null => {
  for (const key of keys) {
    const cents = parseAmountToCents(record[key]);
    if (cents !== null) return cents;
  }
  return null;
};

const getCentsByKeys = (record: UnknownRecord, keys: string[]): number | null => {
  for (const key of keys) {
    const cents = parseCentsToCents(record[key]);
    if (cents !== null) return cents;
  }
  return null;
};

const toLocalNoonDate = (year: number, month: number, day: number): Date | null => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
};

const normalizeYearPart = (rawValue: string | undefined, fallbackYear: number): number => {
  if (!rawValue) return fallbackYear;
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) return fallbackYear;
  if (rawValue.length <= 2) {
    return parsed >= 70 ? 1900 + parsed : 2000 + parsed;
  }
  return parsed;
};

const MONTHS_BY_NAME: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const parseDateWithNamedMonth = (value: string): Date | null => {
  const nowYear = new Date().getFullYear();
  const monthFirst = value.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:,?\s+(\d{2,4}))?$/);
  if (monthFirst) {
    const month = MONTHS_BY_NAME[monthFirst[1].toLowerCase()];
    const day = Number.parseInt(monthFirst[2], 10);
    const year = normalizeYearPart(monthFirst[3], nowYear);
    if (month) {
      return toLocalNoonDate(year, month, day);
    }
  }

  const dayFirst = value.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?(?:\s+(\d{2,4}))?$/);
  if (dayFirst) {
    const day = Number.parseInt(dayFirst[1], 10);
    const month = MONTHS_BY_NAME[dayFirst[2].toLowerCase()];
    const year = normalizeYearPart(dayFirst[3], nowYear);
    if (month) {
      return toLocalNoonDate(year, month, day);
    }
  }

  return null;
};

const parseDateWithDelimiters = (value: string): Date | null => {
  const nowYear = new Date().getFullYear();
  const full = value.match(/^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})$/);
  if (full) {
    const firstRaw = full[1];
    const secondRaw = full[2];
    const thirdRaw = full[3];
    const first = Number.parseInt(firstRaw, 10);
    const second = Number.parseInt(secondRaw, 10);

    if (firstRaw.length === 4) {
      return toLocalNoonDate(first, second, Number.parseInt(thirdRaw, 10));
    }

    const year = normalizeYearPart(thirdRaw, nowYear);
    let day = first;
    let month = second;

    if (first <= 12 && second > 12) {
      month = first;
      day = second;
    } else if (first <= 12 && second <= 12) {
      // Ambiguous dates default to day/month to avoid locale-dependent parsing.
      day = first;
      month = second;
    }

    return toLocalNoonDate(year, month, day);
  }

  const noYear = value.match(/^(\d{1,2})[./-](\d{1,2})$/);
  if (noYear) {
    const first = Number.parseInt(noYear[1], 10);
    const second = Number.parseInt(noYear[2], 10);
    let day = first;
    let month = second;

    if (first <= 12 && second > 12) {
      month = first;
      day = second;
    } else if (first <= 12 && second <= 12) {
      day = first;
      month = second;
    }

    return toLocalNoonDate(nowYear, month, day);
  }

  return null;
};

const parseDateValue = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value >= 1_000_000_000_000 ? value : value * 1000;
    const parsed = new Date(ms);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [yearRaw, monthRaw, dayRaw] = trimmed.split("-");
      const year = Number.parseInt(yearRaw, 10);
      const month = Number.parseInt(monthRaw, 10);
      const day = Number.parseInt(dayRaw, 10);
      const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const delimitedDate = parseDateWithDelimiters(trimmed);
    if (delimitedDate) {
      return delimitedDate;
    }

    const namedMonthDate = parseDateWithNamedMonth(trimmed);
    if (namedMonthDate) {
      return namedMonthDate;
    }

    if (/^\d{10,13}$/.test(trimmed)) {
      const numeric = Number.parseInt(trimmed, 10);
      if (!Number.isFinite(numeric)) return null;
      const ms = trimmed.length === 13 ? numeric : numeric * 1000;
      const parsed = new Date(ms);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    // Keep a narrow fallback for explicit timestamp formats only.
    if (/[Tt]/.test(trimmed) || /(?:Z|[+-]\d{2}:?\d{2})$/.test(trimmed)) {
      const parsed = new Date(trimmed);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }

  const nestedRecord = toRecord(value);
  if (!nestedRecord) return null;

  return (
    parseDateValue(nestedRecord.value) ??
    parseDateValue(nestedRecord.date) ??
    parseDateValue(nestedRecord.datetime) ??
    parseDateValue(nestedRecord.dateTime) ??
    parseDateValue(nestedRecord.timestamp) ??
    parseDateValue(nestedRecord.purchaseDate) ??
    parseDateValue(nestedRecord.transactionDate) ??
    parseDateValue(nestedRecord.receiptDate) ??
    parseDateValue(nestedRecord.issuedAt)
  );
};

const getDateByKeys = (record: UnknownRecord, keys: string[]): Date | null => {
  for (const key of keys) {
    const parsed = parseDateValue(record[key]);
    if (parsed) return parsed;
  }
  return null;
};

const getStringArrayByKeys = (record: UnknownRecord, keys: string[]): string[] => {
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value)) {
      continue;
    }

    const normalized = value
      .map((entry) => normalizeOrNull(entry))
      .filter((entry): entry is string => !!entry);
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [];
};

const getNestedCategoryName = (value: unknown): string | null => {
  const categoryRecord = toRecord(value);
  if (!categoryRecord) return null;
  return getStringByKeys(categoryRecord, ["name", "category", "value", "label"]);
};

const getNestedSubcategoryName = (value: unknown): string | null => {
  const categoryRecord = toRecord(value);
  if (!categoryRecord) return null;
  return getStringByKeys(categoryRecord, ["subcategory", "subCategory", "firstSubcategory", "name"]);
};

const parseReceiptItem = (value: unknown): ParsedReceiptItem | null => {
  const record = toRecord(value);
  if (!record) return null;

  const classificationRecord =
    toRecord(record.classification) ??
    toRecord(record.assignment) ??
    toRecord(record.categorization) ??
    null;

  const explicitCategory = getStringByKeys(record, [
    "category",
    "categoryName",
    "assignedCategory",
    "mainCategory",
    "predictedCategory",
    "mappedCategory",
    "aiCategory",
    "bucket",
    "group",
  ]);
  const explicitSubcategory = getStringByKeys(record, [
    "subcategory",
    "subCategory",
    "subcategoryName",
    "assignedSubcategory",
    "firstSubcategory",
    "predictedSubcategory",
    "mappedSubcategory",
  ]);
  const nestedCategory = getNestedCategoryName(record.category);
  const nestedSubcategory = getNestedSubcategoryName(record.category);
  const classificationCategory = classificationRecord
    ? getStringByKeys(classificationRecord, ["category", "categoryName", "mainCategory", "name"])
    : null;
  const classificationSubcategory = classificationRecord
    ? getStringByKeys(classificationRecord, [
        "subcategory",
        "subCategory",
        "subcategoryName",
        "firstSubcategory",
      ])
    : null;
  const categoryPath = getStringByKeys(record, [
    "categoryPath",
    "category_path",
    "classificationPath",
    "classification_path",
  ]);
  const pathSegments = categoryPath ? splitCategoryPath(categoryPath) : [];

  let categoryName = explicitCategory ?? nestedCategory ?? classificationCategory ?? (pathSegments[0] ?? null);
  let firstSubcategory =
    explicitSubcategory ?? nestedSubcategory ?? classificationSubcategory ?? (pathSegments[1] ?? null);

  if (categoryName && (!firstSubcategory || firstSubcategory.length === 0)) {
    const parts = splitCategoryPath(categoryName);
    if (parts.length > 1) {
      categoryName = parts[0] ?? categoryName;
      firstSubcategory = firstSubcategory ?? parts[1] ?? null;
    }
  }

  const otherSubcategories = getStringArrayByKeys(record, [
    "otherSubcategories",
    "other_subcategories",
    "subcategories",
    "tags",
  ]).filter((entry) => !firstSubcategory || normalizeName(entry) !== normalizeName(firstSubcategory));

  const name =
    getStringByKeys(record, ["name", "product", "item", "description", "title"]) ??
    DEFAULT_SCANNED_ITEM_NAME;
  const priceCents =
    getCentsByKeys(record, [
      "priceCents",
      "price_cents",
      "amountCents",
      "amount_cents",
      "totalCents",
      "total_cents",
      "lineTotalCents",
      "line_total_cents",
    ]) ??
    getAmountByKeys(record, [
      "price",
      "amount",
      "total",
      "value",
      "lineTotal",
      "line_total",
      "itemTotal",
      "item_total",
    ]) ??
    0;

  const hasSignal = name !== DEFAULT_SCANNED_ITEM_NAME || priceCents > 0 || !!categoryName || !!firstSubcategory;
  if (!hasSignal) {
    return null;
  }

  return {
    name,
    priceCents: Math.max(priceCents, 0),
    categoryName,
    firstSubcategory,
    otherSubcategories,
  };
};

const getCandidateRoots = (raw: unknown): UnknownRecord[] => {
  const root = toRecord(raw);
  if (!root) return [];

  const roots: UnknownRecord[] = [root];
  for (const key of ["data", "result", "analysis", "receipt", "payload"]) {
    const child = toRecord(root[key]);
    if (child) roots.push(child);
  }
  return roots;
};

const getItemsFromRoot = (root: UnknownRecord): unknown[] => {
  const keys = [
    "items",
    "products",
    "lineItems",
    "line_items",
    "receiptItems",
    "receipt_items",
    "entries",
  ];
  for (const key of keys) {
    const value = root[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
};

const parseReceiptAnalysis = (raw: unknown): ParsedReceiptAnalysis => {
  let rawValue = raw;
  if (typeof rawValue === "string") {
    try {
      rawValue = JSON.parse(rawValue);
    } catch {
      rawValue = {};
    }
  }

  const roots = getCandidateRoots(rawValue);
  if (roots.length === 0) {
    return { marketName: null, totalCents: null, paymentDate: null, items: [] };
  }

  const preferredRoot = roots.find((candidate) => getItemsFromRoot(candidate).length > 0) ?? roots[0];
  const marketName =
    getStringByKeys(preferredRoot, [
      "marketName",
      "market_name",
      "merchant",
      "merchantName",
      "merchant_name",
      "store",
      "storeName",
      "store_name",
      "shop",
      "shopName",
      "shop_name",
      "vendor",
      "seller",
      "retailer",
      "businessName",
      "business_name",
    ]) ??
    roots.map((candidate) =>
      getStringByKeys(candidate, [
        "marketName",
        "market_name",
        "merchant",
        "merchantName",
        "merchant_name",
        "store",
        "storeName",
        "store_name",
        "shop",
        "shopName",
        "shop_name",
        "vendor",
        "seller",
        "retailer",
        "businessName",
        "business_name",
      ]),
    ).find((value): value is string => !!value) ??
    getNestedStringFromObjectKeys(preferredRoot, [
      "merchant",
      "merchantDetails",
      "merchant_details",
      "store",
      "storeDetails",
      "store_details",
      "shop",
      "vendor",
      "seller",
      "retailer",
      "business",
    ]) ??
    roots
      .map((candidate) =>
        getNestedStringFromObjectKeys(candidate, [
          "merchant",
          "merchantDetails",
          "merchant_details",
          "store",
          "storeDetails",
          "store_details",
          "shop",
          "vendor",
          "seller",
          "retailer",
          "business",
        ]),
      )
      .find((value): value is string => !!value) ??
    null;
  const totalCents =
    getCentsByKeys(preferredRoot, [
      "totalCents",
      "total_cents",
      "sumCents",
      "sum_cents",
      "amountCents",
      "amount_cents",
    ]) ??
    getAmountByKeys(preferredRoot, ["total", "totalAmount", "sum", "grandTotal", "amount"]) ??
    roots.map((candidate) =>
      getCentsByKeys(candidate, [
        "totalCents",
        "total_cents",
        "sumCents",
        "sum_cents",
        "amountCents",
        "amount_cents",
      ]) ??
      getAmountByKeys(candidate, ["total", "totalAmount", "sum", "grandTotal", "amount"]),
    ).find((value): value is number => value !== null) ??
    null;
  const paymentDate =
    getDateByKeys(preferredRoot, [
      "paymentDate",
      "payment_date",
      "purchaseDate",
      "purchase_date",
      "receiptDate",
      "receipt_date",
      "transactionDate",
      "transaction_date",
      "issuedAt",
      "issued_at",
      "dateTime",
      "datetime",
      "date",
      "timestamp",
    ]) ??
    roots
      .map((candidate) =>
        getDateByKeys(candidate, [
          "paymentDate",
          "payment_date",
          "purchaseDate",
          "purchase_date",
          "receiptDate",
          "receipt_date",
          "transactionDate",
          "transaction_date",
          "issuedAt",
          "issued_at",
          "dateTime",
          "datetime",
          "date",
          "timestamp",
        ]),
      )
      .find((value): value is Date => value !== null) ??
    null;

  const items = getItemsFromRoot(preferredRoot)
    .map((item) => parseReceiptItem(item))
    .filter((item): item is ParsedReceiptItem => !!item);

  return {
    marketName,
    totalCents: totalCents !== null ? Math.max(totalCents, 0) : null,
    paymentDate,
    items,
  };
};

const upsertSubcategoryPreset = async (
  db: SQLiteDatabase,
  userId: number,
  categoryName: string,
  subcategoryName: string,
): Promise<void> => {
  const normalized = normalizeName(subcategoryName);
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO subcategory_presets
      (user_id, category_name, name, normalized_name, use_count, last_used_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?)
     ON CONFLICT(user_id, category_name, normalized_name)
     DO UPDATE SET
       name = excluded.name,
       use_count = subcategory_presets.use_count + 1,
       last_used_at = excluded.last_used_at,
       is_archived = 0,
       updated_at = excluded.updated_at`,
    [userId, categoryName, subcategoryName, normalized, now, now, now],
  );
};

const persistAnalyzedReceipt = async (
  db: SQLiteDatabase,
  responseData: unknown,
  receiptPhotoLink: string | null,
): Promise<{ paymentId: number; paymentDateSeconds: number; marketName: string | null }> => {
  const context = await resolveSpendingContext(db);
  if (!context) {
    throw new Error("Cannot persist analyzed receipt: missing user/category context.");
  }

  const monthStartMs = getCurrentMonthStartMs();
  const categoryRows = await db.getAllAsync<{ id: number; categoryName: string }>(
    `SELECT id, category_name AS categoryName
     FROM categories
     WHERE user_id = ? AND month_start = ?
     ORDER BY id ASC`,
    [context.userId, monthStartMs],
  );

  const categoryByNormalizedName = new Map<string, { id: number; categoryName: string }>();
  const categoryById = new Map<number, { id: number; categoryName: string }>();
  for (const row of categoryRows) {
    const normalizedCategory = normalizeOrNull(row.categoryName);
    if (!normalizedCategory) continue;
    const category = {
      id: row.id,
      categoryName: normalizedCategory,
    };
    categoryByNormalizedName.set(normalizeCategoryKey(normalizedCategory), category);
    categoryById.set(row.id, category);
  }

  const fallbackCategory =
    categoryByNormalizedName.get(normalizeCategoryKey("Other")) ??
    categoryByNormalizedName.values().next().value ??
    { id: context.categoryId, categoryName: DEFAULT_CATEGORY_NAME };

  const resolveCategoryByName = (
    categoryName: string | null,
  ): { category: { id: number; categoryName: string }; matched: boolean } => {
    if (!categoryName) {
      return { category: fallbackCategory, matched: false };
    }

    const candidates = [categoryName, ...splitCategoryPath(categoryName)];
    for (const candidate of candidates) {
      const normalized = normalizeCategoryKey(candidate);
      if (!normalized) continue;
      const exact = categoryByNormalizedName.get(normalized);
      if (exact) {
        return { category: exact, matched: true };
      }
    }

    const normalizedInput = normalizeCategoryKey(categoryName);
    if (normalizedInput) {
      const fuzzyMatches = Array.from(categoryByNormalizedName.entries())
        .filter(([normalized]) =>
          normalized.includes(normalizedInput) || normalizedInput.includes(normalized),
        )
        .map(([, category]) => category);

      if (fuzzyMatches.length === 1) {
        return { category: fuzzyMatches[0], matched: true };
      }
    }

    return { category: fallbackCategory, matched: false };
  };

  const categoryNamesForMonth = categoryRows
    .map((row) => normalizeOrNull(row.categoryName))
    .filter((row): row is string => !!row);
  const subcategoryCandidatesByNormalized = new Map<string, Set<number>>();
  if (categoryNamesForMonth.length > 0) {
    const categoryPlaceholders = categoryNamesForMonth.map(() => "?").join(", ");
    const subcategoryRows = await db.getAllAsync<{ categoryName: string; name: string }>(
      `SELECT category_name AS categoryName, name
       FROM subcategory_presets
       WHERE user_id = ? AND is_archived = 0 AND category_name IN (${categoryPlaceholders})`,
      [context.userId, ...categoryNamesForMonth],
    );

    for (const row of subcategoryRows) {
      const categoryKey = normalizeCategoryKey(row.categoryName ?? "");
      const category = categoryByNormalizedName.get(categoryKey);
      if (!category) continue;
      const normalizedSubcategory = normalizeName(row.name ?? "");
      if (!normalizedSubcategory) continue;
      if (!subcategoryCandidatesByNormalized.has(normalizedSubcategory)) {
        subcategoryCandidatesByNormalized.set(normalizedSubcategory, new Set<number>());
      }
      subcategoryCandidatesByNormalized.get(normalizedSubcategory)?.add(category.id);
    }
  }

  const resolveCategoryForItem = (
    item: ParsedReceiptItem,
  ): { id: number; categoryName: string } => {
    const byName = resolveCategoryByName(item.categoryName);
    if (byName.matched) {
      return byName.category;
    }

    const allSubcategories = [
      item.firstSubcategory,
      ...item.otherSubcategories,
    ].map((subcategory) => normalizeName(subcategory ?? "")).filter((subcategory) => subcategory.length > 0);

    for (const normalizedSubcategory of allSubcategories) {
      const candidateIds = subcategoryCandidatesByNormalized.get(normalizedSubcategory);
      if (!candidateIds || candidateIds.size !== 1) continue;
      const onlyId = Array.from(candidateIds)[0];
      const category = categoryById.get(onlyId);
      if (category) {
        return category;
      }
    }

    return byName.category;
  };

  const parsed = parseReceiptAnalysis(responseData);
  const items = parsed.items.length > 0
    ? parsed.items.map((item) => ({ ...item }))
    : [
        {
          name: "Scanned receipt",
          priceCents: parsed.totalCents ?? 0,
          categoryName: null,
          firstSubcategory: null,
          otherSubcategories: [],
        } satisfies ParsedReceiptItem,
      ];

  const hasPositiveItemPrice = items.some((item) => item.priceCents > 0);
  if (!hasPositiveItemPrice && (parsed.totalCents ?? 0) > 0 && items.length > 0) {
    items[0].priceCents = parsed.totalCents ?? 0;
  }

  const itemsTotalCents = items.reduce((sum, item) => sum + Math.max(item.priceCents, 0), 0);
  const paymentTotalCents = parsed.totalCents ?? itemsTotalCents;
  const dominantItem = items.reduce(
    (winner, current) => (current.priceCents > winner.priceCents ? current : winner),
    items[0],
  );
  const paymentCategory = resolveCategoryForItem(dominantItem);
  const fallbackPaymentDateSeconds = Math.floor(Date.now() / 1000);
  const normalizedParsedPaymentDate = parsed.paymentDate
    ? new Date(
        parsed.paymentDate.getFullYear(),
        parsed.paymentDate.getMonth(),
        parsed.paymentDate.getDate(),
        12,
        0,
        0,
        0,
      )
    : null;
  const parsedPaymentDateSeconds = normalizedParsedPaymentDate
    ? Math.floor(normalizedParsedPaymentDate.getTime() / 1000)
    : fallbackPaymentDateSeconds;
  const paymentDateSeconds =
    Number.isFinite(parsedPaymentDateSeconds) && parsedPaymentDateSeconds > 0
      ? parsedPaymentDateSeconds
      : fallbackPaymentDateSeconds;

  const paymentInsertResult = await insertPaymentWithSourceTypeFallback(db, {
    sumCents: paymentTotalCents,
    marketName: parsed.marketName,
    sourceType: "receipt",
    userId: context.userId,
    categoryId: paymentCategory.id,
    receiptPhotoLink,
    timedAtSeconds: paymentDateSeconds,
  });

  const paymentId = Number(paymentInsertResult.lastInsertRowId);
  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    throw new Error("Failed to resolve inserted payment id for analyzed receipt.");
  }

  for (const item of items) {
    const resolvedCategory = resolveCategoryForItem(item);
    const firstSubcategory = item.firstSubcategory ?? null;
    const otherSubcategories =
      item.otherSubcategories.length > 0
        ? item.otherSubcategories.join(", ")
        : null;

    await db.runAsync(
      `INSERT INTO products (name, price, category_id, origin_type, is_placeholder, user_id, payment_id, first_subcategory, other_subcategories)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.name,
        Math.max(item.priceCents, 0),
        resolvedCategory.id,
        "receipt",
        0,
        context.userId,
        paymentId,
        firstSubcategory,
        otherSubcategories,
      ],
    );

    if (firstSubcategory) {
      await upsertSubcategoryPreset(db, context.userId, resolvedCategory.categoryName, firstSubcategory);
    }
  }

  console.log("Receipt persisted to DB:", {
    paymentId,
    paymentTotalCents,
    itemsCount: items.length,
    itemsTotalCents,
  });

  return {
    paymentId,
    paymentDateSeconds,
    marketName: parsed.marketName ?? null,
  };
};

const persistScannedReceiptAsSpending = async (
  db: SQLiteDatabase,
  receiptUri: string,
  context: SpendingContext,
): Promise<void> => {
  const receiptPhotoLink = resolveReceiptPhotoLink(receiptUri);

  const paymentInsertResult = await insertPaymentWithSourceTypeFallback(db, {
    sumCents: 0,
    marketName: "Scanned Receipt",
    sourceType: "receipt",
    userId: context.userId,
    categoryId: context.categoryId,
    receiptPhotoLink,
    timedAtSeconds: Math.floor(Date.now() / 1000),
  });

  const paymentId = Number(paymentInsertResult.lastInsertRowId);
  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    throw new Error("Failed to resolve inserted payment id for scanned receipt.");
  }

  await db.runAsync(
    `INSERT INTO products (name, price, category_id, origin_type, is_placeholder, user_id, payment_id, first_subcategory, other_subcategories)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Scanned receipt (pending extraction)",
      0,
      context.categoryId,
      "receipt",
      1,
      context.userId,
      paymentId,
      null,
      null,
    ],
  );
};

export const scanReceiptAndSaveAsSpending = async (
  db: SQLiteDatabase,
): Promise<ReceiptScanResult> => {
  const scanResult = await scanReceiptImages();
  if (scanResult.status !== "success") {
    return scanResult;
  }

  return saveScannedReceiptsAsSpending(db, scanResult.scannedImages);
};

export const scanReceiptImages = async (): Promise<ReceiptScanOnlyResult> => {
  if (Platform.OS === "web") {
    return { status: "unavailable_web" };
  }

  const documentScannerModule = await loadDocumentScannerModule();
  if (!documentScannerModule?.scanDocument) {
    return { status: "unavailable_native" };
  }

  const responseType = documentScannerModule.ResponseType?.ImageFilePath ?? "imageFilePath";
  const cancelStatus = documentScannerModule.ScanDocumentResponseStatus?.Cancel ?? "cancel";
  const result = await documentScannerModule.scanDocument({
    responseType,
    croppedImageQuality: 100,
    maxNumDocuments: 1,
  });

  if (result.status?.toLowerCase() === cancelStatus.toLowerCase()) {
    return { status: "cancel" };
  }

  const scannedImages = result.scannedImages ?? [];
  if (scannedImages.length === 0) {
    return { status: "no_receipt" };
  }

  return { status: "success", scannedImages };
};

const loadAnalysisTaxonomy = async (
  db: SQLiteDatabase,
): Promise<{ categories: Record<string, string[]> }> => {
  try {
    const userRow = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM users ORDER BY id ASC LIMIT 1`,
    );

    if (!userRow?.id) {
      return { categories: {} };
    }

    const monthStartMs = getCurrentMonthStartMs();
    const categoryRows = await db.getAllAsync<{ categoryName: string }>(
      `SELECT category_name AS categoryName
       FROM categories
       WHERE user_id = ? AND month_start = ?
       GROUP BY category_name
       ORDER BY MIN(id) ASC`,
      [userRow.id, monthStartMs],
    );

    const categoryNames = categoryRows
      .map((row) => row.categoryName?.trim())
      .filter((name): name is string => !!name);

    if (categoryNames.length === 0) {
      return { categories: {} };
    }

    const placeholders = categoryNames.map(() => "?").join(", ");
    const subcategoryRows = await db.getAllAsync<{ categoryName: string; name: string }>(
      `SELECT category_name AS categoryName, name
       FROM subcategory_presets
       WHERE user_id = ? AND is_archived = 0 AND category_name IN (${placeholders})
       ORDER BY category_name ASC,
                CASE WHEN last_used_at IS NULL THEN 1 ELSE 0 END,
                last_used_at DESC,
                use_count DESC,
                name ASC`,
      [userRow.id, ...categoryNames],
    );

    const categoriesByName: Record<string, string[]> = {};
    const seenByCategory = new Map<string, Set<string>>();

    for (const categoryName of categoryNames) {
      categoriesByName[categoryName] = [];
      seenByCategory.set(categoryName, new Set<string>());
    }

    for (const row of subcategoryRows) {
      const categoryName = row.categoryName?.trim();
      const subcategoryName = row.name?.trim();
      if (!categoryName || !subcategoryName || !(categoryName in categoriesByName)) {
        continue;
      }

      const seen = seenByCategory.get(categoryName);
      const normalized = subcategoryName.toLowerCase();
      if (!seen || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      categoriesByName[categoryName].push(subcategoryName);
    }

    return { categories: categoriesByName };
  } catch (error) {
    console.error("Failed loading taxonomy for receipt analysis:", error);
    return { categories: {} };
  }
};

export const analyzeReceiptWithSupabase = async (
  db: SQLiteDatabase,
  imageInput: string,
): Promise<ReceiptAnalyzeResult> => {
  const receiptPhotoLink = resolveReceiptPhotoLink(imageInput);
  const imageBase64 = await resolveImagePayloadBase64(imageInput);
  if (!imageBase64) {
    return { status: "failed", reason: "invalid_image_payload" };
  }
  const { categories } = await loadAnalysisTaxonomy(db);
  const payload = {
    imageBase64,
    mimeType: DEFAULT_MIME_TYPE,
    categories,
  };

  const { data, error } = await supabase.functions.invoke(RECEIPT_ANALYZE_FUNCTION, {
    body: payload,
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      let responseBody = "";
      try {
        responseBody = await error.context.text();
      } catch (readError) {
        const message = readError instanceof Error ? readError.message : String(readError);
        responseBody = `<failed to read body: ${message}>`;
      }

      console.error(`${RECEIPT_ANALYZE_FUNCTION} http error:`, {
        status: error.context.status,
        statusText: error.context.statusText,
        body: responseBody,
      });
      return { status: "failed", reason: "http_error" };
    }

    console.error(`${RECEIPT_ANALYZE_FUNCTION} error:`, error);
    return { status: "failed", reason: "invoke_error" };
  }

  console.log(
    `${RECEIPT_ANALYZE_FUNCTION} input taxonomy:`,
    JSON.stringify({ mimeType: payload.mimeType, categories: payload.categories }, null, 2),
  );
  console.log(`${RECEIPT_ANALYZE_FUNCTION} output:`, JSON.stringify(data, null, 2));

  try {
    const saved = await persistAnalyzedReceipt(db, data, receiptPhotoLink);
    return { status: "saved", saved };
  } catch (persistError) {
    console.error("Failed saving analyzed receipt output:", persistError);
    return { status: "failed", reason: "persist_error" };
  }
};

export const saveScannedReceiptsAsSpending = async (
  db: SQLiteDatabase,
  scannedImages: string[],
): Promise<ReceiptScanResult> => {
  const context = await resolveSpendingContext(db);
  if (!context) {
    return { status: "no_user_category" };
  }

  let savedCount = 0;
  for (const imageUri of scannedImages) {
    if (!imageUri) continue;
    await persistScannedReceiptAsSpending(db, imageUri, context);
    savedCount += 1;
  }

  return { status: "saved", savedCount };
};
