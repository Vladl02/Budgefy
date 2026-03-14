import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { SlidingSheet } from "@/src/components/SlidingSheet"; // Adjust path as needed
import { useAppTheme } from "@/src/providers/AppThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import {
  DEFAULT_LANGUAGE,
  getLanguagePreference,
  setLanguagePreference,
} from "@/src/utils/preferences";

const LANGUAGE_OPTIONS = [
  { code: "EN", name: "English" },
  { code: "ES", name: "Spanish" },
  { code: "FR", name: "French" },
  { code: "DE", name: "German" },
  { code: "ZH", name: "Chinese" },
  { code: "JA", name: "Japanese" },
  { code: "RU", name: "Russian" },
  { code: "AR", name: "Arabic" },
  { code: "HI", name: "Hindi" },
  { code: "PT", name: "Portuguese" },
  { code: "IT", name: "Italian" },
  { code: "KO", name: "Korean" },
  { code: "NL", name: "Dutch" },
  { code: "SV", name: "Swedish" },
  { code: "TR", name: "Turkish" },
  { code: "PL", name: "Polish" },
  { code: "VI", name: "Vietnamese" },
  { code: "ID", name: "Indonesian" },
];

const LANGUAGE_REGION_MAP: Record<string, string> = {
  EN: "US",
  ES: "ES",
  FR: "FR",
  DE: "DE",
  ZH: "CN",
  JA: "JP",
  RU: "RU",
  AR: "SA",
  HI: "IN",
  PT: "PT",
  IT: "IT",
  KO: "KR",
  NL: "NL",
  SV: "SE",
  TR: "TR",
  PL: "PL",
  VI: "VN",
  ID: "ID",
};

const toFlagEmoji = (regionCode: string): string =>
  String.fromCodePoint(
    ...regionCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0)),
  );

const languageFlag = (languageCode: string): string => {
  const regionCode = LANGUAGE_REGION_MAP[languageCode];
  if (!regionCode) return "🏳️";
  return toFlagEmoji(regionCode);
};

export default function LanguageScreen() {
  const { isDark } = useAppTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dbExpo = useSQLiteContext();
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE);
  const listBottomPadding = insets.bottom + 96;

  useEffect(() => {
    let isActive = true;
    const loadCurrentLanguage = async () => {
      try {
        const storedLanguage = await getLanguagePreference(dbExpo);
        if (isActive) {
          setSelectedLanguage(storedLanguage.toUpperCase());
        }
      } catch (error) {
        console.error("Failed to load language preference", error);
      }
    };

    void loadCurrentLanguage();
    return () => {
      isActive = false;
    };
  }, [dbExpo]);

  // This handles the physical closing of the router modal
  const handleDismiss = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const parent = navigation.getParent();
    if (parent?.canGoBack()) {
      parent.goBack();
      return;
    }
    router.replace("/(tabs)/settings");
  };

  return (
    <View style={styles.screenWrapper}>
      <SlidingSheet 
        onDismiss={handleDismiss} 
        heightPercent={0.72} 
        backdropOpacity={0.4}
        sheetStyle={isDark ? styles.sheetContainerDark : undefined}
        handleStyle={isDark ? styles.sheetHandleDark : undefined}
      >
        {(closeSheet) => (
          <View style={styles.container}>
            <Text style={[styles.title, isDark ? styles.titleDark : null]}>Select language</Text>
            
            <ScrollView 
              style={styles.scroll}
              contentContainerStyle={[styles.list, { paddingBottom: listBottomPadding }]}
              scrollIndicatorInsets={{ bottom: listBottomPadding }}
              showsVerticalScrollIndicator={false}
            >
              {LANGUAGE_OPTIONS.map((option) => {
                const isActive = option.code === selectedLanguage;
                return (
                  <Pressable
                    key={option.code}
                    onPress={async () => {
                      const nextLanguage = option.code.toUpperCase();
                      setSelectedLanguage(nextLanguage);
                      try {
                        await setLanguagePreference(dbExpo, nextLanguage);
                      } catch (error) {
                        console.error("Failed to save language preference", error);
                      }
                      closeSheet(); // This triggers the animation, then calls handleDismiss
                    }}
                    style={[
                      styles.row,
                      isDark ? styles.rowDark : null,
                      isActive ? styles.rowActive : null,
                      isDark && isActive ? styles.rowActiveDark : null,
                    ]}
                  >
                    <Text style={[styles.code, isDark ? styles.codeDark : null]}>
                      {languageFlag(option.code)} {option.code}
                    </Text>
                    <Text style={[styles.name, isDark ? styles.nameDark : null]}>{option.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </SlidingSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: "transparent", // Important: allows backdrop to see through to previous screen
  },
  container: {
    flex: 1, // Let container fill the sheet height
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sheetContainerDark: {
    backgroundColor: "#1C1C1D",
  },
  sheetHandleDark: {
    backgroundColor: "#9CA3AF",
  },
  scroll: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 20,
    textAlign: "center",
  },
  titleDark: {
    color: "#F9FAFB",
  },
  list: {
    gap: 10,
    paddingBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#F3F3F3",
  },
  rowDark: {
    backgroundColor: "#1C1C1D",
    borderWidth: 1,
    borderColor: "#2E2E2E",
  },
  rowActive: {
    backgroundColor: "#0e162136",
    borderWidth: 1,
    borderColor: "#0E1621",
  },
  rowActiveDark: {
    backgroundColor: "#111111",
    borderColor: "#4B5563",
  },
  code: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  codeDark: {
    color: "#F9FAFB",
  },
  name: {
    fontSize: 13,
    color: "#4E4E4E",
  },
  nameDark: {
    color: "#D1D5DB",
  },
});
