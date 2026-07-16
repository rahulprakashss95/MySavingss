import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { addBank, deleteBank, updateBank } from "../../../database/firebaseQuery";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  BankModel,
  bankMobileNumbers,
  toMobileList,
} from "../../models/BankModel";
import { canEdit, Visibility } from "../../models/common";
import { commitDelete, commitSave, useAppDispatch } from "../../redux/hooks";
import { ThemeColors } from "../../utils/Color";
import { showConfirmationAlert, showToast } from "../../utils/Utils";
import Button from "../Button";
import Loader from "../Loader";
import ReadOnlyBanner from "../ReadOnlyBanner";
import ReadOnlyGuard from "../ReadOnlyGuard";
import VisibilityToggle from "../VisibilityToggle";

type Props = {
  /** The bank being edited, or null/undefined to add a new one. */
  initial?: BankModel | null;
  /** Called with the stored record after a successful save. */
  onSaved: (saved: BankModel) => void;
  /** Called after a successful delete (edit mode only). */
  onDeleted?: () => void;
};

/**
 * The bank form fields + save/delete, shared by the full-screen add/edit and
 * the "Add bank" popup on the deposit form. Owns its own state and writes; the
 * parent supplies the scroll container and decides what happens on completion.
 */
const BankForm = ({ initial, onSaved, onDeleted }: Props) => {
  const bank = initial ?? null;
  const isEdit = !!bank;

  const [name, setName] = useState(bank?.name ?? "");
  // Keep at least one row so there's always a field to type into.
  const [numbers, setNumbers] = useState<string[]>(() => {
    const existing = bankMobileNumbers(bank?.mobile);
    return existing.length ? existing : [""];
  });
  const [visibility, setVisibility] = useState<Visibility>(
    bank?.visibility ?? "private"
  );
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Public records are viewable family-wide but editable only by their owner.
  const readOnly = isEdit && !canEdit(bank!, user?.id);

  const setNumberAt = (index: number, value: string) =>
    setNumbers((current) => current.map((n, i) => (i === index ? value : n)));

  const addNumberRow = () => setNumbers((current) => [...current, ""]);

  const removeNumberRow = (index: number) =>
    setNumbers((current) =>
      current.length === 1 ? [""] : current.filter((_, i) => i !== index)
    );

  const handleSave = () => {
    if (!name.trim()) {
      showToast("error", "Incomplete form", "Enter the bank's name.", "bottom");
      return;
    }

    setIsLoading(true);
    const payload = {
      name: name.trim(),
      mobile: toMobileList(numbers),
      visibility,
    };

    const write = isEdit ? updateBank(bank!.id, payload) : addBank(payload);

    dispatch(commitSave("banks", write))
      .then((saved) => onSaved(saved))
      .catch((error) => {
        showToast("error", "Unable to save", String(error), "bottom");
      })
      .finally(() => setIsLoading(false));
  };

  const handleDelete = () => {
    showConfirmationAlert(
      "Delete bank",
      "Fixed deposits already recorded against this bank are kept. Continue?"
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      setIsLoading(true);
      dispatch(commitDelete("banks", bank!.id, deleteBank))
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
          <Text style={styles.sectionTitle}>Bank</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            onChangeText={setName}
            value={name}
            placeholder="e.g. KVB Capital"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="words"
          />

          <View style={styles.numbersHeader}>
            <Text style={styles.label}>Contact numbers</Text>
            <Pressable
              onPress={addNumberRow}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.addNumber}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addNumberText}>Add</Text>
            </Pressable>
          </View>

          {numbers.map((number, index) => (
            <View key={index} style={styles.numberRow}>
              <TextInput
                style={[styles.input, styles.numberInput]}
                onChangeText={(value) => setNumberAt(index, value)}
                value={number}
                placeholder="Phone number"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
              />
              <Pressable
                onPress={() => removeNumberRow(index)}
                accessibilityRole="button"
                accessibilityLabel="Remove number"
                hitSlop={8}
                style={styles.removeNumber}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      </ReadOnlyGuard>

      {!readOnly && (
        <Button
          title={isEdit ? "Save changes" : "Add bank"}
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
          <Text style={styles.deleteText}>Delete bank</Text>
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
    numbersHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 18,
    },
    addNumber: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    addNumberText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary,
      marginLeft: 2,
    },
    numberRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    numberInput: {
      flex: 1,
    },
    removeNumber: {
      padding: 8,
      marginLeft: 6,
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

export default BankForm;
