import { categories, payments, products } from "@/src/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";

type MonthInput = Date | number;

const toMonthDate = (month: MonthInput): Date =>
  month instanceof Date ? month : new Date(month);

export const categoriesForMonth = (
  db: ExpoSQLiteDatabase,
  month: MonthInput,
) => {
  const monthDate = toMonthDate(month);

  return db
    .select({
      id: categories.id,
      userId: categories.userId,
      categoryName: categories.categoryName,
      color: categories.color,
      icon: categories.icon,
    })
    .from(categories)
    .where(eq(categories.monthStart, monthDate))
    .orderBy(categories.id);
};

export const paymentSumsByCategory = (db: ExpoSQLiteDatabase) => {
  const categoryExpr = sql<number>`coalesce(${products.categoryId}, ${payments.categoryId})`;
  const totalExpr = sql<number>`coalesce(sum(case when ${products.id} is null then ${payments.sum} else ${products.price} end), 0)`;

  return db
    .select({
      categoryId: categoryExpr,
      totalSumCents: totalExpr,
    })
    .from(payments)
    .leftJoin(products, eq(products.paymentId, payments.id))
    .groupBy(categoryExpr);
};

export const paymentSumsByCategoryForMonth = (
  db: ExpoSQLiteDatabase,
  month: MonthInput,
) => {
  const monthDate = toMonthDate(month);
  const categoryExpr = sql<number>`coalesce(${products.categoryId}, ${payments.categoryId})`;
  const totalExpr = sql<number>`coalesce(sum(case when ${products.id} is null then ${payments.sum} else ${products.price} end), 0)`;

  return db
    .select({
      categoryId: categoryExpr,
      totalSumCents: totalExpr,
    })
    .from(payments)
    .leftJoin(products, eq(products.paymentId, payments.id))
    .innerJoin(categories, sql`${categories.id} = ${categoryExpr}`)
    .where(eq(categories.monthStart, monthDate))
    .groupBy(categoryExpr);
};

export const paymentSumsByCategoryNameForMonth = (
  db: ExpoSQLiteDatabase,
  month: MonthInput,
) => {
  const monthDate = toMonthDate(month);
  const categoryExpr = sql<number>`coalesce(${products.categoryId}, ${payments.categoryId})`;
  const totalExpr = sql<number>`coalesce(sum(case when ${products.id} is null then ${payments.sum} else ${products.price} end), 0)`;

  return db
    .select({
      categoryName: categories.categoryName,
      totalSumCents: totalExpr,
    })
    .from(payments)
    .leftJoin(products, eq(products.paymentId, payments.id))
    .innerJoin(categories, sql`${categories.id} = ${categoryExpr}`)
    .where(eq(categories.monthStart, monthDate))
    .groupBy(categories.categoryName);
};

export const categoriesWithSpendingForMonth = (
  db: ExpoSQLiteDatabase,
  month: MonthInput,
) => {
  const monthDate = toMonthDate(month);
  const categoryExpr = sql<number>`coalesce(${products.categoryId}, ${payments.categoryId})`;
  const totalExpr = sql<number>`coalesce(sum(case when ${products.id} is null then ${payments.sum} else ${products.price} end), 0)`;

  const monthlyTotals = db
    .select({
      categoryId: categoryExpr.as("category_id"),
      totalSumCents: totalExpr.as("total_sum_cents"),
    })
    .from(payments)
    .leftJoin(products, eq(products.paymentId, payments.id))
    .innerJoin(categories, sql`${categories.id} = ${categoryExpr}`)
    .where(eq(categories.monthStart, monthDate))
    .groupBy(categoryExpr)
    .as("monthly_totals");

  return db
    .select({
      id: categories.id,
      userId: categories.userId,
      categoryName: categories.categoryName,
      color: categories.color,
      icon: categories.icon,
      totalSumCents: sql<number>`coalesce(${monthlyTotals.totalSumCents}, 0)`,
    })
    .from(categories)
    .leftJoin(monthlyTotals, eq(categories.id, monthlyTotals.categoryId))
    .where(eq(categories.monthStart, monthDate))
    .orderBy(categories.id);
};

export const categoryCatalogByRecency = (db: ExpoSQLiteDatabase) =>
  db
    .select({
      categoryName: categories.categoryName,
      color: categories.color,
      iconName: categories.icon,
      monthStart: categories.monthStart,
      id: categories.id,
    })
    .from(categories)
    .orderBy(desc(categories.monthStart), desc(categories.id));
