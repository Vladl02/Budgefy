import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { SafeArea } from "@/src/components/SafeArea";
import { supabase } from "@/src/utils/supabase";

type AuthMode = "sign-in" | "sign-up";

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const title = useMemo(() => (mode === "sign-in" ? "Sign in" : "Create account"), [mode]);
  const cta = useMemo(() => (mode === "sign-in" ? "Sign in" : "Sign up"), [mode]);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 6) {
      setFeedback("Use a valid email and a password with at least 6 characters.");
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

  return (
    <SafeArea>
      <View style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Use your Supabase email/password account.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="At least 6 characters"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>

          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            onPress={() => void submit()}
            style={[styles.submit, isSubmitting && styles.submitDisabled]}
          >
            {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>{cta}</Text>}
          </Pressable>

          <Pressable
            disabled={isSubmitting}
            onPress={() => setMode((prev) => (prev === "sign-in" ? "sign-up" : "sign-in"))}
            style={styles.switchMode}
          >
            <Text style={styles.switchModeText}>
              {mode === "sign-in" ? "No account? Sign up" : "Already have an account? Sign in"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  feedback: {
    fontSize: 12,
    color: "#B91C1C",
    lineHeight: 18,
  },
  submit: {
    height: 46,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  switchMode: {
    alignItems: "center",
    paddingTop: 2,
  },
  switchModeText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600",
  },
});
