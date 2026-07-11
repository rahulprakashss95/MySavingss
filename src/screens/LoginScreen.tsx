import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
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
import { getLoginUser } from "../../database/firebaseQuery";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors, tint } from "../utils/Color";
import { showToast } from "../utils/Utils";

const LoginScreen = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<"username" | "password" | null>(
    null
  );
  const passwordRef = useRef<TextInput>(null);
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleLogin = () => {
    setIsLoading(true);
    getLoginUser(username, password)
      .then((data: any) => {
        console.log("LoginData", data);
        if (data) {
          signIn({ username, ...data });
        } else {
         showErrorToast();
    }
      })
      .catch((error) => {
        console.log("LoginError", error);
         showErrorToast();
      })
      .finally(() => setIsLoading(false));

    // Persisting the session is what keeps the user logged in across restarts;
    // the navigator swaps to the app stack as soon as this resolves.
    //signIn({ username });
  };

  const showErrorToast = () => {
    showToast(
      "error",
      "Login Error",
      "Either username or password is incorrect",
      "bottom"
    );
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
          <Text style={styles.subtitle}>
            Sign in to track your deposits and portfolio.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
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
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.text,
    },
    loginButton: {
      width: "100%",
      marginTop: 26,
    },
  });

export default LoginScreen;
