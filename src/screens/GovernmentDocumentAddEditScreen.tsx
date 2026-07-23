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
} from "../../database/query";
import AttachmentField, { useAttachments } from "../components/AttachmentField";
import Button from "../components/Button";
import Loader from "../components/Loader";
import SearchableSelect from "../components/SearchableSelect";
import ReadOnlyBanner from "../components/ReadOnlyBanner";
import ReadOnlyGuard from "../components/ReadOnlyGuard";
import VisibilityToggle from "../components/VisibilityToggle";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { commitDelete, commitSave, useAppDispatch } from "../query/hooks";
import { canEdit, Visibility } from "../models/common";
import {
  GOVERNMENT_DOCUMENT_TYPES,
  GovernmentDocumentModel,
} from "../models/DocumentModel";
import { ThemeColors } from "../utils/Color";
import { showConfirmationAlert, showToast } from "../utils/Utils";
import { useRouter } from "expo-router";

type Props = {
  /** The document being edited, or null to create. Resolved by the route. */
  initial: GovernmentDocumentModel | null;
};

const GovernmentDocumentAddEditScreen = ({ initial }: Props) => {
  const router = useRouter();
  const document = initial;
  const pageMode = document ? "Edit" : "Add";

  const [documentType, setDocumentType] = useState(document?.documentType ?? "");
  const [documentNumber, setDocumentNumber] = useState(
    document?.documentNumber ?? ""
  );
  const [description, setDescription] = useState(document?.description ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    document?.visibility ?? "private"
  );
  const [isLoading, setIsLoading] = useState(false);
  const attachments = useAttachments(document?.attachments);

  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Public records are viewable family-wide but editable only by their owner.
  const readOnly = pageMode === "Edit" && !canEdit(document!, user?.id);

  /** Returns an error message, or null when the form is good to submit. */
  const validationError = () => {
    if (!documentType) return "Choose a document type.";
    if (!documentNumber.trim()) return "Enter the document number.";
    return null;
  };

  const handleSave = async () => {
    const error = validationError();
    if (error) {
      showToast("error", "Incomplete form", error, "bottom");
      return;
    }

    setIsLoading(true);
    try {
      // Files first: if an upload fails the record is left untouched, rather
      // than saved pointing at a scan that never made it to the bucket.
      const files = await attachments.commit();

      const payload = {
        documentType,
        documentNumber: documentNumber.trim(),
        description: description.trim(),
        attachments: files,
        visibility,
      };

      const save =
        pageMode === "Add"
          ? addGovernmentDocument(payload)
          : updateGovernmentDocument(document!.id, payload);

      await dispatch(commitSave("governmentDocuments", save));
      // Only once the row no longer references them: a save that threw above
      // leaves the old row intact, and its files must still be there.
      await attachments.cleanup(files);
      router.back();
    } catch (error) {
      showToast("error", "Unable to save", String(error), "bottom");
    } finally {
      setIsLoading(false);
    }
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
      dispatch(
        commitDelete("governmentDocuments", document!.id, deleteGovernmentDocument)
      )
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
        <Text style={styles.sectionTitle}>Document</Text>

        <SearchableSelect
          label="Type"
          placeholder="Select a document type"
          selectedId={documentType}
          selectedName={documentType}
          options={GOVERNMENT_DOCUMENT_TYPES.map((type) => ({
            id: type,
            name: type,
          }))}
          onSelect={(id) => setDocumentType(id)}
        />

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
        <AttachmentField
          drafts={attachments.drafts}
          onChange={attachments.setDrafts}
          readOnly={readOnly}
          module="governmentDocuments"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notes</Text>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          onChangeText={setDescription}
          value={description}
          placeholder="Anything worth remembering â€” issue date, where it's keptâ€¦"
          placeholderTextColor={colors.placeholder}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      </ReadOnlyGuard>

      {!readOnly && (
        <Button
          title={pageMode === "Add" ? "Add document" : "Save changes"}
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
