import { seed } from "drizzle-seed";
import * as schema from "./schema";

type SeedDb = Parameters<typeof seed>[0];

type SeedOptions = {
  usersCount?: number;
  seedValue?: number;
};

const CURRENT_MONTH_START = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const NOW = new Date();

const CATEGORY_NAMES = [
  "Groceries",
  "Transport",
  "Utilities",
  "Health",
  "Restaurants",
  "Entertainment",
  "Shopping",
  "Education",
  "Savings",
];

const CATEGORY_COLORS = [
  "#00DDB7",
  "#FFC83C",
  "#36A8FF",
  "#FF4752",
  "#C48FEE",
  "#FF9949",
  "#5FFF94",
  "#7D8CFF",
  "#4FD27E",
];

const CATEGORY_ICONS = [
  "ShoppingCart",
  "Bus",
  "Droplets",
  "Utensils",
  "Coffee",
  "Film",
  "Banknote",
  "BookOpen",
  "PiggyBank",
];

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

const CATEGORY_SUBCATEGORY_PRESETS: Record<string, string[]> = {
  Groceries: ["Food", "Snacks", "Drinks", "Household", "Health"],
  Transport: ["Fuel", "Public Transit", "Ride Share", "Parking", "Maintenance"],
  Utilities: ["Electricity", "Water", "Gas", "Internet", "Phone"],
  Health: ["Medicine", "Doctor", "Supplements", "Therapy", "Dental"],
  Restaurants: ["Breakfast", "Lunch", "Dinner", "Coffee", "Delivery"],
  Entertainment: ["Cinema", "Streaming", "Games", "Events", "Books"],
  Shopping: ["Clothes", "Electronics", "Home", "Gifts", "Accessories"],
  Education: ["Books", "Courses", "Tuition", "Supplies", "Software"],
  Savings: ["Emergency Fund", "Investments", "Retirement", "Travel", "Goals"],
};

const CATEGORY_SHOP_PRESETS: Record<string, string[]> = {
  Groceries: ["Walmart", "Target", "Costco", "Trader Joe's", "Whole Foods"],
  Transport: ["Shell", "Uber", "Lyft", "Metro", "BP"],
  Utilities: ["AT&T", "Verizon", "Comcast", "City Utilities", "Gas Company"],
  Health: ["CVS", "Walgreens", "Kaiser", "Blue Cross", "Quest Diagnostics"],
  Restaurants: ["McDonald's", "Chipotle", "Starbucks", "Subway", "Domino's"],
  Entertainment: ["Netflix", "Spotify", "AMC", "Steam", "Apple TV"],
  Shopping: ["Amazon", "Best Buy", "IKEA", "H&M", "Zara"],
  Education: ["Udemy", "Coursera", "Barnes & Noble", "Khan Academy", "edX"],
  Savings: ["Bank Transfer", "Brokerage", "Savings Account", "Robo Advisor", "Credit Union"],
};

const normalizePresetName = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

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
          { weight: 0.5, count: [6] },
          { weight: 0.35, count: [7] },
          { weight: 0.15, count: [8] },
        ],
      },
    },
    categories: {
      columns: {
        categoryName: funcs.valuesFromArray({ values: CATEGORY_NAMES, isUnique: true }),
        color: funcs.valuesFromArray({ values: CATEGORY_COLORS, isUnique: true }),
        icon: funcs.valuesFromArray({ values: CATEGORY_ICONS, isUnique: true }),
        monthStart: funcs.date({
          minDate: CURRENT_MONTH_START,
          maxDate: CURRENT_MONTH_START,
        }),
      },
      with: {
        payments: [
          { weight: 0.5, count: [1] },
          { weight: 0.35, count: [2] },
          { weight: 0.15, count: [3] },
        ],
      },
    },
    payments: {
      columns: {
        sum: funcs.int({ minValue: 500, maxValue: 22000 }),
        marketName: funcs.valuesFromArray({ values: MARKET_NAMES }),
        createdAt: funcs.date({
          minDate: CURRENT_MONTH_START,
          maxDate: NOW,
        }),
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
      userId: schema.categories.userId,
      categoryName: schema.categories.categoryName,
    })
    .from(schema.categories)
    .all();

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

  for (const row of categoriesData) {
    const subcategoryPresets = CATEGORY_SUBCATEGORY_PRESETS[row.categoryName] ?? [];
    for (const presetName of subcategoryPresets) {
      const normalizedName = normalizePresetName(presetName);
      const key = `${row.userId}|${row.categoryName}|${normalizedName}`;
      if (!subcategoryMap.has(key)) {
        subcategoryMap.set(key, {
          userId: row.userId,
          categoryName: row.categoryName,
          name: presetName,
          normalizedName,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const shopPresets = CATEGORY_SHOP_PRESETS[row.categoryName] ?? [];
    for (const presetName of shopPresets) {
      const normalizedName = normalizePresetName(presetName);
      const key = `${row.userId}|${row.categoryName}|${normalizedName}`;
      if (!shopMap.has(key)) {
        shopMap.set(key, {
          userId: row.userId,
          categoryName: row.categoryName,
          name: presetName,
          normalizedName,
          createdAt: now,
          updatedAt: now,
        });
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
