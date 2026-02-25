import type { SQLiteDatabase } from "expo-sqlite";

export const DEFAULT_SUBCATEGORY_OPTIONS = [
  "Food",
  "Drinks",
  "Snacks",
  "Travel",
  "Home",
  "Other",
  "Health",
  "Pets",
];

export const DEFAULT_SHOP_OPTIONS = [
  "Tucano",
  "Careffour",
  "Esushi",
  "Altex",
  "Linela",
  "KFC",
  "Dodo",
  "Amazon",
];

export type RecommendationType = "subcategory" | "shop";
type PresetTable = "subcategory_presets" | "shop_presets";
type RecommendationRow = {
  userId?: number;
  categoryName?: string;
  name?: string;
};
type CategoryPaletteRow = {
  id?: number;
  userId?: number;
  categoryName?: string;
  color?: string;
};

const recommendationCache = {
  subcategories: new Map<string, string[]>(),
  shops: new Map<string, string[]>(),
};
const categoryColorCache = {
  byCategoryId: new Map<number, string>(),
  byRecommendationKey: new Map<string, string>(),
};
const inFlightPreloads = new Map<string, Promise<void>>();
let bootstrapRequest: Promise<void> | null = null;
const DEFAULT_CATEGORY_COLOR = "#36A8FF";

export const normalizeRecommendationName = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

export const buildOrderedUniqueNames = (names: string[], fallback: string[] = []): string[] => {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const raw of names) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const normalized = normalizeRecommendationName(trimmed);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    ordered.push(trimmed);
  }

  for (const raw of fallback) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const normalized = normalizeRecommendationName(trimmed);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    ordered.push(trimmed);
  }

  return ordered;
};

export const createRecommendationKey = (userId: number, categoryName: string): string =>
  `${userId}|${normalizeRecommendationName(categoryName)}`;

export const hasWarmRecommendations = (key: string): boolean =>
  recommendationCache.subcategories.has(key) && recommendationCache.shops.has(key);

export const getCachedRecommendationNames = (
  type: RecommendationType,
  key: string,
): string[] | undefined => {
  if (type === "subcategory") return recommendationCache.subcategories.get(key);
  return recommendationCache.shops.get(key);
};

export const setCachedRecommendationNames = (
  type: RecommendationType,
  key: string,
  values: string[],
): void => {
  if (type === "subcategory") {
    recommendationCache.subcategories.set(key, values);
    return;
  }
  recommendationCache.shops.set(key, values);
};

export const getCachedCategoryColor = ({
  categoryId,
  userId,
  categoryName,
}: {
  categoryId?: number | null;
  userId?: number | null;
  categoryName?: string | null;
}): string | null => {
  if (categoryId && categoryColorCache.byCategoryId.has(categoryId)) {
    return categoryColorCache.byCategoryId.get(categoryId) ?? null;
  }

  if (userId && categoryName) {
    const key = createRecommendationKey(userId, categoryName);
    return categoryColorCache.byRecommendationKey.get(key) ?? null;
  }

  return null;
};

const ensureRecommendationBucket = (key: string): void => {
  if (!recommendationCache.subcategories.has(key)) {
    recommendationCache.subcategories.set(key, []);
  }
  if (!recommendationCache.shops.has(key)) {
    recommendationCache.shops.set(key, []);
  }
};

const fetchPresetNames = async (
  db: SQLiteDatabase,
  tableName: PresetTable,
  userId: number,
  categoryName: string,
): Promise<string[]> => {
  try {
    const rows = await db.getAllAsync<{ name: string }>(
      `SELECT name
       FROM ${tableName}
       WHERE user_id = ? AND category_name = ? AND is_archived = 0
       ORDER BY CASE WHEN last_used_at IS NULL THEN 1 ELSE 0 END,
                last_used_at DESC,
                use_count DESC,
                name ASC
       LIMIT 40`,
      [userId, categoryName],
    );

    return buildOrderedUniqueNames(rows.map((row) => row.name));
  } catch (error) {
    console.error(`Failed loading preset names from ${tableName}:`, error);
    return [];
  }
};

export const preloadRecommendationsForCategory = async (
  db: SQLiteDatabase,
  userId: number,
  categoryName: string,
): Promise<void> => {
  const key = createRecommendationKey(userId, categoryName);
  ensureRecommendationBucket(key);
  if (hasWarmRecommendations(key)) {
    return;
  }

  const existingRequest = inFlightPreloads.get(key);
  if (existingRequest) {
    return existingRequest;
  }

  const preloadRequest = (async () => {
    const [subcategoryResult, shopResult] = await Promise.all([
      fetchPresetNames(db, "subcategory_presets", userId, categoryName),
      fetchPresetNames(db, "shop_presets", userId, categoryName),
    ]);

    setCachedRecommendationNames("subcategory", key, subcategoryResult);
    setCachedRecommendationNames("shop", key, shopResult);
  })().finally(() => {
    inFlightPreloads.delete(key);
  });

  inFlightPreloads.set(key, preloadRequest);
  return preloadRequest;
};

