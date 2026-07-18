import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { isImageAttachment } from "../models/common";
import { ThemeColors } from "../utils/Color";
import { viewUrl, type ViewableFile } from "../utils/attachments";
import { showToast } from "../utils/Utils";

/**
 * Thumbnail uris keyed by file key, for the image files in `files`.
 *
 * PDFs get no entry — there is nothing to render without a rasteriser — and
 * neither do failures: a preview that won't load falls back to an icon, which
 * isn't worth interrupting a screen over.
 */
export const useAttachmentUrls = (files: ViewableFile[]) => {
  const [urls, setUrls] = useState<Record<string, string>>({});

  const images = useMemo(
    () => files.filter((file) => isImageAttachment(file)),
    [files]
  );

  // Signing is a network call per file, so it must happen when the *set* of
  // files changes — not whenever the array is rebuilt. Without this, typing in
  // a form re-signs every thumbnail on each keystroke.
  const signature = images.map((file) => file.key).join("|");

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const entries = await Promise.all(
        images.map(async (file) => {
          try {
            return [file.key, await viewUrl(file)] as const;
          } catch {
            return null;
          }
        })
      );
      if (!cancelled) {
        setUrls(Object.fromEntries(entries.filter((entry) => entry !== null)));
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
    // `images` is intentionally absent: `signature` is its stable identity, and
    // depending on the array itself would re-sign on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return urls;
};

type Props = {
  /** The file to show, or null when closed. */
  file: ViewableFile | null;
  onClose: () => void;
  /** Omit to hide the share action — the add/edit form does. */
  onShare?: (file: ViewableFile) => void;
};

/**
 * Shows an image full-width and hands a PDF to the OS.
 *
 * The uri is resolved when the viewer opens rather than up front, so opening a
 * list doesn't mint a signed URL for every file someone might never tap.
 */
const AttachmentViewer = ({ file, onClose, onShare }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [url, setUrl] = useState<string | null>(null);

  const isImage = file ? isImageAttachment(file) : false;

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    let cancelled = false;

    const resolve = async () => {
      try {
        const resolved = await viewUrl(file);
        if (cancelled) {
          return;
        }
        if (isImageAttachment(file)) {
          setUrl(resolved);
        } else {
          // Nothing renders a PDF inline on every platform the app ships to, so
          // hand it to whatever already does it well and close the modal.
          onClose();
          await Linking.openURL(resolved);
        }
      } catch (error) {
        if (!cancelled) {
          onClose();
          showToast("error", "Unable to open file", String(error), "bottom");
        }
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [file, onClose]);

  return (
    <Modal
      visible={!!file && isImage}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {file?.name ?? ""}
            </Text>
            {!!onShare && (
              <Pressable
                onPress={() => file && onShare(file)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Share"
              >
                <Ionicons name="share-outline" size={20} color={colors.primary} />
              </Pressable>
            )}
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          {url ? (
            <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />
          ) : (
            <ActivityIndicator style={styles.image} color={colors.primary} />
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      padding: 16,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    title: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    image: {
      width: "100%",
      height: 420,
      backgroundColor: colors.background,
    },
  });

export default AttachmentViewer;
