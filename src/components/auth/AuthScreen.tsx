import { Feather, FontAwesome } from "@expo/vector-icons";
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeArea } from "@/src/components/SafeArea";
import { supabase } from "@/src/utils/supabase";

type AuthMode = "sign-in" | "sign-up";

export function AuthScreen() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const decorDrift = useRef(new Animated.Value(0)).current;
  const signUpShake = useRef(new Animated.Value(0)).current;

  const isSignIn = mode === "sign-in";
  const title = useMemo(() => (mode === "sign-in" ? "Login here" : "Create account"), [mode]);
  const cta = useMemo(() => (mode === "sign-in" ? "Sign in" : "Create Account"), [mode]);
  const subtitle = useMemo(
    () =>
      mode === "sign-in"
        ? "Welcome back you've\nbeen missed!"
        : "Create an account so you can explore all Budgefy's Features!",
    [mode],
  );

  useEffect(() => {
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(decorDrift, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(decorDrift, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    driftLoop.start();
    return () => driftLoop.stop();
  }, [decorDrift]);

  useEffect(() => {
    if (isSignIn) {
      signUpShake.setValue(0);
      return;
    }

    const shakeStep = Animated.sequence([
      Animated.timing(signUpShake, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(signUpShake, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.timing(signUpShake, { toValue: -1, duration: 140, useNativeDriver: true }),
      Animated.timing(signUpShake, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.timing(signUpShake, { toValue: 0, duration: 110, useNativeDriver: true }),
    ]);

    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(3000),
        shakeStep,
      ]),
    );

    shakeLoop.start();
    return () => shakeLoop.stop();
  }, [isSignIn, signUpShake]);

  const topDecorX = decorDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });
  const topDecorY = decorDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });
  const bottomDecorX = decorDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 50],
  });
  const bottomDecorY = decorDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });
  const signUpShakeX = signUpShake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-4, 4],
  });

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 6) {
      setFeedback("Use a valid email and a password with at least 6 characters.");
      return;
    }
    if (!isSignIn && password !== confirmPassword) {
      setFeedback("Passwords do not match.");
      return;
    }

    setFeedback(null);
    setIsSubmitting(true);
    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) {
          setFeedback(error.message);
        }
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });
      if (error) {
        setFeedback(error.message);
        return;
      }

      if (!data.session) {
        setFeedback("Check your email to confirm your account, then sign in.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Auth failed";
      setFeedback(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const recoverPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setFeedback("Enter your email first, then tap forgot password.");
      return;
    }

    setFeedback(null);
    setIsRecoveringPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
      if (error) {
        setFeedback(error.message);
        return;
      }
      setFeedback("Password reset email sent.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send reset email";
      setFeedback(message);
    } finally {
      setIsRecoveringPassword(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <SafeArea style={styles.safeArea}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#0B0B0D" />
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View
          pointerEvents="none"
          style={[styles.decorTopPrimary, { transform: [{ translateX: topDecorX }, { translateY: topDecorY }] }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.decorTopOutline, { transform: [{ translateX: topDecorX }, { translateY: topDecorY }] }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.decorBottomOutlineA,
            { transform: [{ translateX: bottomDecorX }, { translateY: bottomDecorY }, { rotate: "36deg" }] },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.decorBottomOutlineB, { transform: [{ translateX: bottomDecorX }, { translateY: bottomDecorY }] }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.decorBottomOutlineC, { transform: [{ translateX: bottomDecorX }, { translateY: bottomDecorY }] }]}
        />

        <ScrollView
          bounces
          alwaysBounceVertical
          overScrollMode="always"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.headlineWrap}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor="#66676C"
              style={[styles.input, styles.emailInput]}
            />

            <View style={[styles.input, styles.passwordInput, styles.passwordInputWrap]}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showPassword}
                placeholder="Password"
                placeholderTextColor="#66676C"
                style={styles.passwordInputText}
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeButton}
                hitSlop={8}
              >
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#5A5A60" />
              </Pressable>
            </View>

            {!isSignIn ? (
              <View style={[styles.input, styles.passwordInput, styles.passwordInputWrap]}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Confirm password"
                  placeholderTextColor="#66676C"
                  style={styles.passwordInputText}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  style={styles.eyeButton}
                  hitSlop={8}
                >
                  <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={18} color="#5A5A60" />
                </Pressable>
              </View>
            ) : null}

            {isSignIn ? (
              <Pressable disabled={isRecoveringPassword || isSubmitting} onPress={() => void recoverPassword()}>
                <Text style={styles.forgotPasswordText}>
                  {isRecoveringPassword ? "Sending reset link..." : "Forgot your password?"}
                </Text>
              </Pressable>
            ) : null}

            {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

            <Animated.View style={!isSignIn ? { transform: [{ translateX: signUpShakeX }] } : undefined}>
              <Pressable
                disabled={isSubmitting || isRecoveringPassword}
                onPress={() => void submit()}
                style={[styles.submitButton, (isSubmitting || isRecoveringPassword) && styles.submitButtonDisabled]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>{cta}</Text>
                )}
              </Pressable>
            </Animated.View>

            <Pressable
              disabled={isSubmitting || isRecoveringPassword}
              onPress={() => setMode((prev) => (prev === "sign-in" ? "sign-up" : "sign-in"))}
              style={styles.switchModeButton}
            >
              <Text style={styles.switchModeText}>
                {isSignIn ? "Create new account" : "Back to sign in"}
              </Text>
            </Pressable>

            <View style={styles.socialSection}>
              <Text style={styles.socialTitle}>Or continue with</Text>
              <View style={styles.socialRow}>
                <Pressable style={styles.socialButton}>
                  <FontAwesome name="google" size={22} color="#0C0C0D" />
                </Pressable>
                <Pressable style={styles.socialButton}>
                  <FontAwesome name="facebook" size={24} color="#0C0C0D" />
                </Pressable>
                <Pressable style={styles.socialButton}>
                  <FontAwesome name="apple" size={24} color="#0C0C0D" />
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#ffffff",
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingTop: 48,
    paddingBottom: 26,
    paddingHorizontal: 24,
  },
  decorTopPrimary: {
    position: "absolute",
    right: -358,
    top: -298,
    width: 580,
    height: 580,
    borderRadius: 290,
    backgroundColor: "#F8F9FF",
  },
  decorTopOutline: {
    position: "absolute",
    right: -348,
    top: -358,
    width: 720,
    height: 720,
    borderRadius: 360,
    borderWidth: 3,
    borderColor: "#F8F9FF",
  },
  decorBottomOutlineA: {
    position: "absolute",
    left: -230,
    bottom: 88,
    width: 332,
    height: 332,
    borderWidth: 3,
    borderColor: "#F8F9FF",
    transform: [{ rotate: "36deg" }],
  },
  decorBottomOutlineB: {
    position: "absolute",
    left: -16,
    bottom: 34,
    width: 3,
    height: 232,
    backgroundColor: "#F8F9FF",
  },
  decorBottomOutlineC: {
    position: "absolute",
    left: 14,
    bottom: 208,
    width: 66,
    height: 3,
    backgroundColor: "#F8F9FF",
  },
  headlineWrap: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 38,
  },
  title: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 38,
    lineHeight: 42,
    color: "#0B0B0D",
    marginBottom: 16,
  },
  subtitle: {
    textAlign: "center",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    lineHeight: 20,
    color: "#000000",
    paddingHorizontal:10,
  },
  form: {
    gap: 14,
  },
  input: {
    height: 58,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#111114",
    backgroundColor: "#F1F4FF",
  },
  emailInput: {
    borderWidth: 2,
    borderColor: "#0E0E10",
    backgroundColor: "#F1F4FF",
  },
  passwordInput: {
    borderWidth: 0,
  },
  passwordInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 14,
  },
  passwordInputText: {
    flex: 1,
    height: "100%",
    paddingLeft: 0,
    paddingRight: 8,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#111114",
  },
  eyeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  forgotPasswordText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "#111114",
    textAlign: "right",
    marginTop: 2,
    marginBottom: 6,
  },
  feedback: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 19,
    color: "#B42318",
  },
  submitButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: "#050507",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 9,
  },
  submitButtonDisabled: {
    opacity: 0.75,
  },
  submitButtonText: {
    fontFamily: "Inter_800ExtraBold",
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 22,
  },
  switchModeButton: {
    alignItems: "center",
    marginTop: 20,
  },
  switchModeText: {
    fontFamily: "Inter_700Bold",
    color: "#5A5A60",
    fontSize: 15,
    lineHeight: 20,
  },
  socialSection: {
    alignItems: "center",
    marginTop: 56,
    gap: 14,
  },
  socialTitle: {
    fontFamily: "Inter_700Bold",
    color: "#111114",
    fontSize: 15,
    lineHeight: 20,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  socialButton: {
    width: 62,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#E9E9EA",
    alignItems: "center",
    justifyContent: "center",
  },
});