const groupRowsByRecommendationKey = (rows: RecommendationRow[]): Map<string, string[]> => {
  const grouped = new Map<string, string[]>();

  for (const row of rows) {
    const userId = row.userId;
    const categoryName = row.categoryName?.trim();
    const name = row.name?.trim();

    if (!userId || !categoryName || !name) continue;

    const key = createRecommendationKey(userId, categoryName);
    ensureRecommendationBucket(key);

    const names = grouped.get(key);
    if (names) {
      names.push(name);
    } else {
      grouped.set(key, [name]);
    }
  }

  return grouped;
};

const fetchCategoryRows = async (db: SQLiteDatabase): Promise<RecommendationRow[]> => {
  try {
    const rows = await db.getAllAsync(
      `SELECT user_id AS userId, category_name AS categoryName
       FROM categories`,
    );
    return rows as RecommendationRow[];
  } catch (error) {
    console.warn(
      "Failed reading categories.category_name during recommendations bootstrap, trying legacy categories.name",
      error,
    );
    const fallbackRows = await db.getAllAsync(
      `SELECT user_id AS userId, name AS categoryName
       FROM categories`,
    );
    return fallbackRows as RecommendationRow[];
  }
};

const fetchCategoryPaletteRows = async (db: SQLiteDatabase): Promise<CategoryPaletteRow[]> => {
  try {
    const rows = await db.getAllAsync(
      `SELECT id, user_id AS userId, category_name AS categoryName, color
       FROM categories`,
    );
    return rows as CategoryPaletteRow[];
  } catch (error) {
    console.warn(
      "Failed reading categories.category_name during category palette bootstrap, trying legacy categories.name",
      error,
    );

    try {
      const rows = await db.getAllAsync(
        `SELECT id, user_id AS userId, name AS categoryName, color
         FROM categories`,
      );
      return rows as CategoryPaletteRow[];
    } catch (fallbackError) {
      console.warn(
        "Failed reading categories.color during category palette bootstrap, using default color fallback",
        fallbackError,
      );

      const rows = await db.getAllAsync(
        `SELECT id, user_id AS userId, category_name AS categoryName
         FROM categories`,
      );

      return (rows as CategoryPaletteRow[]).map((row) => ({
        ...row,
        color: DEFAULT_CATEGORY_COLOR,
      }));
    }
  }
};

export const preloadAllRecommendations = async (db: SQLiteDatabase): Promise<void> => {
  if (bootstrapRequest) {
    return bootstrapRequest;
  }

  bootstrapRequest = (async () => {
    recommendationCache.subcategories.clear();
    recommendationCache.shops.clear();
    categoryColorCache.byCategoryId.clear();
    categoryColorCache.byRecommendationKey.clear();
    inFlightPreloads.clear();

    const categoryRows = await fetchCategoryRows(db);
    const categoryPaletteRows = await fetchCategoryPaletteRows(db);

    for (const row of categoryRows) {
      const userId = row.userId;
      const categoryName = row.categoryName?.trim();
      if (!userId || !categoryName) continue;
      ensureRecommendationBucket(createRecommendationKey(userId, categoryName));
    }

    for (const row of categoryPaletteRows) {
      const categoryId = row.id;
      const userId = row.userId;
      const categoryName = row.categoryName?.trim();
      const colorValue = row.color?.trim();
      const resolvedColor = colorValue && colorValue.length > 0 ? colorValue : DEFAULT_CATEGORY_COLOR;

      if (typeof categoryId === "number") {
        categoryColorCache.byCategoryId.set(categoryId, resolvedColor);
      }

      if (userId && categoryName) {
        const key = createRecommendationKey(userId, categoryName);
        categoryColorCache.byRecommendationKey.set(key, resolvedColor);
      }
    }

    const [subcategoryRowsResult, shopRowsResult] = await Promise.all([
      db.getAllAsync(
        `SELECT user_id AS userId, category_name AS categoryName, name
         FROM subcategory_presets
         WHERE is_archived = 0
         ORDER BY user_id,
                  category_name,
                  CASE WHEN last_used_at IS NULL THEN 1 ELSE 0 END,
                  last_used_at DESC,
                  use_count DESC,
                  name ASC`,
      ),
      db.getAllAsync(
        `SELECT user_id AS userId, category_name AS categoryName, name
         FROM shop_presets
         WHERE is_archived = 0
         ORDER BY user_id,
                  category_name,
                  CASE WHEN last_used_at IS NULL THEN 1 ELSE 0 END,
                  last_used_at DESC,
                  use_count DESC,
                  name ASC`,
      ),
    ]);

    const subcategoryRows = subcategoryRowsResult as RecommendationRow[];
    const shopRows = shopRowsResult as RecommendationRow[];

    const groupedSubcategories = groupRowsByRecommendationKey(subcategoryRows);
    const groupedShops = groupRowsByRecommendationKey(shopRows);

    for (const [key, names] of groupedSubcategories.entries()) {
      setCachedRecommendationNames("subcategory", key, buildOrderedUniqueNames(names));
    }

    for (const [key, names] of groupedShops.entries()) {
      setCachedRecommendationNames("shop", key, buildOrderedUniqueNames(names));
    }
  })()
    .catch((error) => {
      console.error("Failed bootstrapping recommendations store:", error);
    })
    .finally(() => {
      bootstrapRequest = null;
    });

  return bootstrapRequest;
};
