import { seed } from "drizzle-seed";
import { eq } from "drizzle-orm";
import { DEFAULT_CATEGORY_CATALOG } from "../constants/defaultCategoryCatalog";
import * as schema from "./schema";

type SeedDb = Parameters<typeof seed>[0];

type SeedOptions = {
  usersCount?: number;
  seedValue?: number;
};

type LegacyReportReceiptSeed = {
  marketName: string;
  amountCents: number;
  paymentDate: string;
  categoryName: string;
};

const CURRENT_MONTH_START = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const NOW = new Date();

const CATEGORY_NAMES = DEFAULT_CATEGORY_CATALOG.map((item) => item.name);
const CATEGORY_COLORS = DEFAULT_CATEGORY_CATALOG.map((item) => item.color);
const CATEGORY_ICONS = DEFAULT_CATEGORY_CATALOG.map((item) => item.iconName);
const CATEGORY_CATALOG_MAP = new Map(
  DEFAULT_CATEGORY_CATALOG.map((item) => [item.name, item]),
);

const MARKET_NAMES = [
  "Walmart",
  "Target",
  "Costco",
  "Trader Joe's",
  "Whole Foods",
  "Amazon",
  "CVS",
  "Shell",
  "Best Buy",
];

const PRODUCT_NAMES = [
  "Milk",
  "Bread",
  "Eggs",
  "Chicken",
  "Rice",
  "Coffee",
  "Soap",
  "Shampoo",
  "Notebook",
  "Headphones",
  "Gasoline",
  "Vitamins",
];

const FIRST_SUBCATEGORY_VALUES = [
  "Food",
  "Home",
  "Beauty",
  "Electronics",
  "Transport",
  "Health",
  "Office",
];

const OTHER_SUBCATEGORY_VALUES = [
  "Essential",
  "Discount",
  "Weekend",
  "Monthly",
  "Impulse",
  "Planned",
];

const CATEGORY_SUBCATEGORY_PRESETS: Record<string, string[]> = Object.fromEntries(
  DEFAULT_CATEGORY_CATALOG.map((item) => [item.name, item.subcategories]),
);

const CATEGORY_SHOP_PRESETS: Record<string, string[]> = {
  "Groceries": ["Walmart", "Target", "Costco", "Trader Joe's", "Whole Foods"],
  "Dining & Takeout": ["McDonald's", "KFC", "Subway", "Starbucks", "Domino's"],
  "Transport": ["Shell", "BP", "Uber", "Lyft", "Metro"],
  "Housing / Home": ["IKEA", "Home Depot", "Leroy Merlin", "JYSK", "Wayfair"],
  "Bills & Utilities": ["AT&T", "Verizon", "Comcast", "City Utilities", "Gas Company"],
  "Health & Medical": ["CVS", "Walgreens", "Blue Cross", "Kaiser", "Quest Diagnostics"],
  "Personal Care & Beauty": ["Sephora", "Douglas", "DM", "Notino", "Ulta"],
  "Shopping": ["Amazon", "Best Buy", "H&M", "Zara", "eMAG"],
  "Entertainment": ["Netflix", "Spotify", "Steam", "HBO Max", "Apple TV"],
  "Education": ["Udemy", "Coursera", "Barnes & Noble", "edX", "Khan Academy"],
  "Work / Business": ["Google Workspace", "Microsoft", "Notion", "Figma", "AWS"],
  "Financial": ["Revolut", "PayPal", "Bank Transfer", "Brokerage", "Wise"],
  "Travel": ["Booking", "Airbnb", "Skyscanner", "Wizz Air", "Ryanair"],
  "Family & Kids": ["Lego", "Chicco", "Smyths", "Mothercare", "Decathlon"],
  "Pets": ["PetSmart", "Zooplus", "Petco", "Maxi Pet", "Animax"],
  "Other": ["Misc Shop", "Marketplace", "Unknown", "Cash", "Other"],
};

