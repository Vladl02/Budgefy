import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { Animated, Easing, FlatList, PanResponder, StyleSheet } from "react-native";
import type { TransformsStyle } from "react-native";
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
  kind?: "category" | "add";
};

type ExpenseGridProps = {
  items: ExpenseItem[];
  onPressItem?: (item: ExpenseItem) => void;
  onLongPressItem?: (item: ExpenseItem) => void;
  onDeleteItem?: (item: ExpenseItem) => void;
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
const GRID_PADDING_Y = 8;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export function ExpenseGrid({
  items,
  onPressItem,
  onLongPressItem,
  onDeleteItem,
  isEditing = false,
  shakeAnim,
  onReorderPreview,
  onReorderCommit,
}: ExpenseGridProps) {
  const dragTranslate = React.useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragScale = React.useRef(new Animated.Value(1)).current;
  const startCategoryIndexRef = React.useRef<number>(-1);
  const targetCategoryIndexRef = React.useRef<number>(-1);
  const workingOrderIdsRef = React.useRef<string[]>([]);
  const panRespondersRef = React.useRef<Record<string, ReturnType<typeof PanResponder.create>>>({});
  const shiftValuesRef = React.useRef<Record<string, Animated.ValueXY>>({});
  const [draggingCategoryId, setDraggingCategoryId] = React.useState<string | null>(null);
  const [dragPreviewOrderIds, setDragPreviewOrderIds] = React.useState<string[] | null>(null);

  const categoryItems = React.useMemo(
    () => items.filter((item) => item.kind === "category"),
    [items],
  );
  const categoryIds = React.useMemo(
    () => categoryItems.map((item) => item.id),
    [categoryItems],
  );
  const categoryIndexById = React.useMemo(
    () => new Map(categoryIds.map((id, index) => [id, index])),
    [categoryIds],
  );
  const categoryIdsRef = React.useRef<string[]>(categoryIds);
  const categoryIndexByIdRef = React.useRef<Map<string, number>>(categoryIndexById);
  React.useEffect(() => {
    categoryIdsRef.current = categoryIds;
    categoryIndexByIdRef.current = categoryIndexById;
  }, [categoryIds, categoryIndexById]);

  const buildCategoryOrder = React.useCallback((fromIndex: number, toIndex: number) => {
    const nextIds = [...workingOrderIdsRef.current];
    const [movedId] = nextIds.splice(fromIndex, 1);
    if (!movedId) {
      return workingOrderIdsRef.current;
    }
    nextIds.splice(toIndex, 0, movedId);
    return nextIds;
  }, []);
  const getShiftValue = React.useCallback((id: string) => {
    if (!shiftValuesRef.current[id]) {
      shiftValuesRef.current[id] = new Animated.ValueXY({ x: 0, y: 0 });
    }
    return shiftValuesRef.current[id];
  }, []);

  const resolveTargetCategoryIndex = React.useCallback(
    (fromIndex: number, dx: number, dy: number) => {
      const fromRow = Math.floor(fromIndex / GRID_COLUMNS);
      const fromCol = fromIndex % GRID_COLUMNS;
      const startCenterX =
        GRID_PADDING_X + fromCol * (ITEM_WIDTH + ITEM_GAP_RIGHT) + ITEM_WIDTH / 2;
      const startCenterY =
        GRID_PADDING_Y + fromRow * (ITEM_HEIGHT + ITEM_GAP_BOTTOM) + ITEM_HEIGHT / 2;
      const targetCenterX = startCenterX + dx;
      const targetCenterY = startCenterY + dy;

      const targetCol = clamp(
        Math.round(
          (targetCenterX - GRID_PADDING_X - ITEM_WIDTH / 2) /
            (ITEM_WIDTH + ITEM_GAP_RIGHT),
        ),
        0,
        GRID_COLUMNS - 1,
      );
      const targetRow = Math.max(
        0,
        Math.round(
          (targetCenterY - GRID_PADDING_Y - ITEM_HEIGHT / 2) /
            (ITEM_HEIGHT + ITEM_GAP_BOTTOM),
        ),
      );
      return clamp(
        targetRow * GRID_COLUMNS + targetCol,
        0,
        Math.max(0, categoryItems.length - 1),
      );
    },
    [categoryItems.length],
  );

  const getStablePanResponder = React.useCallback(
    (itemId: string) => {
      const cached = panRespondersRef.current[itemId];
      if (cached) {
        return cached;
      }

      const responder = PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: () => {
          const categoryIndex = categoryIndexByIdRef.current.get(itemId) ?? -1;
          if (categoryIndex < 0) {
            return;
          }
          setDraggingCategoryId(itemId);
          dragTranslate.setValue({ x: 0, y: 0 });
          Animated.spring(dragScale, {
            toValue: 1.08,
            useNativeDriver: true,
            friction: 7,
            tension: 160,
          }).start();
          startCategoryIndexRef.current = categoryIndex;
          targetCategoryIndexRef.current = categoryIndex;
          workingOrderIdsRef.current = [...categoryIdsRef.current];
          setDragPreviewOrderIds([...categoryIdsRef.current]);
        },
        onPanResponderMove: (_, gestureState) => {
          if (startCategoryIndexRef.current < 0) {
            return;
          }
          dragTranslate.setValue({
            x: gestureState.dx,
            y: gestureState.dy,
          });
          const nextTargetIndex = resolveTargetCategoryIndex(
            startCategoryIndexRef.current,
            gestureState.dx,
            gestureState.dy,
          );
          if (nextTargetIndex === targetCategoryIndexRef.current) {
            return;
          }
          targetCategoryIndexRef.current = nextTargetIndex;
          setDragPreviewOrderIds(buildCategoryOrder(startCategoryIndexRef.current, nextTargetIndex));
        },
        onPanResponderRelease: () => {
          const fromIndex = startCategoryIndexRef.current;
          const toIndex = targetCategoryIndexRef.current;
          const hasReorder = fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex;
          if (hasReorder) {
            const nextIds = buildCategoryOrder(fromIndex, toIndex);
            setDraggingCategoryId(null);
            setDragPreviewOrderIds(null);
            dragTranslate.setValue({ x: 0, y: 0 });
            dragScale.setValue(1);
            onReorderPreview?.(nextIds);
            onReorderCommit?.(nextIds);
          } else {
            setDragPreviewOrderIds(null);
            Animated.spring(dragTranslate, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: true,
              friction: 12,
              tension: 160,
              overshootClamping: true,
            }).start(() => {
              setDraggingCategoryId(null);
            });
            Animated.timing(dragScale, {
              toValue: 1,
              duration: 120,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }).start();
          }
          startCategoryIndexRef.current = -1;
          targetCategoryIndexRef.current = -1;
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragTranslate, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 12,
            tension: 160,
            overshootClamping: true,
          }).start(() => {
            setDraggingCategoryId(null);
            setDragPreviewOrderIds(null);
          });
          Animated.timing(dragScale, {
            toValue: 1,
            duration: 120,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
          startCategoryIndexRef.current = -1;
          targetCategoryIndexRef.current = -1;
        },
        onPanResponderTerminationRequest: () => false,
      });

      panRespondersRef.current[itemId] = responder;
      return responder;
    },
    [buildCategoryOrder, dragScale, dragTranslate, onReorderCommit, onReorderPreview, resolveTargetCategoryIndex],
  );

  React.useEffect(() => {
    const previewOrder = dragPreviewOrderIds ?? categoryIds;
    const previewIndexById = new Map(previewOrder.map((id, index) => [id, index]));
    const animations: Animated.CompositeAnimation[] = [];

    for (const id of categoryIds) {
      const value = getShiftValue(id);
      const originalIndex = categoryIndexById.get(id) ?? -1;
      const previewIndex = previewIndexById.get(id) ?? originalIndex;
      const originalRow = Math.floor(originalIndex / GRID_COLUMNS);
      const originalCol = originalIndex % GRID_COLUMNS;
      const previewRow = Math.floor(previewIndex / GRID_COLUMNS);
      const previewCol = previewIndex % GRID_COLUMNS;

      const targetX =
        isEditing &&
        dragPreviewOrderIds &&
        id !== draggingCategoryId &&
        originalIndex >= 0 &&
        previewIndex >= 0 &&
        originalIndex !== previewIndex
          ? (previewCol - originalCol) * (ITEM_WIDTH + ITEM_GAP_RIGHT)
          : 0;
      const targetY =
        isEditing &&
        dragPreviewOrderIds &&
        id !== draggingCategoryId &&
        originalIndex >= 0 &&
        previewIndex >= 0 &&
        originalIndex !== previewIndex
          ? (previewRow - originalRow) * (ITEM_HEIGHT + ITEM_GAP_BOTTOM)
          : 0;

      animations.push(
        dragPreviewOrderIds
          ? Animated.spring(value, {
              toValue: { x: targetX, y: targetY },
              useNativeDriver: true,
              friction: 8,
              tension: 130,
              overshootClamping: true,
            })
          : Animated.timing(value, {
              toValue: { x: targetX, y: targetY },
              duration: 140,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
      );
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }
  }, [
    categoryIds,
    categoryIndexById,
    dragPreviewOrderIds,
    draggingCategoryId,
    getShiftValue,
    isEditing,
  ]);

  React.useEffect(() => {
    if (!isEditing) {
      setDraggingCategoryId(null);
      setDragPreviewOrderIds(null);
      dragTranslate.setValue({ x: 0, y: 0 });
      dragScale.setValue(1);
      startCategoryIndexRef.current = -1;
      targetCategoryIndexRef.current = -1;
    }
  }, [dragScale, dragTranslate, isEditing]);

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={GRID_COLUMNS}
      renderItem={({ item, index }) => (
        (() => {
          const isCategory = item.kind === "category";
          const isDragging = draggingCategoryId === item.id;
          const canDrag = isEditing && isCategory && (Boolean(onReorderPreview) || Boolean(onReorderCommit));
          const panResponder = canDrag ? getStablePanResponder(item.id) : null;
          const shiftValue = isCategory ? getShiftValue(item.id) : null;

          const transform: NonNullable<TransformsStyle["transform"]>[number][] = [];
          if (isCategory && isEditing && shakeAnim && !isDragging) {
            transform.push({ rotate: shakeAnim });
          }
          if (isCategory && isEditing && !isDragging && shiftValue) {
            transform.push({ translateX: shiftValue.x });
            transform.push({ translateY: shiftValue.y });
          }
          if (isDragging) {
            transform.push({ translateX: dragTranslate.x });
            transform.push({ translateY: dragTranslate.y });
            transform.push({ scale: dragScale });
          }

          return (
            <Animated.View
              style={[
                styles.item,
                index % GRID_COLUMNS !== GRID_COLUMNS - 1 ? styles.itemGapRight : null,
                isDragging ? styles.draggingItem : null,
                transform.length > 0 ? ({ transform } as any) : null,
              ]}
              {...(panResponder?.panHandlers ?? {})}
            >
              <ExpenseBox
                amount={item.amount}
                backgroundColor={item.backgroundColor}
                circleColor={item.circleColor}
                icon={item.icon}
                name={item.name}
                iconColor={item.iconColor}
                isAddCard={item.kind === "add"}
                isEditing={item.kind === "category" && isEditing}
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
        })()
      )}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      pointerEvents={isEditing ? "box-none" : "auto"}
      scrollEnabled={!isEditing || draggingCategoryId === null}
    />
  );
}

const styles = StyleSheet.create({
  content: {
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
  draggingItem: {
    zIndex: 100,
    elevation: 8,
  },
});
