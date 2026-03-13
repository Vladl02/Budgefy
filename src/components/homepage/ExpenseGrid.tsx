import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { Animated, FlatList, Platform, Pressable, StyleSheet } from "react-native";
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
  onReorderStart?: () => void;
  onReorderSettled?: () => void;
  onBackgroundPress?: () => void;
};

type SortableItemCardProps = {
  item: ExpenseItem;
  isCategory: boolean;
  isEditing: boolean;
  shouldWiggleItem: boolean;
  wiggleRotate: Animated.AnimatedInterpolation<string>;
  onPressItem?: (item: ExpenseItem) => void;
  onLongPressItem?: (item: ExpenseItem) => void;
  onDeleteItem?: (item: ExpenseItem) => void;
};

const SortableItemCard = React.memo(function SortableItemCard({
  item,
  isCategory,
  isEditing,
  shouldWiggleItem,
  wiggleRotate,
  onPressItem,
  onLongPressItem,
  onDeleteItem,
}: SortableItemCardProps) {
  const [isPressedVisual, setIsPressedVisual] = React.useState(false);
  const transform = shouldWiggleItem ? [{ rotate: wiggleRotate } as const] : undefined;

  return (
    <Sortable.Touchable
      onTap={() => {
        setIsPressedVisual(false);
        onPressItem?.(item);
      }}
      onLongPress={
        isCategory && !isEditing
          ? () => onLongPressItem?.(item)
          : undefined
      }
      onTouchesDown={() => setIsPressedVisual(true)}
      onTouchesUp={() => setIsPressedVisual(false)}
      failDistance={8}
      gestureMode="simultaneous"
    >
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
          isAddCard={item.kind === "add"}
          isEditing={isCategory && isEditing}
          cardWidth={ITEM_WIDTH}
          cardHeight={ITEM_HEIGHT}
          interactionMode="passive"
          isPressedVisual={!isEditing && isPressedVisual}
          onDelete={() => onDeleteItem?.(item)}
        />
      </Animated.View>
    </Sortable.Touchable>
  );
});

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
  onReorderStart,
  onReorderSettled,
  onBackgroundPress,
}: ExpenseGridProps) {
  const effectiveLayout: HomeLayoutStyle = isEditing ? "grid" : layoutStyle;
  const isMasonryLayout = effectiveLayout === "masonry";
  const shouldWiggle = Platform.OS === "ios";
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

  const canUseSortable =
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
    if (!shouldWiggle) return;
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
  }, [shouldWiggle, wiggleValue]);

  const handleDragEnd = React.useCallback(
    ({ data }: { data: ExpenseItem[] }) => {
      const nextIds = data
        .filter((item) => item.kind === "category")
        .map((item) => item.id);
      onReorderCommit?.(nextIds);
      stopWiggle();
    },
    [onReorderCommit, stopWiggle],
  );

  const handleDragStart = React.useCallback((params: { key: string }) => {
    setActiveDragId(params.key);
    onReorderStart?.();
    startWiggle();
  }, [onReorderStart, startWiggle]);

  const handleActiveItemDropped = React.useCallback(() => {
    onReorderSettled?.();
  }, [onReorderSettled]);

  React.useEffect(() => {
    if (!canUseSortable) {
      stopWiggle();
    }
  }, [canUseSortable, stopWiggle]);

  React.useEffect(
    () => () => {
      stopWiggle();
    },
    [stopWiggle],
  );

  const renderSortableItem = React.useCallback<SortableGridRenderItem<ExpenseItem>>(
    ({ item }) => {
      const isCategory = item.kind === "category";
      const shouldWiggleItem =
        shouldWiggle && isDragActive && isCategory && item.id !== activeDragId;
      return (
        <Sortable.Handle mode={isCategory ? "draggable" : "fixed-order"}>
          <SortableItemCard
            item={item}
            isCategory={isCategory}
            isEditing={isEditing}
            shouldWiggleItem={shouldWiggleItem}
            wiggleRotate={wiggleRotate}
            onPressItem={onPressItem}
            onLongPressItem={onLongPressItem}
            onDeleteItem={onDeleteItem}
          />
        </Sortable.Handle>
      );
    },
    [activeDragId, isDragActive, isEditing, onDeleteItem, onLongPressItem, onPressItem, shouldWiggle, wiggleRotate],
  );

  if (canUseSortable) {
    return (
      <Pressable
        onPress={isEditing ? onBackgroundPress : undefined}
        style={[styles.content, { width: GRID_CONTENT_WIDTH }]}
      >
        <Sortable.Grid
          data={items}
          keyExtractor={(item) => item.id}
          columns={GRID_COLUMNS}
          rowGap={ITEM_GAP_BOTTOM}
          columnGap={ITEM_GAP_RIGHT}
          dragActivationDelay={160}
          dropAnimationDuration={120}
          overflow="visible"
          customHandle
          activeItemScale={1}
          activeItemOpacity={1}
          inactiveItemScale={1}
          inactiveItemOpacity={1}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onActiveItemDropped={handleActiveItemDropped}
          renderItem={renderSortableItem}
        />
      </Pressable>
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
              onPress={() => onPressItem?.(item)}
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
