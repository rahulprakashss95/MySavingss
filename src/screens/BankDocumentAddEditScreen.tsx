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
} from "../../database/firebaseQuery";
import Button from "../components/Button";
import Loader from "../components/Loader";
import PersonPicker from "../components/PersonPicker";
import VisibilityToggle from "../components/VisibilityToggle";
import { useTheme } from "../context/ThemeContext";
import { Visibility } from "../models/common";
import { BankDocumentModel } from "../models/DocumentModel";
import { ThemeColors } from "../utils/Color";
import {
  NavigationProp,
  RouteProps,
  showConfirmationAlert,
  showToast,
} from "../utils/Utils";

type Props = {
  route: RouteProps;
  navigation: NavigationProp;
};

const BankDocumentAddEditScreen = ({ route, navigation }: Props) => {
  const { documentData } = (route.params as any) || {};
  const document: BankDocumentModel | null = documentData || null;
  const pageMode = document ? "Edit" : "Add";

  const [personId, setPersonId] = useState(document?.personId ?? "");
  const [personName, setPersonName] = useState(document?.personName ?? "");
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
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selectPerson = (id: string, name: string) => {
    setPersonId(id);
    setPersonName(name);
    // Seed the holder with the person's name — usually right, always editable.
    // Only while adding, and never over a name the user has already typed.
    if (pageMode === "Add") {
      setAccountHolderName((current) =>
        !current || current === personName ? name : current
      );
    }
  };

  /** Returns an error message, or null when the form is good to submit. */
  const validationError = () => {
    if (!personId) return "Choose who this account belongs to.";
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
      personId,
      personName,
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

    save
      .then(() => navigation.goBack())
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
      deleteBankDocument(document!.id)
        .then(() => navigation.goBack())
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

      <View style={styles.card}>
        <VisibilityToggle value={visibility} onChange={setVisibility} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>

        <PersonPicker
          selectedId={personId}
          onSelect={selectPerson}
          autoSelectSelf={pageMode === "Add"}
        />

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

      <Button
        title={pageMode === "Add" ? "Add account" : "Save changes"}
        onPress={handleSave}
        buttonStyle={styles.primaryButton}
      />

      {pageMode !== "Add" && (
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
