import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { isImageAttachment, type Attachment } from "../models/common";
import { ThemeColors, tint } from "../utils/Color";
import { shareFile, storedFile, type ViewableFile } from "../utils/attachments";
import AttachmentViewer, { useAttachmentUrls } from "./AttachmentViewer";

type Props = {
  /** Undefined on records saved before attachments existed. */
  attachments: Attachment[] | undefined;
};

/**
 * A record's files in a list row, behind a disclosure: a count you can tap to
 * expand into full-width previews, each with its own share button.
 *
 * This replaced a row of small thumbnails. A list row can't spare the height to
 * show a document scan at a size anyone can actually read, and a thumbnail too
 * small to read is just decoration taking up space on every row. Collapsed by
 * default keeps the list scannable; expanded gives the file the width it needs.
 *
 * Renders nothing when there are no files, so rows without attachments are
 * untouched.
 */
const AttachmentSection = ({ attachments }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const files = useMemo(() => (attachments ?? []).map(storedFile), [attachments]);
  const [expanded, setExpanded] = useState(false);
  const [viewing, setViewing] = useState<ViewableFile | null>(null);

  // Only sign urls once expanded. Signing on render would fire a network call
  // per image for every row in the list, for previews nobody has asked to see.
  const urls = useAttachmentUrls(expanded ? files : []);

  if (!files.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.toggle}
        onPress={() => setExpanded((open) => !open)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Ionicons name="attach" size={14} color={colors.primary} />
        <Text style={styles.toggleText}>
          {files.length === 1 ? "1 attachment" : `${files.length} attachments`}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={colors.primary}
        />
      </Pressable>

      {expanded &&
        files.map((file) => (
          <View key={file.key} style={styles.card}>
            <Pressable
              onPress={() => setViewing(file)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${file.name}`}
            >
              {urls[file.key] ? (
                <Image
                  source={{ uri: urls[file.key] }}
                  style={styles.preview}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.preview, styles.previewFallback]}>
                  <Ionicons
                    name={
                      isImageAttachment(file)
                        ? "image-outline"
                        : "document-text-outline"
                    }
                    size={26}
                    color={colors.primary}
                  />
                  <Text style={styles.previewFallbackText}>
                    {isImageAttachment(file) ? "Loading…" : "Tap to open PDF"}
                  </Text>
                </View>
              )}
            </Pressable>

            <View style={styles.cardFooter}>
              <Text style={styles.cardName} numberOfLines={1}>
                {file.name}
              </Text>
              <Pressable
                style={styles.shareButton}
                onPress={() => shareFile(file)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Share ${file.name}`}
              >
                <Ionicons name="share-outline" size={14} color={colors.primary} />
                <Text style={styles.shareText}>Share</Text>
              </Pressable>
            </View>
          </View>
        ))}

      <AttachmentViewer
        file={viewing}
        onClose={() => setViewing(null)}
        onShare={shareFile}
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginTop: 8,
    },
    toggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      paddingVertical: 4,
    },
    toggleText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
    },
    card: {
      marginTop: 8,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      overflow: "hidden",
    },
    preview: {
      width: "100%",
      height: 170,
      backgroundColor: colors.background,
    },
    previewFallback: {
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: tint(colors.primary),
    },
    previewFallbackText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    cardName: {
      flex: 1,
      fontSize: 12,
      color: colors.textMuted,
    },
    shareButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: tint(colors.primary),
    },
    shareText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
    },
  });

export default AttachmentSection;
