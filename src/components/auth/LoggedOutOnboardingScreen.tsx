import React, { useEffect, useRef, useState } from "react";
import { useFonts } from "expo-font";
import { Nunito_400Regular, Nunito_400Regular_Italic, Nunito_700Bold } from "@expo-google-fonts/nunito";
import { Animated, Easing, Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LoggedOutOnboardingScreenProps = {
  onFinish: () => void | Promise<void>;
};

type OnboardingPage = {
  title: string;
  accentTitle?: string;
  subtitle: string;
  image: ImageSourcePropType;
};

const WAVING_IMAGE = require("../../../assets/images/waving.png");
const RECEIPT_AMICO = require("../../../assets/images/receipt/amico.png");
const RECEIPT_PANA = require("../../../assets/images/receipt/pana.png");
const RECEIPT_BRO = require("../../../assets/images/receipt/bro.png");
const RECEIPT_CUATE = require("../../../assets/images/receipt/cuate.png");
const RECEIPT_RAFIKI = require("../../../assets/images/receipt/rafiki.png");
const RECEIPT_GOODJOB = require("../../../assets/images/receipt/goodjob.png");
const CONFETTI_COLORS_BLUE = ["#93C5FD", "#60A5FA", "#3B82F6", "#2563EB", "#1D4ED8"] as const;
const CONFETTI_COLORS_ORANGE = ["#FDBA74", "#FB923C", "#F97316", "#EA580C", "#C2410C"] as const;
const CONFETTI_PARTICLE_COUNT = 42;
const CONFETTI_PIECES = Array.from({ length: CONFETTI_PARTICLE_COUNT }, (_, index) => {
  const angle = (index / CONFETTI_PARTICLE_COUNT) * Math.PI * 2;
  const ring = index % 3;
  const baseDistance = ring === 0 ? 82 : ring === 1 ? 116 : 146;
  const distance = baseDistance + ((index % 5) - 2) * 3;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    spin: index % 2 === 0 ? 300 : -300,
    width: index % 4 === 0 ? 9 : 7,
    height: index % 3 === 0 ? 5 : 4,
    colorIndex: index % CONFETTI_COLORS_BLUE.length,
  };
});

const ONBOARDING_PAGES: OnboardingPage[] = [
  {
    title: "Hi there!",
    subtitle: "Scan receipts and let AI organize your spending.",
    image: WAVING_IMAGE,
  },
  {
    title: "Control Your Spending",
    accentTitle: "Effortlessly",
    subtitle: "Budgefy helps you track and understand your money -- without manual input.",
    image: RECEIPT_AMICO,
  },
  {
    title: "Scan and Relax",
    subtitle: "Just scan your receipt. AI reads every item and logs the expense for you.",
    image: RECEIPT_PANA,
  },
  {
    title: "Our AI Agent Organizes",
    subtitle: "Budgefy analyzes your receipt and sorts each product into the right category.",
    image: RECEIPT_BRO,
  },
  {
    title: "See Your Spending Clearly",
    subtitle: "Smart insights and clean charts help you understand your habits and stay in control.",
    image: RECEIPT_CUATE,
  },
  {
    title: "Watch Your Saving Pile Up",
    subtitle: "Every scanned receipt is a step toward your goals.",
    image: RECEIPT_RAFIKI,
  },
  {
    title: "We're all set!",
    subtitle: "Your AI accountant is standing by. Grab a receipt and let's see what's inside.",
    image: RECEIPT_GOODJOB,
  },
];

