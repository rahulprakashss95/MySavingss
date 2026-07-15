import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createLoginUser,
  deleteLoginUser,
  getFamilyById,
  getFamilyUsers,
  isFamilyCodeAvailable,
  isUsernameAvailable,
  resetUserPassword,
  updateFamily,
  updateLoginUser,
} from "../../database/firebaseQuery";
import Button from "../components/Button";
import ModuleAccessPicker from "../components/ModuleAccessPicker";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { MODULE_KEYS, ModuleKey } from "../models/common";
import { normalizeFamilyCode } from "../models/FamilyModel";
import { displayNameOf, LoginUserModel, UserRole } from "../models/LoginUserModel";
import { ThemeColors, tint } from "../utils/Color";
import { MIN_PASSWORD_LENGTH, validatePassword } from "../utils/passwordStrength";
import { showConfirmationAlert, showToast } from "../utils/Utils";

type MemberForm = {
  editingId: string | null;
  username: string;
  name: string;
  role: UserRole;
  moduleAccess: ModuleKey[];
  password: string;
};

const emptyForm = (): MemberForm => ({
  editingId: null,
  username: "",
  name: "",
  role: "member",
  moduleAccess: [],
  password: "",
});

const AdminScreen = () => {
  const { colors } = useTheme();
  const { user, updateSession } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [members, setMembers] = useState<LoginUserModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [familyName, setFamilyName] = useState(user?.familyName ?? "");
  const [familyCode, setFamilyCode] = useState(user?.familyCode ?? "");
  const [savingFamily, setSavingFamily] = useState(false);

  const [form, setForm] = useState<MemberForm | null>(null);
  const [savingMember, setSavingMember] = useState(false);

  const isAdmin = user?.role === "admin";

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getFamilyUsers(),
      user ? getFamilyById(user.familyId) : Promise.resolve(null),
    ])
      .then(([rows, familyDoc]) => {
        setMembers(
          rows.sort((a, b) => displayNameOf(a).localeCompare(displayNameOf(b)))
        );
        // The family doc is the source of truth for the email (the session
        // doesn't carry it); name/code stay in sync too.
        if (familyDoc) {
          setFamilyName(familyDoc.name);
          setFamilyCode(familyDoc.code);
        }
      })
      .catch((error) => console.log("AdminLoadError", error))
      .finally(() => setLoading(false));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) load();
    }, [isAdmin, load])
  );

  const fail = (message: string) =>
    showToast("error", "Action failed", message, "bottom");
  const ok = (message: string) =>
    showToast("success", "Saved", message, "bottom");

  const saveFamily = async () => {
    if (!user) return;
    const name = familyName.trim();
    const code = normalizeFamilyCode(familyCode);
    if (!name) return fail("Family name can't be empty.");
    if (!code) return fail("Family ID can't be empty.");

    setSavingFamily(true);
    try {
      if (!(await isFamilyCodeAvailable(code, user.familyId))) {
        fail(`Family ID "${code}" is already taken.`);
        return;
      }
      await updateFamily(user.familyId, { name, code });
      await updateSession({ familyName: name, familyCode: code });
      setFamilyCode(code);
      ok("Family details updated.");
    } catch (error) {
      console.log("SaveFamilyError", error);
      fail("Could not update the family.");
    } finally {
      setSavingFamily(false);
    }
  };

  const openAdd = () => setForm(emptyForm());
  const openEdit = (member: LoginUserModel) =>
    setForm({
      editingId: member.id,
      username: member.username,
      name: member.name ?? "",
      role: member.role,
      moduleAccess: member.moduleAccess ?? [],
      password: "",
    });

  const saveMember = async () => {
    if (!user || !form) return;
    const username = form.username.trim();
    const name = form.name.trim();
    const isEdit = !!form.editingId;

    if (!username) return fail("Enter a username.");
    // Require a strong password on create, and on edit only when one is entered
    // (blank means "keep the current password").
    if (!isEdit || form.password) {
      const passwordError = validatePassword(form.password, { username });
      if (passwordError) return fail(passwordError);
    }

    setSavingMember(true);
    try {
      if (
        !(await isUsernameAvailable(
          user.familyId,
          username,
          form.editingId ?? undefined
        ))
      ) {
        fail(`Username "${username}" is already taken.`);
        return;
      }

      if (isEdit) {
        await updateLoginUser(form.editingId!, {
          username,
          name: name || undefined,
          role: form.role,
          moduleAccess: form.moduleAccess,
        });
        if (form.password) {
          await resetUserPassword(form.editingId!, form.password);
        }
        // Keep our own session in sync if we edited ourselves.
        if (form.editingId === user.id) {
          await updateSession({
            username,
            name: name || undefined,
            role: form.role,
            moduleAccess: form.moduleAccess,
          });
        }
      } else {
        await createLoginUser({
          familyId: user.familyId,
          username,
          name: name || undefined,
          role: form.role,
          moduleAccess: form.moduleAccess,
          password: form.password,
        });
      }
      setForm(null);
      ok(isEdit ? "Member updated." : "Member added.");
      load();
    } catch (error) {
      console.log("SaveMemberError", error);
      fail("Could not save the member.");
    } finally {
      setSavingMember(false);
    }
  };

  const removeMember = async (member: LoginUserModel) => {
    const confirmed = await showConfirmationAlert(
      "Remove member",
      `Remove ${displayNameOf(member)}? They will no longer be able to log in. Their records stay in the family.`
    );
    if (!confirmed) return;
    try {
      await deleteLoginUser(member.id);
      ok("Member removed.");
      load();
    } catch (error) {
      console.log("DeleteMemberError", error);
      fail("Could not remove the member.");
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
        <Text style={styles.deniedText}>
          Only a family admin can manage members and settings.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Family settings */}
      <Text style={styles.sectionTitle}>Family</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Family name</Text>
        <TextInput
          style={styles.input}
          value={familyName}
          onChangeText={setFamilyName}
          placeholder="Family name"
          placeholderTextColor={colors.placeholder}
        />
        <Text style={[styles.label, styles.labelSpacing]}>Family ID</Text>
        <TextInput
          style={styles.input}
          value={familyCode}
          onChangeText={setFamilyCode}
          placeholder="family_id"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
        />
        <Button
          onPress={saveFamily}
          title="Save family"
          loading={savingFamily}
          buttonStyle={styles.inlineButton}
        />
      </View>

      {/* Members */}
      <View style={styles.membersHeader}>
        <Text style={styles.sectionTitle}>Members</Text>
        <Pressable
          onPress={openAdd}
          accessibilityRole="button"
          style={styles.addButton}
          hitSlop={8}
        >
          <Ionicons name="add" size={18} color={colors.onPrimary} />
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator
          color={colors.primary}
          style={{ marginTop: 24 }}
        />
      ) : (
        members.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayNameOf(member).charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <View style={styles.memberNameRow}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {displayNameOf(member)}
                </Text>
                {member.role === "admin" && (
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>Admin</Text>
                  </View>
                )}
                {member.id === user?.id && (
                  <Text style={styles.youText}>You</Text>
                )}
              </View>
              <Text style={styles.memberSub} numberOfLines={1}>
                @{member.username}
                {member.role === "admin"
                  ? " · all modules"
                  : ` · ${
                      member.moduleAccess.length
                        ? `${member.moduleAccess.length} module${
                            member.moduleAccess.length > 1 ? "s" : ""
                          }`
                        : "no modules"
                    }`}
              </Text>
            </View>
            <Pressable
              onPress={() => openEdit(member)}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.iconButton}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </Pressable>
            {member.id !== user?.id && (
              <Pressable
                onPress={() => removeMember(member)}
                accessibilityRole="button"
                hitSlop={8}
                style={styles.iconButton}
              >
                <Ionicons name="trash-outline" size={20} color={colors.negative} />
              </Pressable>
            )}
          </View>
        ))
      )}

      {/* Member add/edit modal */}
      <Modal
        visible={!!form}
        transparent
        animationType="fade"
        onRequestClose={() => setForm(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {form?.editingId ? "Edit member" : "Add member"}
              </Text>

              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={form?.username}
                onChangeText={(v) =>
                  setForm((f) => (f ? { ...f, username: v } : f))
                }
                placeholder="Username"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
              />

              <Text style={[styles.label, styles.labelSpacing]}>
                Name (optional)
              </Text>
              <TextInput
                style={styles.input}
                value={form?.name}
                onChangeText={(v) => setForm((f) => (f ? { ...f, name: v } : f))}
                placeholder="Display name"
                placeholderTextColor={colors.placeholder}
              />

              <Text style={[styles.label, styles.labelSpacing]}>
                {form?.editingId ? "New password (optional)" : "Password"}
              </Text>
              <TextInput
                style={styles.input}
                value={form?.password}
                onChangeText={(v) =>
                  setForm((f) => (f ? { ...f, password: v } : f))
                }
                placeholder={
                  form?.editingId
                    ? "Leave blank to keep current"
                    : `${MIN_PASSWORD_LENGTH}+ chars, a letter and a number`
                }
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={[styles.label, styles.labelSpacing]}>Role</Text>
              <View style={styles.roleRow}>
                {(["member", "admin"] as UserRole[]).map((role) => {
                  const active = form?.role === role;
                  const isSelf = form?.editingId === user?.id;
                  // Don't let an admin demote themselves and risk locking out.
                  const locked = isSelf && role === "member";
                  return (
                    <Pressable
                      key={role}
                      onPress={() =>
                        !locked &&
                        setForm((f) => (f ? { ...f, role } : f))
                      }
                      style={[
                        styles.roleOption,
                        active && styles.roleOptionActive,
                        locked && styles.roleOptionLocked,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleOptionText,
                          active && styles.roleOptionTextActive,
                        ]}
                      >
                        {role === "admin" ? "Admin" : "Member"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.label, styles.labelSpacing]}>
                Module access
              </Text>
              <Text style={styles.helper}>
                {form?.role === "admin"
                  ? "Admins can open every module."
                  : "Pick which modules this member can open."}
              </Text>
              <ModuleAccessPicker
                value={
                  form?.role === "admin"
                    ? [...MODULE_KEYS]
                    : form?.moduleAccess ?? []
                }
                onChange={(next) =>
                  setForm((f) => (f ? { ...f, moduleAccess: next } : f))
                }
                disabled={form?.role === "admin"}
              />

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setForm(null)}
                  style={styles.cancelButton}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Button
                  onPress={saveMember}
                  title="Save"
                  loading={savingMember}
                  buttonStyle={styles.saveButton}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 40 },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      backgroundColor: colors.background,
    },
    deniedText: {
      marginTop: 14,
      fontSize: 15,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 22,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginBottom: 12,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 26,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    labelSpacing: { marginTop: 14 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    inlineButton: { width: "100%", marginTop: 18 },
    membersHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingVertical: 7,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    addButtonText: {
      color: colors.onPrimary,
      fontWeight: "600",
      fontSize: 13,
      marginLeft: 4,
    },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 10,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(colors.primary),
      marginRight: 12,
    },
    avatarText: { fontSize: 16, fontWeight: "700", color: colors.primary },
    memberInfo: { flex: 1 },
    memberNameRow: { flexDirection: "row", alignItems: "center" },
    memberName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      flexShrink: 1,
    },
    roleBadge: {
      backgroundColor: tint(colors.primary),
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginLeft: 8,
    },
    roleBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.primary,
      textTransform: "uppercase",
    },
    youText: {
      fontSize: 12,
      color: colors.textMuted,
      marginLeft: 8,
    },
    memberSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    iconButton: { padding: 8 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      padding: 20,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      maxHeight: "88%",
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 18,
    },
    helper: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: -2,
      marginBottom: 10,
    },
    roleRow: { flexDirection: "row", gap: 10 },
    roleOption: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
    },
    roleOptionActive: {
      borderColor: colors.primary,
      backgroundColor: tint(colors.primary),
    },
    roleOptionLocked: { opacity: 0.4 },
    roleOptionText: { fontSize: 14, color: colors.text },
    roleOptionTextActive: { color: colors.primary, fontWeight: "700" },
    modalActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      marginTop: 24,
      gap: 12,
    },
    cancelButton: { paddingVertical: 14, paddingHorizontal: 18 },
    cancelText: { fontSize: 15, color: colors.textMuted, fontWeight: "600" },
    saveButton: { width: 120 },
  });

export default AdminScreen;
