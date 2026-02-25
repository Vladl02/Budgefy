import { categories, payments } from "@/src/db/schema";
import { eq, sql } from "drizzle-orm";
import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";

type MonthInput = Date | number;

export const categoriesForMonth = (
  db: ExpoSQLiteDatabase,
  month: MonthInput,
) => {
  const monthDate = month instanceof Date ? month : new Date(month);

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
  return db
    .select({
      categoryId: payments.categoryId,
      totalSumCents: sql<number>`coalesce(sum(${payments.sum}), 0)`,
    })
    .from(payments)
    .groupBy(payments.categoryId);
};
