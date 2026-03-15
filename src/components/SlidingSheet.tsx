import React, { useCallback, useEffect, useMemo } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

type SlidingSheetProps = {
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  onDismiss: () => void;
  heightPercent?: number;
  fitContent?: boolean;
  maxHeightPercent?: number;
  backdropOpacity?: number;
  closeThreshold?: number;
  closeOnBackdropPress?: boolean;
  showHandle?: boolean;
  sheetStyle?: StyleProp<ViewStyle>;
  handleStyle?: StyleProp<ViewStyle>;
  backdropStyle?: StyleProp<ViewStyle>;
};

export function SlidingSheet({
  children,
  onDismiss,
  heightPercent = 0.9,
  fitContent = false,
  maxHeightPercent = 0.9,
  backdropOpacity = 0.35,
  closeThreshold = 0.2,
  closeOnBackdropPress = true,
  showHandle = true,
  sheetStyle,
  handleStyle,
  backdropStyle,
}: SlidingSheetProps) {
  const { height } = useWindowDimensions();
  const clampedPercent = Math.min(Math.max(heightPercent, 0.1), 1);
  const clampedMaxHeightPercent = Math.min(Math.max(maxHeightPercent, 0.1), 1);
  const fixedSheetHeight = Math.round(height * clampedPercent);
  const maxSheetHeight = Math.round(height * clampedMaxHeightPercent);
  const initialDragLimit = fitContent ? height : fixedSheetHeight;
  const translateY = useSharedValue(initialDragLimit);
  const dragLimit = useSharedValue(initialDragLimit);
  const closing = useSharedValue(false);

  const finishDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const requestClose = useCallback(
    (velocityY?: number) => {
      if (closing.value) return;
      closing.value = true;

      const onFinish = (finished?: boolean) => {
        if (finished) {
          scheduleOnRN(finishDismiss);
        }
      };
      const dismissTarget = fitContent ? Math.max(1, dragLimit.value) : fixedSheetHeight;

      if (typeof velocityY === "number") {
        translateY.value = withSpring(
          dismissTarget,
          {
            damping: 24,
            stiffness: 260,
            velocity: velocityY,
            overshootClamping: true,
          },
          onFinish
        );
        return;
      }

      translateY.value = withTiming(
        dismissTarget,
        { duration: 220, easing: Easing.in(Easing.cubic) },
        onFinish
      );
    },
    [closing, dragLimit, finishDismiss, fitContent, fixedSheetHeight, translateY]
  );

  useEffect(() => {
    const entryStart = fitContent ? height : fixedSheetHeight;
    closing.value = false;
    dragLimit.value = entryStart;
    translateY.value = entryStart;
    const frame = requestAnimationFrame(() => {
      translateY.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [closing, dragLimit, fitContent, fixedSheetHeight, height, translateY]);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .onUpdate((event) => {
        const limit = Math.max(1, dragLimit.value);
        translateY.value = Math.min(limit, Math.max(0, event.translationY));
      })
      .onEnd((event) => {
        const limit = Math.max(1, dragLimit.value);
        const threshold = limit * closeThreshold;
        const shouldClose = event.translationY > threshold || event.velocityY > 1200;
        if (shouldClose) {
          if (closing.value) return;
          closing.value = true;
          translateY.value = withSpring(
            limit,
            {
              damping: 24,
              stiffness: 260,
              velocity: event.velocityY,
              overshootClamping: true,
            },
            (finished) => {
              if (finished) {
                scheduleOnRN(finishDismiss);
              }
            }
          );
        } else {
          translateY.value = withSpring(0, {
            damping: 24,
            stiffness: 260,
            velocity: event.velocityY,
            overshootClamping: true,
          });
        }
      });
  }, [closeThreshold, closing, dragLimit, finishDismiss, translateY]);

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    const limit = Math.max(1, dragLimit.value);
    const progress = 1 - Math.min(translateY.value / limit, 1);
    return { opacity: backdropOpacity * progress };
  });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const content = typeof children === "function" ? children(requestClose) : children;
  const BackdropWrapper = closeOnBackdropPress ? Pressable : View;
  const handleBackdropPress = closeOnBackdropPress ? () => requestClose() : undefined;

  return (
    <View style={styles.root}>
      <BackdropWrapper style={styles.backdropPressable} onPress={handleBackdropPress}>
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle, backdropStyle]} />
      </BackdropWrapper>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          onLayout={(event) => {
            if (fitContent) {
              const nextLimit = Math.max(1, event.nativeEvent.layout.height);
              if (Math.abs(nextLimit - dragLimit.value) > 1) {
                dragLimit.value = nextLimit;
              }
            }
          }}
          style={[
            styles.sheet,
            fitContent
              ? { maxHeight: maxSheetHeight }
              : { height: fixedSheetHeight },
            sheetAnimatedStyle,
            sheetStyle,
          ]}
        >
          {showHandle ? <View style={[styles.handleIndicator, handleStyle]} /> : null}
          {content}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },
  handleIndicator: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#2B2B2B",
    marginTop: 8,
  },
});
