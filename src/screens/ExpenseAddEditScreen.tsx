import moment from "moment";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  addExpense,
  deleteExpense,
  updateExpense,
} from "../../database/query";
import Button from "../components/Button";
import DatePicker from "../components/DatePicker";
import ExpenseTypePicker from "../components/ExpenseTypePicker";
import Loader from "../components/Loader";
import ReadOnlyBanner from "../components/ReadOnlyBanner";
import ReadOnlyGuard from "../components/ReadOnlyGuard";
import VisibilityToggle from "../components/VisibilityToggle";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { canEdit, Visibility } from "../models/common";
import { ExpenseModel } from "../models/ExpenseModel";
import { commitDelete, commitSave, useAppDispatch } from "../query/hooks";
import { isValidAmount } from "../utils/amount";
import { ThemeColors } from "../utils/Color";
import { DATE_FORMAT } from "../utils/deposits";
import { showConfirmationAlert, showToast } from "../utils/Utils";
import { useRouter } from "expo-router";

type Props = {
  /** The expense being edited, or null to create. Resolved by the route. */
  initial: ExpenseModel | null;
};

const ExpenseAddEditScreen = ({ initial }: Props) => {
  const router = useRouter();
  const expense: ExpenseModel | null = initial;
  const pageMode = expense ? "Edit" : "Add";

  const [typeId, setTypeId] = useState(expense?.typeId ?? "");
  const [typeName, setTypeName] = useState(expense?.typeName ?? "");
  const [amount, setAmount] = useState(expense?.amount ?? "");
  // Expenses are nearly always recorded the day they happen.
  const [date, setDate] = useState(expense?.date ?? moment().format(DATE_FORMAT));
  const [comments, setComments] = useState(expense?.comments ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    expense?.visibility ?? "private"
  );
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Public records are viewable family-wide but editable only by their owner.
  const readOnly = pageMode === "Edit" && !canEdit(expense!, user?.id);

  const selectType = (id: string, label: string) => {
    setTypeId(id);
    setTypeName(label);
  };

  /** Returns an error message, or null when the form is good to submit. */
  const validationError = () => {
    if (!typeId) return "Choose a type. Add one first if the list is empty.";
    if (!isValidAmount(amount)) return "Enter an amount.";
    if (!date) return "Pick a date.";
    return null;
  };

  const handleSave = () => {
    const error = validationError();
    if (error) {
      showToast("error", "Incomplete form", error, "bottom");
      return;
    }

    setIsLoading(true);
    const payload = {
      typeId,
      typeName,
      amount: amount.trim(),
      date,
      comments: comments.trim(),
      visibility,
    };

    const save =
      pageMode === "Add"
        ? addExpense(payload)
        : updateExpense(expense!.id, payload);

    dispatch(commitSave("expenses", save))
      .then(() => router.back())
      .catch((saveError) => {
        showToast("error", "Unable to save", String(saveError), "bottom");
      })
      .finally(() => setIsLoading(false));
  };

  const handleDelete = () => {
    showConfirmationAlert(
      "Delete expense",
      "Are you sure you want to delete this entry?"
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      setIsLoading(true);
      dispatch(commitDelete("expenses", expense!.id, deleteExpense))
        .then(() => router.back())
        .catch((deleteError) => {
          showToast("error", "Unable to delete", String(deleteError), "bottom");
        })
        .finally(() => setIsLoading(false));
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Loader loading={isLoading} />

      <ReadOnlyBanner show={readOnly} />

      <ReadOnlyGuard active={readOnly}>
        <View style={styles.card}>
          <VisibilityToggle value={visibility} onChange={setVisibility} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Expense</Text>

          <ExpenseTypePicker
            selectedId={typeId}
            selectedName={typeName}
            onSelect={selectType}
          />

          <Text style={styles.label}>Amount</Text>
          <View style={[styles.affixRow, styles.inputSpacing]}>
            <Text style={styles.affix}>₹</Text>
            <TextInput
              style={styles.affixInput}
              onChangeText={setAmount}
              value={amount}
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
            />
          </View>

          <DatePicker
            label="Date"
            dateValue={date}
            onDateChange={(next: any) => setDate(next || "")}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>

          <Text style={styles.label}>Note</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            onChangeText={setComments}
            value={comments}
            placeholder="What was this expense for…"
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ReadOnlyGuard>

      {!readOnly && (
        <Button
          title={pageMode === "Add" ? "Add expense" : "Save changes"}
          onPress={handleSave}
          buttonStyle={styles.primaryButton}
        />
      )}

      {pageMode !== "Add" && !readOnly && (
        <Pressable
          onPress={handleDelete}
          accessibilityRole="button"
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
        >
          <Text style={styles.deleteText}>Delete expense</Text>
        </Pressable>
      )}
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
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
    affixRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 12,
    },
    affix: {
      fontSize: 15,
      color: colors.textMuted,
    },
    affixInput: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 8,
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

export default ExpenseAddEditScreen;
