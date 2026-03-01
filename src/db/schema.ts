import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
    id: integer("id").primaryKey({ autoIncrement: true}),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: 'timestamp_ms' })
        .notNull()
        .default(sql`(unixepoch() * 1000)`),
})


export const categories = sqliteTable("categories", {
    id: integer("id").primaryKey({ autoIncrement: true}),
    categoryName: text("category_name").notNull(),
    color: text("color").notNull().default("#36A8FF"),
    icon: text("icon").notNull().default("CircleHelp"),
    monthStart: integer("month_start", { mode: "timestamp_ms" }).notNull(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id)
})


export const payments = sqliteTable("payments", {
    id: integer("id").primaryKey({ autoIncrement: true}),
    sum: integer("sum").notNull(),
    marketName: text("market_name"),
    sourceType: text("source_type").notNull().default("manual"),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id),
    categoryId: integer("category_id")
        .notNull()
        .references(() => categories.id),
    createdAt: integer("created_at", { mode: 'timestamp_ms' })
        .notNull()
        .default(sql`(unixepoch() * 1000)`),
    timedAt: integer("timed_at", { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
    receiptPhotoLink: text("receipt_photo_link")
},
    (table) => [
        index("payments_user_timed_idx").on(table.userId, table.timedAt),
    ],
)


export const products = sqliteTable("products", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name")
        .notNull(),
    price: integer("price").notNull(),
    categoryId: integer("category_id")
        .references(() => categories.id),
    originType: text("origin_type").notNull().default("manual"),
    isPlaceholder: integer("is_placeholder").notNull().default(0),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id),
    paymentId: integer("payment_id")
        .notNull()
        .references(() => payments.id),
    firstSubcategory: text("first_subcategory"),
    otherSubcategories: text("other_subcategories")
},
    (table) => [
        index("products_payment_idx").on(table.paymentId),
        index("products_category_idx").on(table.categoryId),
        index("products_category_payment_idx").on(table.categoryId, table.paymentId),
    ],
)

export const subcategoryPresets = sqliteTable(
    "subcategory_presets",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userId: integer("user_id")
            .notNull()
            .references(() => users.id),
        categoryName: text("category_name").notNull(),
        name: text("name").notNull(),
        normalizedName: text("normalized_name").notNull(),
        useCount: integer("use_count").notNull().default(0),
        lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
        isArchived: integer("is_archived").notNull().default(0),
        createdAt: integer("created_at", { mode: "timestamp_ms" })
            .notNull()
            .default(sql`(unixepoch() * 1000)`),
        updatedAt: integer("updated_at", { mode: "timestamp_ms" })
            .notNull()
            .default(sql`(unixepoch() * 1000)`),
    },
    (table) => [
        uniqueIndex("subcategory_presets_user_category_name_unique").on(
            table.userId,
            table.categoryName,
            table.normalizedName,
        ),
        index("subcategory_presets_user_category_recency_idx").on(
            table.userId,
            table.categoryName,
            table.lastUsedAt,
        ),
    ],
);

export const shopPresets = sqliteTable(
    "shop_presets",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userId: integer("user_id")
            .notNull()
            .references(() => users.id),
        categoryName: text("category_name").notNull(),
        name: text("name").notNull(),
        normalizedName: text("normalized_name").notNull(),
        useCount: integer("use_count").notNull().default(0),
        lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
        isArchived: integer("is_archived").notNull().default(0),
        createdAt: integer("created_at", { mode: "timestamp_ms" })
            .notNull()
            .default(sql`(unixepoch() * 1000)`),
        updatedAt: integer("updated_at", { mode: "timestamp_ms" })
            .notNull()
            .default(sql`(unixepoch() * 1000)`),
    },
    (table) => [
        uniqueIndex("shop_presets_user_category_name_unique").on(
            table.userId,
            table.categoryName,
            table.normalizedName,
        ),
        index("shop_presets_user_category_recency_idx").on(
            table.userId,
            table.categoryName,
            table.lastUsedAt,
        ),
    ],
);


/*
export const spendings = sqliteTable("spendings", {
    id: integer("id").primaryKey({ autoIncrement: true}),
    sum: integer("sum").notNull(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id),
    categoryId: integer("category_id")
        .notNull()
        .references(() => categories.id),
    description: text("description").default("none"),
    createdAt: integer("created_at", { mode: 'timestamp_ms' })
        .notNull()
        .default(sql`(unixepoch() * 1000)`),
    timedAt: integer("timed_at", { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
}) */


