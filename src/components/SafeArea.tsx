import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/providers/AppThemeProvider";

type SafeAreaProps = ViewProps & {
  children: React.ReactNode;
  top?: boolean;
  bottom?: boolean;
};

export function SafeArea({ children, style, top, bottom, ...rest }: SafeAreaProps) {
  const insets = useSafeAreaInsets();
  const { appColors } = useAppTheme();
  const hasEdgeOverride = top !== undefined || bottom !== undefined;

  return (
    <View
      style={[
        styles.base,
        {
          paddingTop: hasEdgeOverride ? (top ? insets.top : 0) : insets.top,
          paddingBottom: hasEdgeOverride ? (bottom ? insets.bottom : 0) : insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          backgroundColor: appColors.background,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1 },
});
