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
  addBankDocument,
  deleteBankDocument,
  updateBankDocument,
} from "../../database/query";
import Button from "../components/Button";
import Loader from "../components/Loader";
import ReadOnlyBanner from "../components/ReadOnlyBanner";
import ReadOnlyGuard from "../components/ReadOnlyGuard";
import VisibilityToggle from "../components/VisibilityToggle";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { commitDelete, commitSave, useAppDispatch } from "../redux/hooks";
import { canEdit, Visibility } from "../models/common";
import { BankDocumentModel } from "../models/DocumentModel";
import { ThemeColors } from "../utils/Color";
import { showConfirmationAlert, showToast } from "../utils/Utils";
import { useRouter } from "expo-router";

type Props = {
  /** The account being edited, or null to create. Resolved by the route. */
  initial: BankDocumentModel | null;
};

const BankDocumentAddEditScreen = ({ initial }: Props) => {
  const router = useRouter();
  const document = initial;
  const pageMode = document ? "Edit" : "Add";

  const [accountHolderName, setAccountHolderName] = useState(
    document?.accountHolderName ?? ""
  );
  const [bankName, setBankName] = useState(document?.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState(
    document?.accountNumber ?? ""
  );
  const [ifsc, setIfsc] = useState(document?.ifsc ?? "");
  const [description, setDescription] = useState(document?.description ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    document?.visibility ?? "private"
  );
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Public records are viewable family-wide but editable only by their owner.
  const readOnly = pageMode === "Edit" && !canEdit(document!, user?.id);

  /** Returns an error message, or null when the form is good to submit. */
  const validationError = () => {
    if (!bankName.trim()) return "Enter the bank name.";
    if (!accountNumber.trim()) return "Enter the account number.";
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
      accountHolderName: accountHolderName.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifsc: ifsc.trim().toUpperCase(),
      description: description.trim(),
      visibility,
    };

    const save =
      pageMode === "Add"
        ? addBankDocument(payload)
        : updateBankDocument(document!.id, payload);

    dispatch(commitSave("bankDocuments", save))
      .then(() => router.back())
      .catch((error) => {
        showToast("error", "Unable to save", String(error), "bottom");
      })
      .finally(() => setIsLoading(false));
  };

  const handleDelete = () => {
    showConfirmationAlert(
      "Delete account",
      "Are you sure you want to delete this bank account?"
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      setIsLoading(true);
      dispatch(commitDelete("bankDocuments", document!.id, deleteBankDocument))
        .then(() => router.back())
        .catch((error) => {
          showToast("error", "Unable to delete", String(error), "bottom");
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
        <Text style={styles.sectionTitle}>Account</Text>

        <Text style={styles.label}>Account holder name</Text>
        <TextInput
          style={[styles.input, styles.inputSpacing]}
          onChangeText={setAccountHolderName}
          value={accountHolderName}
          placeholder="Name as the bank has it"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="words"
          autoCorrect={false}
        />

        <Text style={styles.label}>Bank name</Text>
        <TextInput
          style={[styles.input, styles.inputSpacing]}
          onChangeText={setBankName}
          value={bankName}
          placeholder="e.g. State Bank of India"
          placeholderTextColor={colors.placeholder}
          autoCorrect={false}
        />

        <Text style={styles.label}>Account number</Text>
        <TextInput
          style={[styles.input, styles.inputSpacing]}
          onChangeText={setAccountNumber}
          value={accountNumber}
          placeholder="Account number"
          placeholderTextColor={colors.placeholder}
          keyboardType="numeric"
        />

        <Text style={styles.label}>IFSC</Text>
        <TextInput
          style={styles.input}
          onChangeText={setIfsc}
          value={ifsc}
          placeholder="e.g. SBIN0001234"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="characters"
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
          placeholder="Branch, account type, or anything worth remembering…"
          placeholderTextColor={colors.placeholder}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      </ReadOnlyGuard>

      {!readOnly && (
        <Button
          title={pageMode === "Add" ? "Add account" : "Save changes"}
          onPress={handleSave}
          buttonStyle={styles.primaryButton}
        />
      )}

      {pageMode !== "Add" && !readOnly && (
        <Pressable
          onPress={handleDelete}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.deleteText}>Delete account</Text>
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

export default BankDocumentAddEditScreen;
