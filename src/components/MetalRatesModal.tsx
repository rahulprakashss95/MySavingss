import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MetalRates } from "../models/AssetModel";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";
import { fetchLiveMetalRates } from "../utils/metalRates";
import { showToast } from "../utils/Utils";

type IMetalRatesModal = {
  visible: boolean;
  rates: MetalRates;
  /** True while the parent is writing to the database. */
  isSaving: boolean;
  onClose: () => void;
  onSave: (rates: MetalRates) => void;
};

/**
 * Editing rates is a once-a-week act, so it lives behind a tap rather than
 * occupying the overview. The draft is local: closing without saving discards
 * it, including a fetch the user decided against.
 */
const MetalRatesModal = (props: IMetalRatesModal) => {
  const { visible, rates, isSaving, onClose, onSave } = props;
  const [draft, setDraft] = useState<MetalRates>(rates);
  const [isFetching, setIsFetching] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Reopening after a cancel must not resurrect the abandoned draft.
  useEffect(() => {
    if (visible) {
      setDraft(rates);
    }
  }, [visible, rates]);

  const handleFetch = () => {
    setIsFetching(true);
    fetchLiveMetalRates()
      .then((live) => {
        setDraft((current) => ({ ...current, ...live }));
        showToast(
          "success",
          "Rates fetched",
          "Review them, then save.",
          "bottom"
        );
      })
      .catch((error) => {
        console.log(error);
        showToast(
          "error",
          "Couldn't fetch rates",
          "Enter today's price per gram by hand instead.",
          "bottom"
        );
      })
      .finally(() => setIsFetching(false));
  };

  const busy = isFetching || isSaving;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Tapping outside dismisses, matching the platform convention. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.centre}
          pointerEvents="box-none"
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Metal rates</Text>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.label}>Gold / gram</Text>
            <View style={[styles.affixRow, styles.fieldSpacing]}>
              <Text style={styles.affix}>₹</Text>
              <TextInput
                style={styles.affixInput}
                value={draft.goldPerGram}
                onChangeText={(text) =>
                  setDraft((current) => ({ ...current, goldPerGram: text }))
                }
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.label}>Silver / gram</Text>
            <View style={[styles.affixRow, styles.fieldSpacing]}>
              <Text style={styles.affix}>₹</Text>
              <TextInput
                style={styles.affixInput}
                value={draft.silverPerGram}
                onChangeText={(text) =>
                  setDraft((current) => ({ ...current, silverPerGram: text }))
                }
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.hint}>
              Rates are the 24K India (IBJA) benchmark. Each ornament is valued
              at its own purity, so a 22K piece counts at 22/24 of the gold rate.
            </Text>

            <Pressable
              onPress={handleFetch}
              disabled={busy}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.fetchButton,
                pressed && styles.pressed,
                busy && styles.disabled,
              ]}
            >
              <Ionicons
                name="cloud-download-outline"
                size={16}
                color={colors.primary}
                style={styles.buttonIcon}
              />
              <Text style={styles.fetchText}>
                {isFetching ? "Fetching…" : "Fetch latest"}
              </Text>
            </Pressable>

            <View style={styles.actions}>
              <Pressable
                onPress={onClose}
                disabled={busy}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={() => onSave(draft)}
                disabled={busy}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.pressed,
                  busy && styles.disabled,
                ]}
              >
                <Text style={styles.saveText}>
                  {isSaving ? "Saving…" : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
    },
    centre: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
    },
    sheet: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.24,
      shadowRadius: 16,
      elevation: 8,
      // Never wider than a phone card, even on a desktop browser.
      maxWidth: 420,
      width: "100%",
      alignSelf: "center",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    fieldSpacing: {
      marginBottom: 16,
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
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
      marginBottom: 16,
    },
    fetchButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 13,
    },
    buttonIcon: {
      marginRight: 8,
    },
    fetchText: {
      color: colors.primary,
      fontWeight: "600",
      fontSize: 14,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      marginTop: 20,
    },
    cancelButton: {
      paddingVertical: 13,
      paddingHorizontal: 18,
    },
    cancelText: {
      color: colors.textMuted,
      fontWeight: "600",
      fontSize: 14,
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 13,
      paddingHorizontal: 28,
      marginLeft: 8,
    },
    saveText: {
      color: colors.onPrimary,
      fontWeight: "600",
      fontSize: 14,
    },
    disabled: {
      opacity: 0.6,
    },
    pressed: {
      opacity: 0.6,
    },
  });

export default MetalRatesModal;
