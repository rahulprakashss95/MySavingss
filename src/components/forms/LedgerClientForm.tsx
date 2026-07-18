import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  addLedgerClient,
  deleteLedgerClient,
  updateLedgerClient,
} from "../../../database/query";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { canEdit, Visibility } from "../../models/common";
import { LedgerClientModel } from "../../models/LedgerModel";
import { commitDelete, commitSave, useAppDispatch } from "../../redux/hooks";
import { ThemeColors } from "../../utils/Color";
import { showConfirmationAlert, showToast } from "../../utils/Utils";
import Button from "../Button";
import Loader from "../Loader";
import ReadOnlyBanner from "../ReadOnlyBanner";
import ReadOnlyGuard from "../ReadOnlyGuard";
import VisibilityToggle from "../VisibilityToggle";

type Props = {
  /** The client being edited, or null/undefined to add a new one. */
  initial?: LedgerClientModel | null;
  /** Called with the stored record after a successful save. */
  onSaved: (saved: LedgerClientModel) => void;
  /** Called after a successful delete (edit mode only). */
  onDeleted?: () => void;
};

/**
 * The ledger-client form fields + save/delete, shared by the full-screen
 * add/edit and the "Add client" popup on the earning/saving forms. Owns its own
 * state and writes; the parent supplies the scroll container.
 */
const LedgerClientForm = ({ initial, onSaved, onDeleted }: Props) => {
  const client = initial ?? null;
  const isEdit = !!client;

  const [name, setName] = useState(client?.name ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [description, setDescription] = useState(client?.description ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    client?.visibility ?? "private"
  );
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Public records are viewable family-wide but editable only by their owner.
  const readOnly = isEdit && !canEdit(client!, user?.id);

  const handleSave = () => {
    if (!name.trim()) {
      showToast("error", "Incomplete form", "Enter the client's name.", "bottom");
      return;
    }

    setIsLoading(true);
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      description: description.trim(),
      visibility,
    };

    const write = isEdit
      ? updateLedgerClient(client!.id, payload)
      : addLedgerClient(payload);

    dispatch(commitSave("ledgerClients", write))
      .then((saved) => onSaved(saved))
      .catch((error) => {
        showToast("error", "Unable to save", String(error), "bottom");
      })
      .finally(() => setIsLoading(false));
  };

  const handleDelete = () => {
    showConfirmationAlert(
      "Delete client",
      "Earnings and savings already recorded against this client are kept. Continue?"
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      setIsLoading(true);
      dispatch(commitDelete("ledgerClients", client!.id, deleteLedgerClient))
        .then(() => onDeleted?.())
        .catch((error) => {
          showToast("error", "Unable to delete", String(error), "bottom");
        })
        .finally(() => setIsLoading(false));
    });
  };

  return (
    <>
      <Loader loading={isLoading} />

      <ReadOnlyBanner show={readOnly} />

      <ReadOnlyGuard active={readOnly}>
        <View style={styles.card}>
          <VisibilityToggle value={visibility} onChange={setVisibility} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Client</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={[styles.input, styles.inputSpacing]}
            onChangeText={setName}
            value={name}
            placeholder="e.g. Acme Corp"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={[styles.input, styles.inputSpacing]}
            onChangeText={setPhone}
            value={phone}
            placeholder="Phone number"
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            onChangeText={setEmail}
            value={email}
            placeholder="name@example.com"
            placeholderTextColor={colors.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            onChangeText={setDescription}
            value={description}
            placeholder="Anything worth remembering about this client…"
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ReadOnlyGuard>

      {!readOnly && (
        <Button
          title={isEdit ? "Save changes" : "Add client"}
          onPress={handleSave}
          buttonStyle={styles.primaryButton}
        />
      )}

      {isEdit && !readOnly && onDeleted && (
        <Pressable
          onPress={handleDelete}
          accessibilityRole="button"
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
        >
          <Text style={styles.deleteText}>Delete client</Text>
        </Pressable>
      )}
    </>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
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
    inputSpacing: {
      marginBottom: 18,
    },
    multiline: {
      minHeight: 96,
    },
    primaryButton: {
      width: "100%",
      marginTop: 6,
    },
    deleteButton: {
      alignItems: "center",
      paddingVertical: 16,
      marginTop: 6,
    },
    deleteText: {
      color: colors.negative,
      fontSize: 15,
      fontWeight: "600",
    },
    pressed: {
      opacity: 0.6,
    },
  });

export default LedgerClientForm;
