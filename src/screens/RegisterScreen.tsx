import { Ionicons } from "@expo/vector-icons";
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
import {
  createFamily,
  createLoginUser,
  isFamilyCodeAvailable,
} from "../../database/firebaseQuery";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { MODULE_KEYS } from "../models/common";
import { normalizeFamilyCode } from "../models/FamilyModel";
import { MIN_PASSWORD_LENGTH, validatePassword } from "../utils/passwordStrength";
import { ThemeColors, tint } from "../utils/Color";
import { NavigationProp, showToast } from "../utils/Utils";

type Props = {
  navigation: NavigationProp;
};

const RegisterScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [familyName, setFamilyName] = useState("");
  // The code auto-tracks the name until the user edits it directly.
  const [familyCode, setFamilyCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Validate on focus-out so problems surface before the user hits Register.
  const validatePasswordField = () =>
    setPasswordError(
      password ? validatePassword(password, { username: username.trim() }) : null
    );
  const validateConfirmField = () =>
    setConfirmError(
      confirm && confirm !== password ? "Passwords do not match." : null
    );

  const effectiveCode = codeTouched
    ? normalizeFamilyCode(familyCode)
    : normalizeFamilyCode(familyName);

  const onFamilyNameChange = (value: string) => {
    setFamilyName(value);
    if (!codeTouched) {
      setFamilyCode(normalizeFamilyCode(value));
    }
  };

  const fail = (message: string) =>
    showToast("error", "Cannot register", message, "bottom");

  const handleRegister = async () => {
    const name = familyName.trim();
    const code = effectiveCode;
    const uname = username.trim();

    if (!name) return fail("Enter a family name.");
    if (!code) return fail("Enter a family ID.");
    if (!uname) return fail("Enter an admin username.");
    const passwordError = validatePassword(password, { username: uname });
    if (passwordError) return fail(passwordError);
    if (password !== confirm) return fail("Passwords do not match.");

    setIsLoading(true);
    try {
      // Only the family ID needs to be globally unique; the admin username lives
      // inside this brand-new family, so it can't collide with anything yet.
      if (!(await isFamilyCodeAvailable(code))) {
        fail(`Family ID "${code}" is already taken.`);
        return;
      }

      const family = await createFamily({
        name,
        code,
        createdAt: new Date().toISOString(),
      });
      const userId = await createLoginUser({
        familyId: family.id,
        username: uname,
        name: adminName.trim() || undefined,
        role: "admin",
        // The founding admin gets every module.
        moduleAccess: [...MODULE_KEYS],
        password,
      });

      await signIn({
        id: userId,
        username: uname,
        name: adminName.trim() || undefined,
        familyId: family.id,
        familyName: family.name,
        familyCode: family.code,
        role: "admin",
        moduleAccess: [...MODULE_KEYS],
      });
    } catch (error) {
      console.log("RegisterError", error);
      fail("Something went wrong. Please try again.");
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
            <Ionicons name="home-outline" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>Register your family</Text>
          <Text style={styles.subtitle}>
            Create a family space and its admin account. You can add members and
            set what they can access afterwards.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Family</Text>

          <Field
            label="Family name"
            icon="people-outline"
            value={familyName}
            onChangeText={onFamilyNameChange}
            placeholder="e.g. The Smith Family"
            colors={colors}
            styles={styles}
          />
          <Field
            label="Family ID (unique)"
            icon="at-outline"
            value={codeTouched ? familyCode : effectiveCode}
            onChangeText={(value) => {
              setCodeTouched(true);
              setFamilyCode(value);
            }}
            placeholder="e.g. smith_family"
            autoCapitalize="none"
            colors={colors}
            styles={styles}
            hint="Lowercase, no spaces. Members log in under this family."
          />

          <Text style={[styles.sectionLabel, styles.sectionSpacing]}>
            Admin account
          </Text>

          <Field
            label="Your name (optional)"
            icon="person-outline"
            value={adminName}
            onChangeText={setAdminName}
            placeholder="e.g. John Smith"
            colors={colors}
            styles={styles}
          />
          <Field
            label="Admin username"
            icon="person-circle-outline"
            value={username}
            onChangeText={setUsername}
            placeholder="Username to log in with"
            autoCapitalize="none"
            colors={colors}
            styles={styles}
          />
          <Field
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (passwordError) setPasswordError(null);
            }}
            onBlur={validatePasswordField}
            error={passwordError ?? undefined}
            placeholder={`${MIN_PASSWORD_LENGTH}+ chars, a letter and a number`}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            colors={colors}
            styles={styles}
            trailing={
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
            }
          />
          <Field
            label="Confirm password"
            icon="lock-closed-outline"
            value={confirm}
            onChangeText={(value) => {
              setConfirm(value);
              if (confirmError) setConfirmError(null);
            }}
            onBlur={validateConfirmField}
            error={confirmError ?? undefined}
            placeholder="Re-enter password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            colors={colors}
            styles={styles}
          />

          <Button
            onPress={handleRegister}
            title="Create family"
            loading={isLoading}
            buttonStyle={styles.submit}
          />
        </View>

        <Pressable
          onPress={() => navigation.navigate("Login")}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.backLink}
        >
          <Text style={styles.backText}>
            Already have an account?{" "}
            <Text style={styles.backCta}>Log in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

type FieldProps = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  hint?: string;
  /** Inline validation message; shown in red and replaces the hint. */
  error?: string;
  /** Fired when the field loses focus — used for on-blur validation. */
  onBlur?: () => void;
  trailing?: React.ReactNode;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
};

const Field = ({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = "sentences",
  hint,
  error,
  onBlur,
  trailing,
  colors,
  styles,
}: FieldProps) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          !!error && styles.inputRowError,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
        {trailing}
      </View>
      {error ? (
        <Text style={styles.errorHint}>{error}</Text>
      ) : (
        !!hint && <Text style={styles.hint}>{hint}</Text>
      )}
    </View>
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
      marginBottom: 24,
    },
    logo: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(colors.primary),
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
    },
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
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginBottom: 14,
    },
    sectionSpacing: {
      marginTop: 22,
    },
    field: {
      marginBottom: 14,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
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
      paddingVertical: 13,
      fontSize: 15,
      color: colors.text,
    },
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 6,
    },
    errorHint: {
      fontSize: 12,
      color: colors.negative,
      marginTop: 6,
    },
    submit: {
      width: "100%",
      marginTop: 12,
    },
    backLink: {
      alignItems: "center",
      marginTop: 22,
    },
    backText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    backCta: {
      color: colors.primary,
      fontWeight: "700",
    },
  });

export default RegisterScreen;
