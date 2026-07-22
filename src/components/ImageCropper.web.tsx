import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { StagedFile } from "../../database/query";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";
import type { ImageCropperProps } from "./ImageCropper";

/**
 * A square profile-picture cropper for the web build, where the image picker
 * has no OS editor of its own (iOS/Android use theirs via `allowsEditing`, so
 * this never renders on device — see the native stub in `ImageCropper.tsx`).
 *
 * The user drags to reposition and scrolls (or uses −/+) to zoom; the picked
 * image always covers the frame, so there is never empty space to crop into.
 * On confirm the framed square is drawn to an offscreen canvas at `OUTPUT`px
 * and handed back as a JPEG `StagedFile`, ready for the same upload path a
 * native crop feeds.
 */

/** The on-screen crop window, in px. Square — avatars are circular. */
const VIEWPORT = 260;
/** Exported image edge, in px. A circular 72px avatar needs no more than this. */
const OUTPUT = 512;
const MAX_ZOOM = 4;

const ImageCropper = ({ visible, uri, onCancel, onCropped }: ImageCropperProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const containerRef = useRef<View | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Read in gesture handlers, which close over the values at bind time.
  const zoomRef = useRef(zoom);
  const offsetRef = useRef(offset);
  zoomRef.current = zoom;
  offsetRef.current = offset;

  // Base scale that makes the image just cover the square (smaller side = frame).
  const coverScale = natural ? VIEWPORT / Math.min(natural.w, natural.h) : 1;

  // Keep the frame fully covered: the image can't be dragged past the point
  // where an edge would pull inside the window.
  const clampOffset = useCallback(
    (x: number, y: number, z: number) => {
      if (!natural) return { x: 0, y: 0 };
      const dispW = natural.w * coverScale * z;
      const dispH = natural.h * coverScale * z;
      const maxX = Math.max(0, (dispW - VIEWPORT) / 2);
      const maxY = Math.max(0, (dispH - VIEWPORT) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      };
    },
    [natural, coverScale]
  );

  // Reset and read the natural size whenever a new image comes in.
  useEffect(() => {
    if (!uri) {
      setNatural(null);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = uri;
  }, [uri]);

  const applyZoom = useCallback(
    (next: number) => {
      const z = Math.min(MAX_ZOOM, Math.max(1, next));
      setZoom(z);
      setOffset((o) => clampOffset(o.x, o.y, z));
    },
    [clampOffset]
  );

  // Wheel to zoom, pointer-drag to pan. Bound to the real DOM node (a
  // react-native-web View forwards its ref to the host element).
  useEffect(() => {
    const el = containerRef.current as unknown as HTMLElement | null;
    if (!el || !visible) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyZoom(zoomRef.current - e.deltaY * 0.002);
    };

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startOffset = { x: 0, y: 0 };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startOffset = { ...offsetRef.current };
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const nx = startOffset.x + (e.clientX - startX);
      const ny = startOffset.y + (e.clientY - startY);
      setOffset(clampOffset(nx, ny, zoomRef.current));
    };
    const onUp = () => {
      dragging = false;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [visible, applyZoom, clampOffset]);

  const confirm = () => {
    if (!natural || !uri) return;
    const total = coverScale * zoom;
    const srcSize = VIEWPORT / total;
    // Map the frame back to source pixels (inverse of the on-screen transform).
    let srcX =
      (natural.w * coverScale * zoom) / 2 / total - VIEWPORT / 2 / total - offset.x / total;
    let srcY =
      (natural.h * coverScale * zoom) / 2 / total - VIEWPORT / 2 / total - offset.y / total;
    srcX = Math.min(Math.max(0, srcX), natural.w - srcSize);
    srcY = Math.min(Math.max(0, srcY), natural.h - srcSize);

    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT, OUTPUT);
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          onCropped({
            uri: URL.createObjectURL(blob),
            name: `avatar-${Date.now()}.jpg`,
            mime: "image/jpeg",
            size: blob.size,
          });
        },
        "image/jpeg",
        0.85
      );
    };
    img.src = uri;
  };

  const dispW = natural ? natural.w * coverScale * zoom : 0;
  const dispH = natural ? natural.h * coverScale * zoom : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Crop your picture</Text>

          <View ref={containerRef} style={styles.viewport} collapsable={false}>
            {!!natural && !!uri && (
              <Image
                source={{ uri }}
                // left/top place the image so its centre sits at the frame
                // centre plus the drag offset — the exact transform the crop
                // maths inverts above.
                style={{
                  position: "absolute",
                  width: dispW,
                  height: dispH,
                  left: (VIEWPORT - dispW) / 2 + offset.x,
                  top: (VIEWPORT - dispH) / 2 + offset.y,
                }}
              />
            )}
            {/* Circular guide showing how the square will read as an avatar. */}
            <View style={styles.circleGuide} pointerEvents="none" />
          </View>

          <View style={styles.zoomRow}>
            <Pressable
              style={styles.zoomButton}
              onPress={() => applyZoom(zoom - 0.25)}
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
            >
              <Text style={styles.zoomText}>−</Text>
            </Pressable>
            <Text style={styles.hint}>Drag to reposition · scroll to zoom</Text>
            <Pressable
              style={styles.zoomButton}
              onPress={() => applyZoom(zoom + 0.25)}
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
            >
              <Text style={styles.zoomText}>+</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.action, styles.cancel]}
              onPress={onCancel}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.action, styles.confirm]}
              onPress={confirm}
              accessibilityRole="button"
            >
              <Text style={styles.confirmText}>Use photo</Text>
            </Pressable>
          </View>
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
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    sheet: {
      width: VIEWPORT + 48,
      maxWidth: "100%",
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 24,
      alignItems: "center",
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 18,
    },
    viewport: {
      width: VIEWPORT,
      height: VIEWPORT,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.inputBackground,
      // A grabbable surface — the whole frame pans.
      cursor: "grab",
    } as any,
    circleGuide: {
      position: "absolute",
      top: 0,
      left: 0,
      width: VIEWPORT,
      height: VIEWPORT,
      borderRadius: VIEWPORT / 2,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.85)",
    },
    zoomRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 16,
    },
    zoomButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    zoomText: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      lineHeight: 22,
    },
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      flexShrink: 1,
      textAlign: "center",
    },
    actions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 22,
      alignSelf: "stretch",
    },
    action: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
    },
    cancel: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    confirm: {
      backgroundColor: colors.primary,
    },
    confirmText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.card,
    },
  });

export default ImageCropper;
