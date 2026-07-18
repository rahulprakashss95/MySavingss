import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  deleteAttachments,
  uploadAttachment,
  type StagedFile,
} from "../../database/query";
import { useTheme } from "../context/ThemeContext";
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_PER_RECORD,
  Attachment,
  formatFileSize,
  isImageAttachment,
} from "../models/common";
import { ThemeColors, tint } from "../utils/Color";
import {
  localFile,
  storedFile,
  type ViewableFile,
} from "../utils/attachments";
import { showToast } from "../utils/Utils";
import AttachmentViewer, { useAttachmentUrls } from "./AttachmentViewer";

/**
 * One row in the field: either a file already in the bucket, or one picked this
 * session that hasn't been uploaded yet.
 *
 * The distinction is the whole point of the type. A staged file has a local uri
 * and no path; a saved one has a path and no bytes to send. Keeping them apart
 * in the type — rather than in a nullable field on one shape — is what lets
 * `commit` know exactly what to upload and stops it re-uploading everything
 * that was already there on every edit.
 */
export type AttachmentDraft =
  | { kind: "saved"; key: string; attachment: Attachment }
  | { kind: "staged"; key: string; file: StagedFile };

const draftName = (draft: AttachmentDraft) =>
  draft.kind === "saved" ? draft.attachment.name : draft.file.name;

const draftMime = (draft: AttachmentDraft) =>
  draft.kind === "saved" ? draft.attachment.mime : draft.file.mime;

const draftSize = (draft: AttachmentDraft) =>
  draft.kind === "saved" ? draft.attachment.size : draft.file.size;

/**
 * Holds the pending file list for a form and knows how to persist it.
 *
 * Saving is two calls on purpose, either side of the record's own write:
 *
 *   const files = await attachments.commit();   // uploads staged files
 *   await save({ ...payload, attachments: files });
 *   await attachments.cleanup(files);           // drops de-referenced objects
 *
 * `commit` runs first so the row is never written pointing at a file that
 * failed to upload. `cleanup` runs last so a save that throws leaves every
 * existing file exactly where the still-unchanged row expects it. Getting that
 * order wrong is how you end up with rows naming objects that aren't there.
 */
export const useAttachments = (initial: Attachment[] | undefined) => {
  const [drafts, setDrafts] = useState<AttachmentDraft[]>(() =>
    (initial ?? []).map((attachment) => ({
      kind: "saved",
      key: attachment.id,
      attachment,
    }))
  );

  const commit = useCallback(async (): Promise<Attachment[]> => {
    const uploaded: Attachment[] = [];
    for (const draft of drafts) {
      uploaded.push(
        draft.kind === "saved"
          ? draft.attachment
          : await uploadAttachment(draft.file)
      );
    }
    return uploaded;
  }, [drafts]);

  const cleanup = useCallback(
    async (finalAttachments: Attachment[]) => {
      const kept = new Set(finalAttachments.map((file) => file.path));
      const dropped = (initial ?? [])
        .filter((file) => !kept.has(file.path))
        .map((file) => file.path);
      await deleteAttachments(dropped);
    },
    [initial]
  );

  return { drafts, setDrafts, commit, cleanup };
};

/** The viewer and the thumbnail cache work on files, not drafts — this is the
 * one place that bridges the two. */
const draftToFile = (draft: AttachmentDraft): ViewableFile =>
  draft.kind === "saved"
    ? storedFile(draft.attachment)
    : localFile(draft.key, draft.file);

type Props = {
  drafts: AttachmentDraft[];
  onChange: (drafts: AttachmentDraft[]) => void;
  readOnly?: boolean;
  /** Section heading. Defaults to "Attachments". */
  label?: string;
};

/**
 * Attach scans and photos to a record: camera, gallery or a PDF, listed with a
 * tap-to-view preview. Deliberately generic — it knows nothing about government
 * documents — so ornaments, properties, deposits and banks can reuse it as-is.
 */
