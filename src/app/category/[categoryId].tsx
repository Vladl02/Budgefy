import { categories, payments, products, users } from "@/src/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { drizzle, useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { ArrowLeft, Store } from "lucide-react-native";
import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

type ItemRow = {
  id: number;
  name: string;
  priceCents: number;
  createdAt: Date | number | string | null;
  marketName: string | null;
};

const formatPrice = (cents: number) => {
  const value = (Number(cents) || 0) / 100;
  return `RON ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const toDate = (value: Date | number | string | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function CategoryItemsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string | string[]; categoryName?: string | string[] }>();
  const rawCategoryId = Array.isArray(params.categoryId) ? params.categoryId[0] : params.categoryId;
  const rawCategoryName = Array.isArray(params.categoryName) ? params.categoryName[0] : params.categoryName;
  const categoryId = Number(rawCategoryId);
  const hasValidCategoryId = Number.isFinite(categoryId) && categoryId > 0;

  const dbExpo = useSQLiteContext();
  const db = drizzle(dbExpo);

  const usersQuery = useMemo(
    () =>
      db
        .select({ id: users.id })
        .from(users)
        .orderBy(users.id)
        .limit(1),
    [db],
  );
  const { data: userData } = useLiveQuery(usersQuery);
  const activeUserId = userData[0]?.id ?? 1;

  const categoryQuery = useMemo(() => {
    if (!hasValidCategoryId) {
      return db
        .select({ categoryName: categories.categoryName, color: categories.color })
        .from(categories)
        .where(eq(categories.id, -1))
        .limit(1);
    }
    return db
      .select({ categoryName: categories.categoryName, color: categories.color })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);
  }, [categoryId, db, hasValidCategoryId]);
  const { data: categoryData } = useLiveQuery(categoryQuery);
  const resolvedCategoryName = categoryData[0]?.categoryName ?? rawCategoryName ?? "Category";
  const resolvedCategoryColor = categoryData[0]?.color ?? "#111827";

  const itemsQuery = useMemo(() => {
    if (!hasValidCategoryId) {
      return db
        .select({
          id: products.id,
          name: products.name,
          priceCents: products.price,
          createdAt: payments.createdAt,
          marketName: payments.marketName,
        })
        .from(products)
        .innerJoin(payments, eq(products.paymentId, payments.id))
        .where(eq(payments.id, -1))
        .orderBy(desc(payments.createdAt), desc(products.id));
    }

    return db
      .select({
        id: products.id,
        name: products.name,
        priceCents: products.price,
        createdAt: payments.createdAt,
        marketName: payments.marketName,
      })
      .from(products)
      .innerJoin(payments, eq(products.paymentId, payments.id))
      .where(and(eq(payments.categoryId, categoryId), eq(payments.userId, activeUserId)))
      .orderBy(desc(payments.createdAt), desc(products.id));
  }, [activeUserId, categoryId, db, hasValidCategoryId]);
  const { data: itemsData } = useLiveQuery(itemsQuery);
  const totalSpentCents = useMemo(
    () => itemsData.reduce((total, item) => total + Number(item.priceCents ?? 0), 0),
    [itemsData],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color="#111827" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>{resolvedCategoryName}</Text>
          <Text style={styles.headerSubtitle}>Purchased items for this category</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={[styles.summaryDot, { backgroundColor: resolvedCategoryColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>Total tracked spend</Text>
          <Text style={styles.summaryValue}>{formatPrice(totalSpentCents)}</Text>
        </View>
        <Text style={styles.summaryCount}>{itemsData.length} item{itemsData.length === 1 ? "" : "s"}</Text>
      </View>

      <FlatList
        data={itemsData as ItemRow[]}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptyText}>Add expenses in this category to see item details here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const date = toDate(item.createdAt);
          const dateLabel = date
            ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "Unknown date";

          return (
            <View style={styles.itemCard}>
              <View style={styles.itemTopRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name || "Expense"}
                </Text>
                <Text style={styles.itemPrice}>{formatPrice(Number(item.priceCents ?? 0))}</Text>
              </View>
              <View style={styles.itemMetaRow}>
                <Text style={styles.itemDate}>{dateLabel}</Text>
                {item.marketName ? (
                  <View style={styles.storeWrap}>
                    <Store size={12} color="#6B7280" />
                    <Text style={styles.itemStore} numberOfLines={1}>
                      {item.marketName}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F7FB",
    paddingTop: 52,
  },
  header: {
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  summaryCard: {
    marginTop: 14,
    marginHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  summaryValue: {
    marginTop: 2,
    fontSize: 16,
    color: "#111827",
    fontWeight: "800",
  },
  summaryCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 30,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  itemMetaRow: {
    marginTop: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  itemDate: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  storeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "55%",
  },
  itemStore: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  emptyState: {
    marginTop: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  emptyText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
});
