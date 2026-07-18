import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { changeOwnPassword } from "../../database/query";
import Button from "../components/Button";
import Card from "../components/Card";
import { confirmSignOut } from "../components/HeaderActions";
import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { displayNameOf, isAdminRole } from "../models/LoginUserModel";
import { ThemeColors, tint } from "../utils/Color";
import { MIN_PASSWORD_LENGTH, validatePassword } from "../utils/passwordStrength";
import { showToast } from "../utils/Utils";

/**
 * Who you are and what you can reach — identity, access, family, and the one
 * account action a member can take for themselves.
 *
 * Everything here reads from the session rather than the database: `AuthContext`
 * already holds the signed-in member's name, role and module access, and it is
 * the same data a fetch would return.
 */
const ProfileScreen = () => {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [changingPassword, setChangingPassword] = useState(false);

  if (!user) {
    return null;
  }

  const name = displayNameOf(user);
  const isAdmin = isAdminRole(user.role);

  const copyFamilyId = async () => {
    if (!user.familyCode) {
      return;
    }
    await Clipboard.setStringAsync(user.familyCode);
    showToast("success", "Copied", `Family ID "${user.familyCode}" copied.`, "bottom");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.identityMeta}>
          <Text style={styles.username}>@{user.username}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{isAdmin ? "Admin" : "Member"}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Account</Text>
      <Card customStyle={styles.card}>
        <View style={styles.row}>
          <Ionicons name="at-outline" size={22} color={colors.textMuted} />
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Username</Text>
            <Text style={styles.rowDescription}>{user.username}</Text>
          </View>
        </View>
        <View style={[styles.row, styles.rowDivider]}>
          <Ionicons name="shield-outline" size={22} color={colors.textMuted} />
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Role</Text>
            <Text style={styles.rowDescription}>
              {isAdmin
                ? "Manages members and family settings"
                : "Uses the modules granted below"}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setChangingPassword(true)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.row,
            styles.rowDivider,
            pressed && styles.rowPressed,
          ]}
        >
          <Ionicons name="key-outline" size={22} color={colors.textMuted} />
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Change password</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </Card>

      <Text style={styles.sectionTitle}>Family</Text>
      <Card customStyle={styles.card}>
        <View style={styles.row}>
          <Ionicons name="home-outline" size={22} color={colors.textMuted} />
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{user.familyName || "Your family"}</Text>
            <Text style={styles.rowDescription}>Your family</Text>
          </View>
        </View>
        {!!user.familyCode && (
          <Pressable
            onPress={copyFamilyId}
            accessibilityRole="button"
            accessibilityLabel="Copy Family ID"
            style={({ pressed }) => [
              styles.row,
              styles.rowDivider,
              pressed && styles.rowPressed,
            ]}
          >
            <Ionicons name="key-outline" size={22} color={colors.textMuted} />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Family ID</Text>
              <Text style={styles.rowDescription}>{user.familyCode}</Text>
            </View>
            <Ionicons name="copy-outline" size={20} color={colors.primary} />
          </Pressable>
        )}
      </Card>

      <Card customStyle={styles.card}>
        <Pressable
          onPress={() => confirmSignOut(signOut)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.negative} />
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, styles.signOutLabel]}>Log out</Text>
          </View>
        </Pressable>
      </Card>

      <ChangePasswordModal
        visible={changingPassword}
        onClose={() => setChangingPassword(false)}
      />
    </ScrollView>
  );
};

/* ------------------------------------------------------------------ *
 * Change password
 * ------------------------------------------------------------------ */

const ChangePasswordModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const close = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    onClose();
  };

  /** Returns an error message, or null when the form is good to submit. */
  const validationError = () => {
    if (!current) return "Enter your current password.";
    // Same rules as registration and the admin's reset, so a password set here
    // can't be weaker than one set anywhere else.
    const weak = validatePassword(next, { username: user?.username });
    if (weak) return weak;
    if (next !== confirm) return "The new passwords don't match.";
    if (next === current) return "Choose a password you haven't used here.";
    return null;
  };

  const handleSave = async () => {
    const error = validationError();
    if (error) {
      showToast("error", "Check your details", error, "bottom");
      return;
    }
    setIsLoading(true);
    try {
      await changeOwnPassword(current, next);
      close();
      showToast("success", "Password changed", "Use it next time you log in.", "bottom");
    } catch (error) {
      showToast("error", "Unable to change password", String(error), "bottom");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Loader loading={isLoading} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change password</Text>
            <Pressable
              onPress={close}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Current password</Text>
            <TextInput
              style={styles.input}
              value={current}
              onChangeText={setCurrent}
              placeholder="Your current password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={[styles.label, styles.labelSpaced]}>New password</Text>
            <TextInput
              style={styles.input}
              value={next}
              onChangeText={setNext}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={[styles.label, styles.labelSpaced]}>Confirm new password</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Type it again"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              autoCapitalize="none"
            />

            <Button
              title="Change password"
              onPress={handleSave}
              buttonStyle={styles.modalButton}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingVertical: 12,
      paddingBottom: 32,
    },
    identity: {
      alignItems: "center",
      paddingVertical: 20,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(colors.primary),
    },
    avatarText: {
      fontSize: 30,
      fontWeight: "700",
      color: colors.primary,
    },
    name: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginTop: 12,
    },
    identityMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 6,
    },
    username: {
      fontSize: 14,
      color: colors.textMuted,
    },
    roleBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: tint(colors.primary),
    },
    roleText: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: colors.primary,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginHorizontal: 32,
      marginTop: 12,
    },
    card: {
      paddingVertical: 4,
      paddingHorizontal: 0,
      marginVertical: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowPressed: {
      opacity: 0.6,
    },
    rowText: {
      flex: 1,
    },
    rowLabel: {
      fontSize: 16,
      color: colors.text,
    },
    rowDescription: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    signOutLabel: {
      color: colors.negative,
      fontWeight: "500",
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    modalCard: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      maxHeight: "92%",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 6,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    modalContent: {
      padding: 20,
      paddingBottom: 32,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    labelSpaced: {
      marginTop: 18,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    modalButton: {
      width: "100%",
      marginTop: 24,
    },
  });

export default ProfileScreen;