export function LoggedOutOnboardingScreen({ onFinish }: LoggedOutOnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [fontsLoaded] = useFonts({
    Nunito_700Bold,
    Nunito_400Regular,
    Nunito_400Regular_Italic,
  });

  const currentPage = ONBOARDING_PAGES[step];
  const isFirstPage = step === 0;
  const isLastPage = step === ONBOARDING_PAGES.length - 1;
  const isConfettiPage = isFirstPage || isLastPage;
  const isSimplePage = isFirstPage || isLastPage;
  const showProgressDots = step >= 1;
  const activeDotIndex = step - 1;
  const dotCount = ONBOARDING_PAGES.length - 1;
  const confettiColors = isFirstPage ? CONFETTI_COLORS_BLUE : CONFETTI_COLORS_ORANGE;
  const bottomPadding = Math.max(insets.bottom + 10, 30);
  const dotAnimValues = useRef(
    Array.from({ length: dotCount }, (_, index) => new Animated.Value(index === activeDotIndex ? 1 : 0)),
  ).current;
  const pageTransition = useRef(new Animated.Value(1)).current;
  const imageBounce = useRef(new Animated.Value(0)).current;
  const bounceLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const confettiValues = useRef(CONFETTI_PIECES.map(() => new Animated.Value(0))).current;
  const confettiBurstRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const animations = dotAnimValues.map((value, index) =>
      Animated.timing(value, {
        toValue: index === activeDotIndex ? 1 : 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    );
    Animated.parallel(animations).start();
  }, [activeDotIndex, dotAnimValues]);

  useEffect(() => {
    pageTransition.setValue(0);
    imageBounce.setValue(0);
    bounceLoopRef.current?.stop();
    confettiBurstRef.current?.stop();
    confettiValues.forEach((value) => value.setValue(0));
    setShowConfetti(false);

    Animated.timing(pageTransition, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;

      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(imageBounce, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(imageBounce, {
            toValue: 0,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );

      bounceLoopRef.current = loop;
      loop.start();
    });

    return () => {
      bounceLoopRef.current?.stop();
      confettiBurstRef.current?.stop();
    };
  }, [confettiValues, imageBounce, pageTransition, step]);

  const handleWavingImagePress = () => {
    if (!isConfettiPage) return;

    confettiBurstRef.current?.stop();
    confettiValues.forEach((value) => value.setValue(0));
    setShowConfetti(true);

    const sequence = Animated.parallel(
      confettiValues.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 820,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    );

    confettiBurstRef.current = sequence;
    sequence.start(({ finished }) => {
      if (finished) {
        setShowConfetti(false);
      }
    });
  };

  const handlePrimaryPress = () => {
    if (isLastPage) {
      void onFinish();
      return;
    }
    setStep((prev) => prev + 1);
  };

  return (
    <View style={styles.screen}>
      <Animated.View
        style={[
          styles.pageTransitionWrap,
          {
            opacity: pageTransition,
            transform: [
              {
                translateY: pageTransition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
              {
                translateY: imageBounce.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -8],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.imageWrap, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={handleWavingImagePress} disabled={!isConfettiPage} style={styles.imageTapTarget}>
            <Image source={currentPage.image} resizeMode="contain" style={styles.heroImage} />

            {showConfetti ? (
              <View pointerEvents="none" style={styles.confettiLayer}>
                {CONFETTI_PIECES.map((piece, index) => (
                  <Animated.View
                    key={`confetti-${index}`}
                    style={[
                      styles.confettiPiece,
                      {
                        width: piece.width,
                        height: piece.height,
                        backgroundColor: confettiColors[piece.colorIndex],
                        opacity: confettiValues[index].interpolate({
                          inputRange: [0, 0.08, 0.75, 1],
                          outputRange: [0, 1, 1, 0],
                        }),
                        transform: [
                          {
                            translateX: confettiValues[index].interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, piece.x],
                            }),
                          },
                          {
                            translateY: confettiValues[index].interpolate({
                              inputRange: [0, 0.8, 1],
                              outputRange: [0, piece.y, piece.y + 18],
                            }),
                          },
                          {
                            rotate: confettiValues[index].interpolate({
                              inputRange: [0, 1],
                              outputRange: ["0deg", `${piece.spin}deg`],
                            }),
                          },
                          {
                            scale: confettiValues[index].interpolate({
                              inputRange: [0, 0.25, 1],
                              outputRange: [0.4, 1, 0.85],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </Pressable>
        </View>
      </Animated.View>

      {isSimplePage ? (
        <View
          style={[
            styles.simpleSection,
            isFirstPage ? styles.firstSimpleSection : null,
            isLastPage ? styles.lastSimpleSection : null,
            { paddingBottom: bottomPadding },
          ]}
        >
          <View
            style={[
              styles.simpleTextWrap,
              isFirstPage ? styles.firstSimpleTextWrap : null,
              isLastPage ? styles.lastSimpleTextWrap : null,
            ]}
          >
            <Text style={[styles.simpleTitle, fontsLoaded ? styles.nunitoBold : undefined]}>{currentPage.title}</Text>
            <Text style={[styles.simpleSubtitle, fontsLoaded ? styles.nunitoRegular : undefined]}>{currentPage.subtitle}</Text>
          </View>

          {isLastPage ? (
            <View style={styles.simpleDotsRow}>
              {Array.from({ length: dotCount }).map((_, index) => (
                <Animated.View
                  key={`simple-progress-dot-${index}`}
                  style={[
                    styles.simpleDot,
                    {
                      height: dotAnimValues[index].interpolate({ inputRange: [0, 1], outputRange: [8, 20] }),
                      backgroundColor: dotAnimValues[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: ["#9CA3AF", "#111827"],
                      }),
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}

          <Pressable style={styles.simpleButton} accessibilityRole="button" onPress={handlePrimaryPress}>
            <Text style={[styles.simpleButtonText, fontsLoaded ? styles.nunitoBold : undefined]}>
              {isLastPage ? "Let's Go!" : "Next"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.panel, { paddingBottom: bottomPadding }]}>
          <Text style={[styles.title, fontsLoaded ? styles.nunitoBold : undefined]}>{currentPage.title}</Text>
          {currentPage.accentTitle ? (
            <Text style={[styles.accentTitle, fontsLoaded ? styles.nunitoBold : undefined]}>{currentPage.accentTitle}</Text>
          ) : null}

          <Text style={[styles.subtitle, fontsLoaded ? styles.nunitoItalic : undefined]}>{currentPage.subtitle}</Text>

          {showProgressDots ? (
            <View style={styles.dotsRow}>
              {Array.from({ length: dotCount }).map((_, index) => (
                <Animated.View
                  key={`progress-dot-${index}`}
                  style={[
                    styles.dot,
                    {
                      height: dotAnimValues[index].interpolate({ inputRange: [0, 1], outputRange: [8, 18] }),
                      backgroundColor: dotAnimValues[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: ["#6B7280", "#FFFFFF"],
                      }),
                    },
                  ]}
                />
              ))}
            </View>
          ) : (
            <View style={styles.dotsSpacer} />
          )}

          <Pressable style={styles.primaryButton} accessibilityRole="button" onPress={handlePrimaryPress}>
            <Text style={[styles.primaryButtonText, fontsLoaded ? styles.nunitoBold : undefined]}>Next</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ECECEC",
  },
  pageTransitionWrap: {
    flex: 1,
  },
  imageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  imageTapTarget: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  heroImage: {
    width: "86%",
    height: "79%",
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  confettiPiece: {
    position: "absolute",
    borderRadius: 999,
  },
  simpleSection: {
    marginHorizontal: 18,
    marginBottom: 14,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  firstSimpleSection: {
    minHeight: 250,
  },
  lastSimpleSection: {
    minHeight: 250,
  },
  simpleTextWrap: {
    alignItems: "center",
  },
  firstSimpleTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  lastSimpleTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  simpleTitle: {
    color: "#111827",
    fontSize: 28,
    textAlign: "center",
  },
  simpleSubtitle: {
    marginTop: 12,
    color: "#374151",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  simpleDotsRow: {
    marginTop: 8,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  simpleDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#9CA3AF",
  },
  simpleButton: {
    width: "50%",
    height: 44,
    borderRadius: 999,
    marginTop: 20,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  simpleButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
  },
  panel: {
    marginHorizontal: 18,
    marginBottom: 14,
    borderRadius: 38,
    backgroundColor: "#000000",
    paddingHorizontal: 24,
    paddingTop: 50,
    minHeight: 250,
    alignItems: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    textAlign: "center",
  },
  accentTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    marginTop: 30,
    color: "#AAAAAA",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 15,
  },
  dotsRow: {
    marginTop: 40,
    marginBottom: 12,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dotsSpacer: {
    marginTop: 12,
    marginBottom: 28,
    height: 42,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#6B7280",
  },
  primaryButton: {
    width: "100%",
    height: 40,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#000000",
    fontSize: 18,
  },
  nunitoBold: {
    fontFamily: "Nunito_700Bold",
  },
  nunitoItalic: {
    fontFamily: "Nunito_400Regular_Italic",
  },
  nunitoRegular: {
    fontFamily: "Nunito_400Regular",
  },
});
