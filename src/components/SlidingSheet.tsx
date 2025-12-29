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
  const sheetHeight = Math.round(height * clampedPercent);
  const translateY = useSharedValue(sheetHeight);
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

      if (typeof velocityY === "number") {
        translateY.value = withSpring(
          sheetHeight,
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
        sheetHeight,
        { duration: 220, easing: Easing.in(Easing.cubic) },
        onFinish
      );
    },
    [closing, finishDismiss, sheetHeight, translateY]
  );

  useEffect(() => {
    translateY.value = sheetHeight;
    requestAnimationFrame(() => {
      translateY.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
    });
  }, [sheetHeight, translateY]);

  const panGesture = useMemo(() => {
    const threshold = sheetHeight * closeThreshold;
    return Gesture.Pan()
      .onUpdate((event) => {
        translateY.value = Math.min(sheetHeight, Math.max(0, event.translationY));
      })
      .onEnd((event) => {
        const shouldClose = event.translationY > threshold || event.velocityY > 1200;
        if (shouldClose) {
          scheduleOnRN(requestClose, event.velocityY);
        } else {
          translateY.value = withSpring(0, {
            damping: 24,
            stiffness: 260,
            velocity: event.velocityY,
            overshootClamping: true,
          });
        }
      });
  }, [closeThreshold, requestClose, sheetHeight, translateY]);

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    const progress = sheetHeight > 0 ? 1 - Math.min(translateY.value / sheetHeight, 1) : 0;
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
        <Animated.View style={[styles.sheet, { height: sheetHeight }, sheetAnimatedStyle, sheetStyle]}>
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
