import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { Animated, FlatList, StyleSheet, View } from "react-native";
import type { SortableGridRenderItem } from "react-native-sortables";
import Sortable from "react-native-sortables";
import ExpenseBox from "./ExpenseBox";

export type ExpenseItem = {
  id: string;
  userId?: number;
  amount?: string | number;
  backgroundColor?: string;
  circleColor?: string;
  icon?: LucideIcon;
  name: string;
  iconColor?: string;
  budgetUsageRatio?: number | null;
  trendPercent?: number | null;
  kind?: "category" | "add";
};

export type HomeLayoutStyle = "grid" | "masonry";

type ExpenseGridProps = {
  items: ExpenseItem[];
  onPressItem?: (item: ExpenseItem) => void;
  onLongPressItem?: (item: ExpenseItem) => void;
  onDeleteItem?: (item: ExpenseItem) => void;
  layoutStyle?: HomeLayoutStyle;
  isEditing?: boolean;
  shakeAnim?: Animated.AnimatedInterpolation<string>;
  onReorderPreview?: (nextCategoryIds: string[]) => void;
  onReorderCommit?: (nextCategoryIds: string[]) => void;
};

const GRID_COLUMNS = 3;
const ITEM_WIDTH = 106;
const ITEM_HEIGHT = 140;
const ITEM_GAP_RIGHT = 14;
const ITEM_GAP_BOTTOM = 12;
const GRID_PADDING_X = 16;
const GRID_CONTENT_WIDTH =
  GRID_COLUMNS * ITEM_WIDTH + (GRID_COLUMNS - 1) * ITEM_GAP_RIGHT + GRID_PADDING_X * 2;
const MASONRY_COLUMNS = 2;
const MASONRY_ITEM_WIDTH = 154;
const MASONRY_ITEM_GAP_RIGHT = 14;
const MASONRY_ITEM_GAP_BOTTOM = 14;
const MASONRY_CONTENT_WIDTH =
  MASONRY_COLUMNS * MASONRY_ITEM_WIDTH + (MASONRY_COLUMNS - 1) * MASONRY_ITEM_GAP_RIGHT + GRID_PADDING_X * 2;
const MASONRY_ITEM_HEIGHTS = [132, 174, 148, 186];
const MASONRY_ADD_ITEM_HEIGHT = 132;

