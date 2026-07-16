import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { getFamilyByCode } from "../../database/firebaseQuery";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import type { FamilyModel } from "../models/FamilyModel";
import {
  LAST_FAMILY_KEY,
  rememberFamily,
  signInWithCredentials,
} from "../utils/auth";
import { ThemeColors, tint } from "../utils/Color";
import { NavigationProp, showToast } from "../utils/Utils";

type Props = {
  navigation: NavigationProp;
};

type FocusField = "family" | "username" | "password" | null;

const LoginScreen = ({ navigation }: Props) => {
  const [familyCode, setFamilyCode] = useState("");
  // The resolved family for the typed code. `notFound` distinguishes "haven't
  // looked up yet" (null + false) from "looked up, nothing there" (null + true).
  const [family, setFamily] = useState<FamilyModel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  // Collapse the Family ID field once we know a family from a previous login;
  // a "Change" link re-opens it.
  const [showFamilyField, setShowFamilyField] = useState(true);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusField>(null);

  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Restore the last family so the field starts collapsed for returning users.
  useEffect(() => {
    AsyncStorage.getItem(LAST_FAMILY_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as FamilyModel;
        if (parsed && parsed.id && parsed.code) {
          setFamily(parsed);
          setFamilyCode(parsed.code);
          setShowFamilyField(false);
        }
      })
      .catch((error) => console.log("RestoreFamilyError", error));
  }, []);

  /** Looks up the family for the typed code; returns it (or null) and records it. */
  const resolveFamily = async (): Promise<FamilyModel | null> => {
    const code = familyCode.trim();
    if (!code) {
      setFamily(null);
      setNotFound(false);
      return null;
    }
    // Already resolved to this exact code — don't re-fetch.
    if (family && family.code === code.toLowerCase().replace(/\s+/g, "_")) {
      return family;
    }
    setIsResolving(true);
    try {
      const found = await getFamilyByCode(code);
      setFamily(found);
      setNotFound(!found);
      return found;
    } catch (error) {
      console.log("ResolveFamilyError", error);
      setFamily(null);
      return null;
    } finally {
      setIsResolving(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const resolved = await resolveFamily();
      if (!resolved) {
        showToast(
          "error",
          "Family not found",
          "Check the Family ID and try again.",
          "bottom"
        );
        return;
      }
      const session = await signInWithCredentials(
        resolved.id,
        username.trim(),
        password
      );
      if (session) {
        // Remember this family so next time the field starts collapsed.
        rememberFamily(resolved);
        // Persisting the session keeps the user logged in across restarts; the
        // navigator swaps to the app stack as soon as this resolves.
        await signIn(session);
      } else {
        showToast(
          "error",
          "Login Error",
          "Either username or password is incorrect",
          "bottom"
        );
      }
    } catch (error) {
      console.log("LoginError", error);
      showToast("error", "Login Error", "Something went wrong.", "bottom");
    } finally {
      setIsLoading(false);
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
            <Ionicons name="wallet-outline" size={34} color={colors.primary} />
          </View>
          <Text style={styles.title}>HomeVault</Text>
          {family ? (
            <Text style={styles.welcome} numberOfLines={2}>
              Welcome to {family.name}
            </Text>
          ) : (
            <Text style={styles.subtitle}>
              Enter your Family ID to sign in.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          {showFamilyField ? (
            <>
              <Text style={styles.label}>Family ID</Text>
              <View
                style={[
                  styles.inputRow,
                  focusedField === "family" && styles.inputRowFocused,
                  notFound && styles.inputRowError,
                ]}
              >
                <Ionicons
                  name="home-outline"
                  size={18}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. smith_family"
                  placeholderTextColor={colors.placeholder}
                  value={familyCode}
                  onChangeText={(value) => {
                    setFamilyCode(value);
                    // Any edit invalidates a previous lookup.
                    if (family || notFound) {
                      setFamily(null);
                      setNotFound(false);
                    }
                  }}
                  onFocus={() => setFocusedField("family")}
                  onBlur={() => {
                    setFocusedField(null);
                    resolveFamily();
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    resolveFamily();
                    usernameRef.current?.focus();
                  }}
                />
                {isResolving && (
                  <Ionicons
                    name="sync-outline"
                    size={16}
                    color={colors.textMuted}
                  />
                )}
                {!isResolving && family && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.positive}
                  />
                )}
              </View>
              {notFound && (
                <Text style={styles.errorHint}>
                  No family found with that ID.
                </Text>
              )}
            </>
          ) : (
            <View style={styles.familyChip}>
              <Ionicons
                name="home"
                size={18}
                color={colors.primary}
                style={styles.inputIcon}
              />
              <Text style={styles.familyChipName} numberOfLines={1}>
                {family?.name ?? familyCode}
              </Text>
              <Pressable
                onPress={() => setShowFamilyField(true)}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.changeText}>Change</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            onPress={() => navigation.navigate("RecoverFamily")}
            accessibilityRole="button"
            hitSlop={6}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotText}>Forgot your Family ID?</Text>
          </Pressable>

          <Text style={[styles.label, styles.labelSpacing]}>Username</Text>
          <View
            style={[
              styles.inputRow,
              focusedField === "username" && styles.inputRowFocused,
            ]}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              ref={usernameRef}
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={colors.placeholder}
              value={username}
              onChangeText={setUsername}
              onFocus={() => setFocusedField("username")}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          <Text style={[styles.label, styles.labelSpacing]}>Password</Text>
          <View
            style={[
              styles.inputRow,
              focusedField === "password" && styles.inputRowFocused,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!isPasswordVisible}
              autoCapitalize="none"
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />
            <Pressable
              onPress={() => setIsPasswordVisible((visible) => !visible)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={
                isPasswordVisible ? "Hide password" : "Show password"
              }
            >
              <Ionicons
                name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          <Button
            onPress={handleLogin}
            title="Login"
            loading={isLoading}
            buttonStyle={styles.loginButton}
          />
        </View>

        <Pressable
          onPress={() => navigation.navigate("Register")}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.registerLink}
        >
          <Text style={styles.registerText}>
            New family? <Text style={styles.registerCta}>Register here</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flexGrow: 1,
      justifyContent: "center",
      padding: 24,
    },
    brand: {
      alignItems: "center",
      marginBottom: 32,
    },
    logo: {
      width: 72,
      height: 72,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(colors.primary),
      marginBottom: 18,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 6,
      textAlign: "center",
      lineHeight: 20,
    },
    welcome: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.primary,
      marginTop: 8,
      textAlign: "center",
      textTransform: "capitalize",
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 2,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    labelSpacing: {
      marginTop: 18,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 12,
    },
    inputRowFocused: {
      borderColor: colors.primary,
    },
    inputRowError: {
      borderColor: colors.negative,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.text,
    },
    errorHint: {
      fontSize: 12,
      color: colors.negative,
      marginTop: 6,
    },
    familyChip: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    familyChipName: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      textTransform: "capitalize",
    },
    changeText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary,
    },
    forgotLink: {
      alignSelf: "flex-start",
      marginTop: 10,
    },
    forgotText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: "600",
    },
    loginButton: {
      width: "100%",
      marginTop: 26,
    },
    registerLink: {
      alignItems: "center",
      marginTop: 22,
    },
    registerText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    registerCta: {
      color: colors.primary,
      fontWeight: "700",
    },
  });

export default LoginScreen;