const AttachmentField = ({ drafts, onChange, readOnly, label }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [picking, setPicking] = useState(false);
  const [viewing, setViewing] = useState<ViewableFile | null>(null);

  const files = useMemo(() => drafts.map(draftToFile), [drafts]);
  const previewUrls = useAttachmentUrls(files);

  const atLimit = drafts.length >= ATTACHMENT_MAX_PER_RECORD;

  const add = (file: StagedFile) => {
    if (drafts.length >= ATTACHMENT_MAX_PER_RECORD) {
      showToast(
        "error",
        "Attachment limit reached",
        `A record can hold ${ATTACHMENT_MAX_PER_RECORD} files. Remove one to add another.`,
        "bottom"
      );
      return;
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      showToast(
        "error",
        "File too large",
        `${file.name} is ${formatFileSize(file.size)}. The limit is ${formatFileSize(
          ATTACHMENT_MAX_BYTES
        )}.`,
        "bottom"
      );
      return;
    }
    onChange([
      ...drafts,
      { kind: "staged", key: `staged-${Date.now()}-${drafts.length}`, file },
    ]);
  };

  const remove = (key: string) =>
    onChange(drafts.filter((draft) => draft.key !== key));

  const takePhoto = async () => {
    setPicking(false);
    // The camera roll needs no permission prompt on web, and there is no
    // camera permission to ask for either — the browser handles both.
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showToast(
          "error",
          "Camera unavailable",
          "Allow camera access in Settings to photograph a document.",
          "bottom"
        );
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    handlePicked(result);
  };

  const pickImage = async () => {
    setPicking(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    handlePicked(result);
  };

  const handlePicked = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.length) {
      return;
    }
    const asset = result.assets[0];
    add({
      uri: asset.uri,
      // A camera shot has no file name of its own, so give it a readable one
      // rather than letting the row show a blank.
      name: asset.fileName || `photo-${Date.now()}.jpg`,
      mime: asset.mimeType || "image/jpeg",
      size: asset.fileSize ?? 0,
    });
  };

  const pickPdf = async () => {
    setPicking(false);
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      // Without this the uri can point somewhere the app loses access to before
      // the save happens, which is exactly when we read the bytes.
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) {
      return;
    }
    const asset = result.assets[0];
    add({
      uri: asset.uri,
      name: asset.name || `document-${Date.now()}.pdf`,
      mime: asset.mimeType || "application/pdf",
      size: asset.size ?? 0,
    });
  };

  return (
    <>
      <Text style={styles.sectionTitle}>{label ?? "Attachments"}</Text>

      {drafts.map((draft, index) => {
        const file = files[index];
        // A staged pick renders straight off its local uri; a stored image
        // needs its signed url; a PDF has neither and falls back to an icon.
        const preview =
          file.source.kind === "local" && isImageAttachment(file)
            ? file.source.uri
            : previewUrls[file.key];

        return (
          <Pressable
            key={draft.key}
            style={styles.row}
            onPress={() => setViewing(file)}
            accessibilityRole="button"
          >
            {preview ? (
              <Image source={{ uri: preview }} style={styles.thumbnail} />
            ) : (
              <View style={styles.thumbnailFallback}>
                <Ionicons
                  name={
                    draftMime(draft) === "application/pdf"
                      ? "document-text-outline"
                      : "image-outline"
                  }
                  size={22}
                  color={colors.primary}
                />
              </View>
            )}
            <View style={styles.rowText}>
              <Text style={styles.rowName} numberOfLines={1}>
                {draftName(draft)}
              </Text>
              <Text style={styles.rowMeta}>
                {[
                  formatFileSize(draftSize(draft)),
                  draft.kind === "staged" ? "Not saved yet" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
            {!readOnly && (
              <Pressable
                onPress={() => remove(draft.key)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${draftName(draft)}`}
              >
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            )}
          </Pressable>
        );
      })}

      {!drafts.length && (
        <Text style={styles.empty}>
          {readOnly ? "No files attached." : "No files yet — add a scan or a photo."}
        </Text>
      )}

      {!readOnly && !atLimit && (
        <Pressable
          style={styles.addButton}
          onPress={() => setPicking(true)}
          accessibilityRole="button"
        >
          <Ionicons name="attach" size={18} color={colors.primary} />
          <Text style={styles.addText}>Add attachment</Text>
        </Pressable>
      )}

      {!readOnly && atLimit && (
        <Text style={styles.limitHint}>
          {`Limit of ${ATTACHMENT_MAX_PER_RECORD} files reached — remove one to add another.`}
        </Text>
      )}

      <PickerSheet
        visible={picking}
        onClose={() => setPicking(false)}
        onTakePhoto={takePhoto}
        onPickImage={pickImage}
        onPickPdf={pickPdf}
      />

      {/* No `onShare` — sharing lives on the list row, not in the editor. */}
      <AttachmentViewer file={viewing} onClose={() => setViewing(null)} />
    </>
  );
};

/* ------------------------------------------------------------------ *
 * Source chooser
 * ------------------------------------------------------------------ */

type PickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickImage: () => void;
  onPickPdf: () => void;
};

const PickerSheet = ({
  visible,
  onClose,
  onTakePhoto,
  onPickImage,
  onPickPdf,
}: PickerSheetProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sources: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
    // Web has no camera to launch into; the file chooser covers it there.
    ...(Platform.OS === "web"
      ? []
      : [{ icon: "camera-outline" as const, label: "Take photo", onPress: onTakePhoto }]),
    { icon: "images-outline", label: "Choose from gallery", onPress: onPickImage },
    { icon: "document-outline", label: "Pick a PDF", onPress: onPickPdf },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          {sources.map((source) => (
            <Pressable
              key={source.label}
              style={styles.sourceRow}
              onPress={source.onPress}
              accessibilityRole="button"
            >
              <Ionicons name={source.icon} size={20} color={colors.primary} />
              <Text style={styles.sourceText}>{source.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginBottom: 16,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.inputBackground,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 8,
    },
    thumbnail: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    // Same footprint as a thumbnail, so a PDF and an image line up in the list.
    thumbnailFallback: {
      width: 44,
      height: 44,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(colors.primary),
    },
    rowText: {
      flex: 1,
    },
    rowName: {
      fontSize: 15,
      color: colors.text,
    },
    rowMeta: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    empty: {
      fontSize: 14,
      color: colors.textMuted,
      paddingVertical: 4,
      marginBottom: 8,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 6,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: tint(colors.primary),
    },
    addText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.primary,
    },
    limitHint: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
      paddingVertical: 8,
    },
    backdrop: {
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
    sourceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 16,
      paddingHorizontal: 12,
    },
    sourceText: {
      fontSize: 16,
      color: colors.text,
    },
  });

export default AttachmentField;