const LEGACY_REPORT_RECEIPTS: readonly LegacyReportReceiptSeed[] = [
  { marketName: "Media Galaxy", amountCents: 42990, paymentDate: "2025-12-27", categoryName: "Shopping" },
  { marketName: "Kaufland", amountCents: 8550, paymentDate: "2025-12-21", categoryName: "Groceries" },
  { marketName: "Lidl", amountCents: 14240, paymentDate: "2025-11-29", categoryName: "Groceries" },
  { marketName: "Altex", amountCents: 56000, paymentDate: "2025-11-11", categoryName: "Shopping" },
  { marketName: "Darwin", amountCents: 145069, paymentDate: "2025-11-08", categoryName: "Shopping" },
  { marketName: "Metro", amountCents: 24530, paymentDate: "2025-11-02", categoryName: "Other" },
  { marketName: "Metro", amountCents: 24530, paymentDate: "2026-01-02", categoryName: "Other" },
  { marketName: "Media Galaxy", amountCents: 64530, paymentDate: "2026-01-02", categoryName: "Shopping" },
  { marketName: "Altex", amountCents: 24530, paymentDate: "2026-02-01", categoryName: "Other" },
  { marketName: "Kaufland", amountCents: 3050, paymentDate: "2026-02-04", categoryName: "Other" },
  { marketName: "F64", amountCents: 35050, paymentDate: "2026-02-10", categoryName: "Shopping" },
  { marketName: "Carturesti", amountCents: 24030, paymentDate: "2026-02-22", categoryName: "Other" },
];

