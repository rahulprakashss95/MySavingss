import { Picker } from "@react-native-picker/picker";
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
  addGovernmentDocument,
  deleteGovernmentDocument,
  updateGovernmentDocument,
} from "../../database/firebaseQuery";
import Button from "../components/Button";
import Loader from "../components/Loader";
import PersonPicker from "../components/PersonPicker";
import VisibilityToggle from "../components/VisibilityToggle";
import { useTheme } from "../context/ThemeContext";
import { Visibility } from "../models/common";
import {
  GOVERNMENT_DOCUMENT_TYPES,
  GovernmentDocumentModel,
} from "../models/DocumentModel";
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

const GovernmentDocumentAddEditScreen = ({ route, navigation }: Props) => {
  const { documentData } = (route.params as any) || {};
  const document: GovernmentDocumentModel | null = documentData || null;
  const pageMode = document ? "Edit" : "Add";

  const [personId, setPersonId] = useState(document?.personId ?? "");
  const [personName, setPersonName] = useState(document?.personName ?? "");
  const [documentType, setDocumentType] = useState(document?.documentType ?? "");
  const [documentNumber, setDocumentNumber] = useState(
    document?.documentNumber ?? ""
  );
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
  };

  /** Returns an error message, or null when the form is good to submit. */
  const validationError = () => {
    if (!personId) return "Choose who this document belongs to.";
    if (!documentType) return "Choose a document type.";
    if (!documentNumber.trim()) return "Enter the document number.";
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
      documentType,
      documentNumber: documentNumber.trim(),
      description: description.trim(),
      visibility,
    };

    const save =
      pageMode === "Add"
        ? addGovernmentDocument(payload)
        : updateGovernmentDocument(document!.id, payload);

    save
      .then(() => navigation.goBack())
      .catch((error) => {
        showToast("error", "Unable to save", String(error), "bottom");
      })
      .finally(() => setIsLoading(false));
  };

  const handleDelete = () => {
    showConfirmationAlert(
      "Delete document",
      "Are you sure you want to delete this document?"
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      setIsLoading(true);
      deleteGovernmentDocument(document!.id)
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
        <Text style={styles.sectionTitle}>Document</Text>

        <PersonPicker
          selectedId={personId}
          onSelect={selectPerson}
          autoSelectSelf={pageMode === "Add"}
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.pickerContainer}>
          <Picker
            style={styles.picker}
            dropdownIconColor={colors.text}
            mode="dialog"
            selectedValue={documentType}
            onValueChange={setDocumentType}
          >
            <Picker.Item
              label="Select a document type"
              value=""
              color={colors.placeholder}
              style={styles.pickerItem}
            />
            {GOVERNMENT_DOCUMENT_TYPES.map((type) => (
              <Picker.Item
                key={type}
                label={type}
                value={type}
                color={colors.text}
                style={styles.pickerItem}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Number</Text>
        <TextInput
          style={styles.input}
          onChangeText={setDocumentNumber}
          value={documentNumber}
          placeholder="Document number"
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
          placeholder="Anything worth remembering — issue date, where it's kept…"
          placeholderTextColor={colors.placeholder}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <Button
        title={pageMode === "Add" ? "Add document" : "Save changes"}
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
          <Text style={styles.deleteText}>Delete document</Text>
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
    pickerContainer: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.inputBackground,
      marginBottom: 18,
      overflow: "hidden",
    },
    picker: {
      height: 50,
      borderWidth: 0,
      backgroundColor: colors.inputBackground,
      color: colors.text,
      paddingHorizontal: 8,
    },
    pickerItem: {
      backgroundColor: colors.inputBackground,
      color: colors.text,
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

export default GovernmentDocumentAddEditScreen;
