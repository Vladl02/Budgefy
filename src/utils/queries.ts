import { categories, payments, products } from "@/src/db/schema";
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