const normalizePresetName = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const parseLocalNoonDate = (value: string): Date => {
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  const day = Number.parseInt(dayRaw, 10);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export async function seedAppData(db: SeedDb, options: SeedOptions = {}): Promise<void> {
  const usersCount = options.usersCount ?? 1;
  const seedValue = options.seedValue ?? 20260212;

  await seed(db, schema, { seed: seedValue }).refine((funcs) => ({
    users: {
      count: usersCount,
      columns: {
        email: funcs.valuesFromArray({
          values: [
            "alex@example.com",
            "mia@example.com",
            "noah@example.com",
            "emma@example.com",
            "liam@example.com",
            "olivia@example.com",
            "ethan@example.com",
            "ava@example.com",
            "lucas@example.com",
            "sophia@example.com",
            "mason@example.com",
            "isabella@example.com",
          ],
          isUnique: true,
        }),
        name: funcs.fullName(),
        createdAt: funcs.date({
          minDate: "2025-01-01T00:00:00.000Z",
          maxDate: new Date(),
        }),
      },
      with: {
        categories: [
          { weight: 0.2, count: [5] },
          { weight: 0.35, count: [6] },
          { weight: 0.3, count: [7] },
          { weight: 0.15, count: [8] },
        ],
      },
    },
    categories: {
      columns: {
        categoryName: funcs.valuesFromArray({ values: CATEGORY_NAMES, isUnique: true }),
        color: funcs.valuesFromArray({ values: CATEGORY_COLORS }),
        icon: funcs.valuesFromArray({ values: CATEGORY_ICONS }),
        monthStart: funcs.date({
          minDate: CURRENT_MONTH_START,
          maxDate: CURRENT_MONTH_START,
        }),
      },
      with: {
        payments: [
          { weight: 0.45, count: [1] },
          { weight: 0.35, count: [2] },
          { weight: 0.15, count: [3] },
          { weight: 0.05, count: [4] },
        ],
      },
    },
    payments: {
      columns: {
        sum: funcs.int({ minValue: 500, maxValue: 22000 }),
        marketName: funcs.valuesFromArray({ values: MARKET_NAMES }),
        timedAt: funcs.date({
          minDate: CURRENT_MONTH_START,
          maxDate: NOW,
        }),
        receiptPhotoLink: funcs.valuesFromArray({
          values: [
            undefined,
            "https://cdn.example.com/receipt/1.jpg",
            "https://cdn.example.com/receipt/2.jpg",
            "https://cdn.example.com/receipt/3.jpg",
          ],
        }),
      },
      with: {
        products: [
          { weight: 0.6, count: [1] },
          { weight: 0.3, count: [2] },
          { weight: 0.1, count: [3] },
        ],
      },
    },
    products: {
      columns: {
        name: funcs.valuesFromArray({ values: PRODUCT_NAMES }),
        price: funcs.int({ minValue: 100, maxValue: 9000 }),
        firstSubcategory: funcs.valuesFromArray({
          values: FIRST_SUBCATEGORY_VALUES,
        }),
        otherSubcategories: funcs.valuesFromArray({
          values: OTHER_SUBCATEGORY_VALUES,
        }),
      },
    },
    subcategoryPresets: {
      count: 0,
    },
    shopPresets: {
      count: 0,
    },
  }));

  const seededDb = db as any;

  const categoriesData = await seededDb
    .select({
      id: schema.categories.id,
      userId: schema.categories.userId,
      categoryName: schema.categories.categoryName,
    })
    .from(schema.categories)
    .all();
  const usersData = await seededDb
    .select({ id: schema.users.id })
    .from(schema.users)
    .all();

  for (const row of categoriesData) {
    const catalogItem = CATEGORY_CATALOG_MAP.get(row.categoryName);
    if (!catalogItem) continue;

    await seededDb
      .update(schema.categories)
      .set({
        color: catalogItem.color,
        icon: catalogItem.iconName,
      })
      .where(eq(schema.categories.id, row.id));
  }

  const categoryIdByUserAndName = new Map<string, number>();
  const fallbackCategoryIdByUser = new Map<number, number>();

  for (const row of categoriesData) {
    const normalizedName = normalizePresetName(row.categoryName);
    categoryIdByUserAndName.set(`${row.userId}|${normalizedName}`, row.id);
    if (!fallbackCategoryIdByUser.has(row.userId)) {
      fallbackCategoryIdByUser.set(row.userId, row.id);
    }
  }

  const legacyPaymentValues: {
    sum: number;
    marketName: string;
    sourceType: string;
    userId: number;
    categoryId: number;
    timedAt: Date;
  }[] = [];

  for (const userRow of usersData) {
    const fallbackCategoryId = fallbackCategoryIdByUser.get(userRow.id);
    if (!fallbackCategoryId) continue;

    for (const receipt of LEGACY_REPORT_RECEIPTS) {
      const normalizedCategoryName = normalizePresetName(receipt.categoryName);
      const categoryId =
        categoryIdByUserAndName.get(`${userRow.id}|${normalizedCategoryName}`) ?? fallbackCategoryId;

      legacyPaymentValues.push({
        sum: receipt.amountCents,
        marketName: receipt.marketName,
        sourceType: "manual",
        userId: userRow.id,
        categoryId,
        timedAt: parseLocalNoonDate(receipt.paymentDate),
      });
    }
  }

  if (legacyPaymentValues.length > 0) {
    await seededDb.insert(schema.payments).values(legacyPaymentValues);
  }

  const now = new Date();
  const subcategoryMap = new Map<
    string,
    {
      userId: number;
      categoryName: string;
      name: string;
      normalizedName: string;
      createdAt: Date;
      updatedAt: Date;
    }
  >();
  const shopMap = new Map<
    string,
    {
      userId: number;
      categoryName: string;
      name: string;
      normalizedName: string;
      createdAt: Date;
      updatedAt: Date;
    }
  >();

  for (const userRow of usersData) {
    for (const categoryName of CATEGORY_NAMES) {
      const subcategoryPresets = CATEGORY_SUBCATEGORY_PRESETS[categoryName] ?? [];
      for (const presetName of subcategoryPresets) {
        const normalizedName = normalizePresetName(presetName);
        const key = `${userRow.id}|${categoryName}|${normalizedName}`;
        if (!subcategoryMap.has(key)) {
          subcategoryMap.set(key, {
            userId: userRow.id,
            categoryName,
            name: presetName,
            normalizedName,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      const shopPresets = CATEGORY_SHOP_PRESETS[categoryName] ?? [];
      for (const presetName of shopPresets) {
        const normalizedName = normalizePresetName(presetName);
        const key = `${userRow.id}|${categoryName}|${normalizedName}`;
        if (!shopMap.has(key)) {
          shopMap.set(key, {
            userId: userRow.id,
            categoryName,
            name: presetName,
            normalizedName,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }
  }

  const subcategoryValues = Array.from(subcategoryMap.values());
  if (subcategoryValues.length > 0) {
    await seededDb.insert(schema.subcategoryPresets).values(subcategoryValues).onConflictDoNothing();
  }

  const shopValues = Array.from(shopMap.values());
  if (shopValues.length > 0) {
    await seededDb.insert(schema.shopPresets).values(shopValues).onConflictDoNothing();
  }
}
