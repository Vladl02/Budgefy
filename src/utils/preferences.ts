import type { SQLiteDatabase } from "expo-sqlite";

export const DEFAULT_BASE_CURRENCY = "USD";
export const DEFAULT_LANGUAGE = "EN";

const TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS app_preferences (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );
`;

const UPSERT_SQL = `
  INSERT INTO app_preferences (key, value, updated_at)
  VALUES (?, ?, (unixepoch() * 1000))
  ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = excluded.updated_at;
`;

const KEY_BASE_CURRENCY = "base_currency";
const KEY_LANGUAGE = "language";

let hasEnsuredTable = false;

async function ensurePreferencesTable(db: SQLiteDatabase): Promise<void> {
  if (hasEnsuredTable) return;
  await db.runAsync(TABLE_SQL);
  hasEnsuredTable = true;
}

async function getPreference(
  db: SQLiteDatabase,
  key: string,
  fallback: string,
): Promise<string> {
  await ensurePreferencesTable(db);
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_preferences WHERE key = ? LIMIT 1",
    [key],
  );
  return row?.value ?? fallback;
}

async function setPreference(
  db: SQLiteDatabase,
  key: string,
  value: string,
): Promise<void> {
  await ensurePreferencesTable(db);
  await db.runAsync(UPSERT_SQL, [key, value]);
}

export async function getBaseCurrencyPreference(db: SQLiteDatabase): Promise<string> {
  return getPreference(db, KEY_BASE_CURRENCY, DEFAULT_BASE_CURRENCY);
}

export async function setBaseCurrencyPreference(db: SQLiteDatabase, currency: string): Promise<void> {
  await setPreference(db, KEY_BASE_CURRENCY, currency.toUpperCase());
}

export async function getLanguagePreference(db: SQLiteDatabase): Promise<string> {
  return getPreference(db, KEY_LANGUAGE, DEFAULT_LANGUAGE);
}

export async function setLanguagePreference(db: SQLiteDatabase, language: string): Promise<void> {
  await setPreference(db, KEY_LANGUAGE, language.toUpperCase());
}
