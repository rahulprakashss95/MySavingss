import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors, tint } from "../utils/Color";

export type Option = { id: string; name: string };

type AddFormHandlers = {
  /** Call once the new record is created; it becomes selected and both layers close. */
  onCreated: (item: Option) => void;
  /** Call to dismiss the add form and return to the list. */
  onCancel: () => void;
};

type Props = {
  label: string;
  placeholder?: string;
  selectedId: string;
  /** Stored name for `selectedId`, so the field stays filled when the option
   * list hasn't loaded or the record belongs to someone else. */
  selectedName?: string;
  options: Option[];
  onSelect: (id: string, name: string) => void;
  /** Label for the add row and the popup title, e.g. "Add bank". Omit to hide add. */
  addLabel?: string;
  /** Renders the entity's full form inside the add popup. Omit to hide add. */
  renderAddForm?: (handlers: AddFormHandlers) => React.ReactNode;
};

/**
 * A Zoho-Creator-style lookup field: tap to open a searchable sheet of options,
 * or use the "Add" row to create a new record in a popup form and have it
 * selected on save — all without leaving the current screen.
 */
const SearchableSelect = ({
  label,
  placeholder,
  selectedId,
  selectedName,
  options,
  onSelect,
  addLabel,
  renderAddForm,
}: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { height: windowHeight } = useWindowDimensions();

  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Lift the sheet above the keyboard ourselves: a RN Modal is its own window
  // and doesn't resize for the keyboard, so KeyboardAvoidingView can't see it.
  useEffect(() => {
    if (!open) {
      return;
    }
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) =>
      setKeyboardHeight(e.endCoordinates?.height ?? 0)
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [open]);

  const sorted = useMemo(
    () => [...options].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
    [options]
  );
  const selected = sorted.find((option) => option.id === selectedId);
  const fieldLabel = selected?.name ?? (selectedId ? selectedName ?? "" : "");

  const trimmed = query.trim();
  const filtered = useMemo(() => {
    const needle = trimmed.toLowerCase();
    return needle
      ? sorted.filter((option) => (option.name ?? "").toLowerCase().includes(needle))
      : sorted;
  }, [sorted, trimmed]);

  const closeSheet = () => {
    Keyboard.dismiss();
    setKeyboardHeight(0);
    setOpen(false);
    setQuery("");
  };

  const choose = (option: Option) => {
    onSelect(option.id, option.name);
    closeSheet();
  };

  const handleCreated = (item: Option) => {
    setAdding(false);
    onSelect(item.id, item.name);
    closeSheet();
  };

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={styles.field}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
      >
        <Text
          style={[styles.fieldText, !fieldLabel && styles.placeholderText]}
          numberOfLines={1}
        >
          {fieldLabel || placeholder || "Select"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      {/* Searchable option sheet */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={closeSheet}>
        <View style={[styles.backdrop, { paddingBottom: keyboardHeight }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          <View
            style={[
              styles.sheet,
              // Centered in the space left above the keyboard, never taller than it.
              { maxHeight: windowHeight - keyboardHeight - 120 },
            ]}
          >
            <View style={styles.searchRow}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder={`Search ${label.toLowerCase()}`}
                placeholderTextColor={colors.placeholder}
                autoFocus
                returnKeyType="done"
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(option) => option.id}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.row}
                  onPress={() => choose(item)}
                  accessibilityRole="button"
                >
                  <Text style={styles.rowText} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.id === selectedId && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  {trimmed ? "No matches" : "Nothing here yet"}
                </Text>
              }
            />

            {renderAddForm && (
              <Pressable
                style={styles.addButton}
                onPress={() => setAdding(true)}
                accessibilityRole="button"
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={styles.addText}>{addLabel ?? "Add new"}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* Add-new popup form */}
      <Modal
        visible={adding}
        transparent
        animationType="slide"
        onRequestClose={() => setAdding(false)}
      >
        <View style={styles.formBackdrop}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{addLabel}</Text>
              <Pressable
                onPress={() => setAdding(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {renderAddForm?.({
                onCreated: handleCreated,
                onCancel: () => setAdding(false),
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    field: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.inputBackground,
      paddingHorizontal: 12,
      height: 50,
      marginBottom: 18,
    },
    fieldText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      marginRight: 8,
    },
    placeholderText: {
      color: colors.placeholder,
    },
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    sheet: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 12,
      paddingBottom: 16,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.inputBackground,
      paddingHorizontal: 12,
      height: 46,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    list: {
      flexGrow: 0,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      marginRight: 8,
    },
    empty: {
      textAlign: "center",
      color: colors.textMuted,
      paddingVertical: 20,
      fontSize: 14,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 8,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: tint(colors.primary),
    },
    addText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.primary,
    },
    formBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    formCard: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      maxHeight: "92%",
    },
    formHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 6,
    },
    formTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    formContent: {
      padding: 20,
      paddingBottom: 32,
    },
  });

export default SearchableSelect;
