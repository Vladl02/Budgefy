import { Platform } from "react-native";
import DocumentScanner, {
  ResponseType,
  ScanDocumentResponseStatus,
} from "react-native-document-scanner-plugin";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { SQLiteDatabase } from "expo-sqlite";
import { supabase } from "@/src/utils/supabase";

const RECEIPT_ANALYZE_FUNCTION = "clever-responder";

const DEFAULT_CATEGORY_NAME = "Uncategorized";
const DEFAULT_CATEGORY_COLOR = "#8E8E93";
const DEFAULT_CATEGORY_ICON = "CircleHelp";

type SpendingContext = {
  userId: number;
  categoryId: number;
};

export type ReceiptScanResult =
  | { status: "saved"; savedCount: number }
  | { status: "cancel" }
  | { status: "no_receipt" }
  | { status: "no_user_category" }
  | { status: "unavailable_web" };

export type ReceiptScanOnlyResult =
  | { status: "success"; scannedImages: string[] }
  | { status: "cancel" }
  | { status: "no_receipt" }
  | { status: "unavailable_web" };

const resolveSpendingContext = async (db: SQLiteDatabase): Promise<SpendingContext | null> => {
  const userRow = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM users ORDER BY id ASC LIMIT 1`,
  );

  if (!userRow?.id) {
    return null;
  }

  const monthStartMs = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

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

const persistScannedReceiptAsSpending = async (
  db: SQLiteDatabase,
  receiptUri: string,
  context: SpendingContext,
): Promise<void> => {
  const receiptPhotoLink =
    receiptUri.startsWith("file:") || receiptUri.startsWith("content:") ? receiptUri : null;

  const paymentInsertResult = await db.runAsync(
    `INSERT INTO payments (sum, market_name, source_type, user_id, category_id, receipt_photo_link)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [0, "Scanned Receipt", "receipt", context.userId, context.categoryId, receiptPhotoLink],
  );

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

  const result = await DocumentScanner.scanDocument({
    responseType: ResponseType.Base64,
    croppedImageQuality: 100,
    maxNumDocuments: 1,
  });

  if (result.status === ScanDocumentResponseStatus.Cancel) {
    return { status: "cancel" };
  }

  const scannedImages = result.scannedImages ?? [];
  if (scannedImages.length === 0) {
    return { status: "no_receipt" };
  }

  return { status: "success", scannedImages };
};

export const analyzeReceiptWithSupabase = async (imageBase64: string): Promise<void> => {
  const { data, error } = await supabase.functions.invoke(RECEIPT_ANALYZE_FUNCTION, {
    body: {
      imageBase64,
      mimeType: "image/jpeg",
    },
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
      return;
    }

    console.error(`${RECEIPT_ANALYZE_FUNCTION} error:`, error);
    return;
  }

  console.log(`${RECEIPT_ANALYZE_FUNCTION} output:`, JSON.stringify(data, null, 2));
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