export function ExpenseGrid({
  items,
  onPressItem,
  onLongPressItem,
  onDeleteItem,
  layoutStyle = "grid",
  isEditing = false,
  shakeAnim,
  onReorderCommit,
}: ExpenseGridProps) {
  const effectiveLayout: HomeLayoutStyle = isEditing ? "grid" : layoutStyle;
  const isMasonryLayout = effectiveLayout === "masonry";
  const activeColumns = isMasonryLayout ? MASONRY_COLUMNS : GRID_COLUMNS;
  const wiggleValue = React.useRef(new Animated.Value(0)).current;
  const wiggleLoopRef = React.useRef<Animated.CompositeAnimation | null>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const wiggleRotate = React.useMemo(
    () =>
      wiggleValue.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ["-1.2deg", "0deg", "1.2deg"],
      }),
    [wiggleValue],
  );

  const categoryItems = React.useMemo(
    () => items.filter((item) => item.kind === "category"),
    [items],
  );

  const canReorder =
    isEditing &&
    !isMasonryLayout &&
    categoryItems.length > 1 &&
    Boolean(onReorderCommit);

  const stopWiggle = React.useCallback(() => {
    wiggleLoopRef.current?.stop();
    wiggleLoopRef.current = null;
    wiggleValue.stopAnimation();
    wiggleValue.setValue(0);
    setIsDragActive(false);
    setActiveDragId(null);
  }, [wiggleValue]);

  const startWiggle = React.useCallback(() => {
    if (wiggleLoopRef.current) return;
    setIsDragActive(true);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wiggleValue, {
          toValue: -1,
          duration: 125,
          useNativeDriver: true,
        }),
        Animated.timing(wiggleValue, {
          toValue: 1,
          duration: 145,
          useNativeDriver: true,
        }),
      ]),
    );
    wiggleLoopRef.current = loop;
    loop.start();
  }, [wiggleValue]);

  const handleDragEnd = React.useCallback(
    ({ data }: { data: ExpenseItem[] }) => {
      const nextIds = data.map((item) => item.id);
      onReorderCommit?.(nextIds);
      stopWiggle();
    },
    [onReorderCommit, stopWiggle],
  );

  const handleDragStart = React.useCallback((params: { key: string }) => {
    setActiveDragId(params.key);
    startWiggle();
  }, [startWiggle]);

  React.useEffect(() => {
    if (!canReorder) {
      stopWiggle();
    }
  }, [canReorder, stopWiggle]);

  React.useEffect(
    () => () => {
      stopWiggle();
    },
    [stopWiggle],
  );

  const renderSortableItem = React.useCallback<SortableGridRenderItem<ExpenseItem>>(
    ({ item }) => {
      const transform =
        isDragActive && item.id !== activeDragId
          ? [{ rotate: wiggleRotate } as const]
          : undefined;
      return (
        <Animated.View style={transform ? { transform } : undefined}>
          <ExpenseBox
            amount={item.amount}
            backgroundColor={item.backgroundColor}
            circleColor={item.circleColor}
            icon={item.icon}
            name={item.name}
            iconColor={item.iconColor}
            budgetUsageRatio={item.budgetUsageRatio}
            trendPercent={item.trendPercent}
            isEditing
            cardWidth={ITEM_WIDTH}
            cardHeight={ITEM_HEIGHT}
            onDelete={() => onDeleteItem?.(item)}
          />
        </Animated.View>
      );
    },
    [activeDragId, isDragActive, onDeleteItem, wiggleRotate],
  );

  if (canReorder) {
    return (
      <View style={[styles.content, { width: GRID_CONTENT_WIDTH }]}>
        <Sortable.Grid
          data={categoryItems}
          keyExtractor={(item) => item.id}
          columns={GRID_COLUMNS}
          rowGap={ITEM_GAP_BOTTOM}
          columnGap={ITEM_GAP_RIGHT}
          dragActivationDelay={90}
          overflow="visible"
          activeItemScale={1}
          activeItemOpacity={1}
          inactiveItemScale={1}
          inactiveItemOpacity={1}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          renderItem={renderSortableItem}
        />
      </View>
    );
  }

  return (
    <FlatList
      key={effectiveLayout}
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={activeColumns}
      renderItem={({ item, index }) => {
        const isCategory = item.kind === "category";
        const cardHeight = isMasonryLayout
          ? item.kind === "add"
            ? MASONRY_ADD_ITEM_HEIGHT
            : MASONRY_ITEM_HEIGHTS[index % MASONRY_ITEM_HEIGHTS.length]
          : ITEM_HEIGHT;
        const cardWidth = isMasonryLayout ? MASONRY_ITEM_WIDTH : ITEM_WIDTH;
        const transform =
          !isMasonryLayout && isCategory && isEditing && shakeAnim
            ? [{ rotate: shakeAnim } as const]
            : undefined;

        return (
          <Animated.View
            style={[
              styles.item,
              index % activeColumns !== activeColumns - 1
                ? isMasonryLayout
                  ? styles.itemGapRightMasonry
                  : styles.itemGapRight
                : null,
              isMasonryLayout ? styles.itemMasonry : null,
              { marginBottom: isMasonryLayout ? MASONRY_ITEM_GAP_BOTTOM : ITEM_GAP_BOTTOM },
              transform ? { transform } : null,
            ]}
          >
            <ExpenseBox
              amount={item.amount}
              backgroundColor={item.backgroundColor}
              circleColor={item.circleColor}
              icon={item.icon}
              name={item.name}
              iconColor={item.iconColor}
              budgetUsageRatio={item.budgetUsageRatio}
              trendPercent={item.trendPercent}
              isAddCard={item.kind === "add"}
              isEditing={item.kind === "category" && isEditing}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              onPress={
                isEditing && isCategory
                  ? undefined
                  : () => onPressItem?.(item)
              }
              onLongPress={
                isEditing && isCategory
                  ? undefined
                  : () => onLongPressItem?.(item)
              }
              onDelete={() => onDeleteItem?.(item)}
            />
          </Animated.View>
        );
      }}
      columnWrapperStyle={isMasonryLayout ? styles.rowMasonry : styles.row}
      contentContainerStyle={[
        styles.content,
        {
          width: isMasonryLayout ? MASONRY_CONTENT_WIDTH : GRID_CONTENT_WIDTH,
        },
      ]}
      showsVerticalScrollIndicator={false}
      pointerEvents={isEditing ? "box-none" : "auto"}
      scrollEnabled={!isEditing || isMasonryLayout}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    maxWidth: "100%",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: {
    justifyContent: "flex-start",
  },
  item: {
    marginBottom: ITEM_GAP_BOTTOM,
  },
  itemGapRight: {
    marginRight: ITEM_GAP_RIGHT,
  },
  rowMasonry: {
    justifyContent: "flex-start",
  },
  itemMasonry: {
    alignSelf: "flex-start",
  },
  itemGapRightMasonry: {
    marginRight: MASONRY_ITEM_GAP_RIGHT,
  },
});
