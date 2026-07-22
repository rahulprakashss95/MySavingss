import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  changeOwnPassword,
  removeAvatarObject,
  setOwnAvatar,
  uploadOwnAvatar,
  type StagedFile,
} from "../../database/query";
import Avatar from "../components/Avatar";
import Button from "../components/Button";
import ImageCropper from "../components/ImageCropper";
import Card from "../components/Card";
import { confirmSignOut } from "../components/HeaderActions";
import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { formatFileSize, UPLOAD_MAX_BYTES } from "../models/common";
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
  const { user, signOut, updateSession } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [changingPassword, setChangingPassword] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  // Set on web only: the picked image waiting to be cropped before upload.
  const [cropUri, setCropUri] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const name = displayNameOf(user);
  const isAdmin = isAdminRole(user.role);

  /**
   * Uploads a picked image as the new avatar, records it on the account, then
   * drops the previous object. Order matters: the row must point at the new
   * picture before the old one is deleted, so a failure never leaves the account
   * naming a file that's already gone.
   */
  const applyPhoto = async (file: StagedFile) => {
    if (file.size > UPLOAD_MAX_BYTES.profilePicture) {
      showToast(
        "error",
        "Picture too large",
        `That image is ${formatFileSize(file.size)}. The limit is ${formatFileSize(
          UPLOAD_MAX_BYTES.profilePicture
        )}.`,
        "bottom"
      );
      return;
    }
    setSavingPhoto(true);
    try {
      const previous = user.avatar?.path;
      const next = await uploadOwnAvatar(file);
      await setOwnAvatar(next);
      await updateSession({ avatar: next });
      if (previous) {
        await removeAvatarObject(previous);
      }
      showToast("success", "Picture updated", "", "bottom");
    } catch (error) {
      showToast("error", "Couldn't update picture", String(error), "bottom");
    } finally {
      setSavingPhoto(false);
    }
  };

  /**
   * Routes a picked image to the right cropper. On web the picker has no editor
   * of its own, so we open our in-app cropper and upload its output; on iOS and
   * Android `allowsEditing` already cropped, so it uploads straight away.
   */
  const handlePicked = (asset: ImagePicker.ImagePickerAsset) => {
    if (Platform.OS === "web") {
      setCropUri(asset.uri);
      return;
    }
    applyPhoto({
      uri: asset.uri,
      name: asset.fileName || `avatar-${Date.now()}.jpg`,
      mime: asset.mimeType || "image/jpeg",
      size: asset.fileSize ?? 0,
    });
  };

  const chooseFromGallery = async () => {
    setPickingPhoto(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      // A square crop keeps the circular avatar from cutting a photo off oddly.
      // Ignored on web (no OS editor) — our cropper handles that case.
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) {
      return;
    }
    handlePicked(result.assets[0]);
  };

  const takePhoto = async () => {
    setPickingPhoto(false);
    // Web needs no permission prompt and has no camera to launch into — the
    // gallery/file chooser covers it there (this option is hidden on web).
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showToast(
          "error",
          "Camera unavailable",
          "Allow camera access in Settings to take a picture.",
          "bottom"
        );
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) {
      return;
    }
    handlePicked(result.assets[0]);
  };

  const removePhoto = async () => {
    setPickingPhoto(false);
    if (!user.avatar) {
      return;
    }
    setSavingPhoto(true);
    try {
      const previous = user.avatar.path;
      await setOwnAvatar(null);
      await updateSession({ avatar: undefined });
      await removeAvatarObject(previous);
      showToast("success", "Picture removed", "", "bottom");
    } catch (error) {
      showToast("error", "Couldn't remove picture", String(error), "bottom");
    } finally {
      setSavingPhoto(false);
    }
  };

  const copyFamilyId = async () => {
    if (!user.familyCode) {
      return;
    }
    await Clipboard.setStringAsync(user.familyCode);
    showToast("success", "Copied", `Family ID "${user.familyCode}" copied.`, "bottom");
  };

  return (
    <View style={styles.screen}>
      <Loader loading={savingPhoto} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.identity}>
        <Pressable
          onPress={() => setPickingPhoto(true)}
          accessibilityRole="button"
          accessibilityLabel="Change your profile picture"
          style={({ pressed }) => [styles.avatarWrap, pressed && styles.rowPressed]}
        >
          <Avatar user={user} size={72} fontSize={30} />
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={13} color={colors.card} />
          </View>
        </Pressable>
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

      <PhotoSheet
        visible={pickingPhoto}
        hasPhoto={!!user.avatar}
        onClose={() => setPickingPhoto(false)}
        onTakePhoto={takePhoto}
        onChooseFromGallery={chooseFromGallery}
        onRemove={removePhoto}
      />

      <ImageCropper
        visible={!!cropUri}
        uri={cropUri}
        onCancel={() => setCropUri(null)}
        onCropped={(file) => {
          setCropUri(null);
          applyPhoto(file);
        }}
      />
      </ScrollView>
    </View>
  );
};

/* ------------------------------------------------------------------ *
 * Profile picture source chooser
 * ------------------------------------------------------------------ */

const PhotoSheet = ({
  visible,
  hasPhoto,
  onClose,
  onTakePhoto,
  onChooseFromGallery,
  onRemove,
}: {
  visible: boolean;
  hasPhoto: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseFromGallery: () => void;
  onRemove: () => void;
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const options: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    destructive?: boolean;
  }[] = [
    // Web has no camera to launch into; the file chooser covers it there.
    ...(Platform.OS === "web"
      ? []
      : [{ icon: "camera-outline" as const, label: "Take photo", onPress: onTakePhoto }]),
    { icon: "images-outline", label: "Choose from gallery", onPress: onChooseFromGallery },
    ...(hasPhoto
      ? [
          {
            icon: "trash-outline" as const,
            label: "Remove photo",
            onPress: onRemove,
            destructive: true,
          },
        ]
      : []),
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          {options.map((option) => (
            <Pressable
              key={option.label}
              style={styles.sheetRow}
              onPress={option.onPress}
              accessibilityRole="button"
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={option.destructive ? colors.negative : colors.primary}
              />
              <Text
                style={[
                  styles.sheetText,
                  option.destructive && { color: colors.negative },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
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
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
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
    avatarWrap: {
      // Anchors the camera badge to the avatar's corner.
      position: "relative",
    },
    avatarBadge: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      // Sits the badge on the page background rather than flush against the photo.
      borderWidth: 2,
      borderColor: colors.background,
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
    sheetBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      padding: 12,
      paddingBottom: 28,
    },
    sheetRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 16,
      paddingHorizontal: 12,
    },
    sheetText: {
      fontSize: 16,
      color: colors.text,
    },
  });

export default ProfileScreen;
