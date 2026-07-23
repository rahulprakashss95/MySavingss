import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  addExpenseType,
  deleteExpenseType,
  updateExpenseType,
} from "../../../database/query";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { canEdit, Visibility } from "../../models/common";
import { ExpenseTypeModel } from "../../models/ExpenseModel";
import { commitDelete, commitSave, useAppDispatch } from "../../query/hooks";
import { ThemeColors } from "../../utils/Color";
import { showConfirmationAlert, showToast } from "../../utils/Utils";
import Button from "../Button";
import Loader from "../Loader";
import ReadOnlyBanner from "../ReadOnlyBanner";
import ReadOnlyGuard from "../ReadOnlyGuard";
import VisibilityToggle from "../VisibilityToggle";

type Props = {
  /** The type being edited, or null/undefined to add a new one. */
  initial?: ExpenseTypeModel | null;
  /** Called with the stored record after a successful save. */
  onSaved: (saved: ExpenseTypeModel) => void;
  /** Called after a successful delete (edit mode only). */
  onDeleted?: () => void;
};

/**
 * The expense-type form (just a name) shared by the full-screen add/edit and
 * the "Add type" popup on the expense form. Owns its own state and writes; the
 * parent supplies the scroll container.
 */
const ExpenseTypeForm = ({ initial, onSaved, onDeleted }: Props) => {
  const type = initial ?? null;
  const isEdit = !!type;

  const [name, setName] = useState(type?.name ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    type?.visibility ?? "private"
  );
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Public records are viewable family-wide but editable only by their owner.
  const readOnly = isEdit && !canEdit(type!, user?.id);

  const handleSave = () => {
    if (!name.trim()) {
      showToast("error", "Incomplete form", "Enter the type's name.", "bottom");
      return;
    }

    setIsLoading(true);
    const payload = { name: name.trim(), visibility };
    const write = isEdit
      ? updateExpenseType(type!.id, payload)
      : addExpenseType(payload);

    dispatch(commitSave("expenseTypes", write))
      .then((saved) => onSaved(saved))
      .catch((error) => {
        showToast("error", "Unable to save", String(error), "bottom");
      })
      .finally(() => setIsLoading(false));
  };

  const handleDelete = () => {
    showConfirmationAlert(
      "Delete type",
      "Expenses already recorded against this type are kept. Continue?"
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      setIsLoading(true);
      dispatch(commitDelete("expenseTypes", type!.id, deleteExpenseType))
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
          <Text style={styles.sectionTitle}>Expense type</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            onChangeText={setName}
            value={name}
            placeholder="e.g. Groceries"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="words"
          />
        </View>
      </ReadOnlyGuard>

      {!readOnly && (
        <Button
          title={isEdit ? "Save changes" : "Add type"}
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
          <Text style={styles.deleteText}>Delete type</Text>
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

export default ExpenseTypeForm;
