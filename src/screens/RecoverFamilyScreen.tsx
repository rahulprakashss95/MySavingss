import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { findFamiliesForCredentials } from "../../database/query";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import type { FamilyModel } from "../models/FamilyModel";
import type { LoginUserModel } from "../models/LoginUserModel";
import { rememberFamily, signInWithCredentials } from "../utils/auth";
import { useRouter } from "expo-router";
import { ThemeColors, tint } from "../utils/Color";
import { showToast } from "../utils/Utils";

type Match = { family: FamilyModel; user: LoginUserModel };

const RecoverFamilyScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // null = haven't searched yet; [] = searched, nothing matched.
  const [results, setResults] = useState<Match[] | null>(null);

  const handleFind = () => {
    if (!username.trim() || !password) {
      showToast(
        "info",
        "Enter your details",
        "Type your username and password.",
        "bottom"
      );
      return;
    }
    setIsLoading(true);
    setResults(null);
    findFamiliesForCredentials(username.trim(), password)
      .then((matches) => {
        setResults(matches);
        if (!matches.length) {
          showToast(
            "error",
            "No match found",
            "No account matches that username and password.",
            "bottom"
          );
        }
      })
      .catch((error) => {
        console.log("RecoverError", error);
        showToast("error", "Something went wrong", "Please try again.", "bottom");
      })
      .finally(() => setIsLoading(false));
  };

  const copyId = async (code: string) => {
    await Clipboard.setStringAsync(code);
    showToast("success", "Copied", `Family ID "${code}" copied.`, "bottom");
  };

  const continueAs = async (match: Match) => {
    try {
      // Finding the family only proved the credentials are good somewhere — it
      // deliberately leaves no session behind. Signing in for the family the
      // user actually picked is what gives the app one, and without it every
      // subsequent read would come back empty.
      const session = await signInWithCredentials(
        match.family.id,
        match.user.username,
        password
      );
      if (!session) {
        showToast("error", "Unable to continue", "Please try again.", "bottom");
        return;
      }
      rememberFamily(match.family);
      await signIn(session);
    } catch (error) {
      console.log("RecoverSignInError", error);
      showToast("error", "Unable to continue", "Please try again.", "bottom");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="help-buoy-outline" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>Find your Family ID</Text>
          <Text style={styles.subtitle}>
            Enter your own username and password and we'll show the family it
            belongs to.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor={colors.placeholder}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, styles.labelSpacing]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onSubmitEditing={handleFind}
              returnKeyType="go"
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          <Button
            onPress={handleFind}
            title="Find my family"
            loading={isLoading}
            buttonStyle={styles.findButton}
          />
        </View>

        {results?.map((match) => (
          <View key={match.family.id} style={styles.resultCard}>
            <Text style={styles.resultName} numberOfLines={1}>
              {match.family.name}
            </Text>
            <Pressable
              style={styles.idRow}
              onPress={() => copyId(match.family.code)}
              accessibilityRole="button"
              accessibilityLabel="Copy Family ID"
            >
              <Text style={styles.idLabel}>Family ID</Text>
              <Text style={styles.idValue}>{match.family.code}</Text>
              <Ionicons name="copy-outline" size={16} color={colors.primary} />
            </Pressable>
            <Button
              onPress={() => continueAs(match)}
              title="Continue to HomeVault"
              buttonStyle={styles.continueButton}
            />
          </View>
        ))}

        {results && results.length === 0 && (
          <Text style={styles.noResult}>
            No account matches those details. Check your username and password,
            or ask your family admin for the Family ID.
          </Text>
        )}

        <Pressable
          onPress={() => router.push("/login")}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.backLink}
        >
          <Text style={styles.backText}>
            <Text style={styles.backCta}>Back to login</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, justifyContent: "center", padding: 24 },
    brand: { alignItems: "center", marginBottom: 24 },
    logo: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(colors.primary),
      marginBottom: 16,
    },
    title: { fontSize: 24, fontWeight: "700", color: colors.text },
    subtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 6,
      textAlign: "center",
      lineHeight: 19,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    labelSpacing: { marginTop: 18 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 13,
      fontSize: 15,
      color: colors.text,
    },
    passwordRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 12,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 13,
      fontSize: 15,
      color: colors.text,
    },
    findButton: { width: "100%", marginTop: 22 },
    resultCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 18,
      marginTop: 16,
    },
    resultName: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      textTransform: "capitalize",
    },
    idRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: tint(colors.primary),
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 12,
    },
    idLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginRight: 10,
    },
    idValue: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      color: colors.primary,
    },
    continueButton: { width: "100%", marginTop: 16 },
    noResult: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
      marginTop: 16,
    },
    backLink: { alignItems: "center", marginTop: 22 },
    backText: { fontSize: 14, color: colors.textMuted },
    backCta: { color: colors.primary, fontWeight: "700" },
  });

export default RecoverFamilyScreen;
