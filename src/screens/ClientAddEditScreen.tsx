import { Ionicons } from "@expo/vector-icons";
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
  addClient,
  deleteClient,
  updateClient,
} from "../../database/firebaseQuery";
import Button from "../components/Button";
import Loader from "../components/Loader";
import VisibilityToggle from "../components/VisibilityToggle";
import { useTheme } from "../context/ThemeContext";
import {
  ClientModel,
  clientMobileNumbers,
  toMobileList,
} from "../models/ClientModel";
import { Visibility } from "../models/common";
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

const ClientAddEditScreen = ({ route, navigation }: Props) => {
  const { clientData } = (route.params as any) || {};
  const client: ClientModel | null = clientData || null;
  const pageMode = client ? "Edit" : "Add";

  const [name, setName] = useState(client?.name ?? "");
  // Keep at least one row so there's always a field to type into.
  const [numbers, setNumbers] = useState<string[]>(() => {
    const existing = clientMobileNumbers(client?.mobile);
    return existing.length ? existing : [""];
  });
  const [visibility, setVisibility] = useState<Visibility>(
    client?.visibility ?? "private"
  );
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const setNumberAt = (index: number, value: string) =>
    setNumbers((current) => current.map((n, i) => (i === index ? value : n)));

  const addNumberRow = () => setNumbers((current) => [...current, ""]);

  const removeNumberRow = (index: number) =>
    setNumbers((current) =>
      current.length === 1 ? [""] : current.filter((_, i) => i !== index)
    );

  const handleSave = () => {
    if (!name.trim()) {
      showToast("error", "Incomplete form", "Enter the client's name.", "bottom");
      return;
    }

    setIsLoading(true);
    const payload = {
      name: name.trim(),
      mobile: toMobileList(numbers),
      visibility,
    };

    const save =
      pageMode === "Add"
        ? addClient(payload)
        : updateClient(client!.id, payload);

    save
      .then(() => navigation.goBack())
      .catch((error) => {
        showToast("error", "Unable to save", String(error), "bottom");
      })
      .finally(() => setIsLoading(false));
  };

  const handleDelete = () => {
    showConfirmationAlert(
      "Delete client",
      "Fixed deposits already recorded against this client are kept. Continue?"
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      setIsLoading(true);
      deleteClient(client!.id)
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
        <Text style={styles.sectionTitle}>Client</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          onChangeText={setName}
          value={name}
          placeholder="e.g. KVB Capital"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="words"
        />

        <View style={styles.numbersHeader}>
          <Text style={styles.label}>Contact numbers</Text>
          <Pressable
            onPress={addNumberRow}
            accessibilityRole="button"
            hitSlop={8}
            style={styles.addNumber}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={styles.addNumberText}>Add</Text>
          </Pressable>
        </View>

        {numbers.map((number, index) => (
          <View key={index} style={styles.numberRow}>
            <TextInput
              style={[styles.input, styles.numberInput]}
              onChangeText={(value) => setNumberAt(index, value)}
              value={number}
              placeholder="Phone number"
              placeholderTextColor={colors.placeholder}
              keyboardType="phone-pad"
            />
            <Pressable
              onPress={() => removeNumberRow(index)}
              accessibilityRole="button"
              accessibilityLabel="Remove number"
              hitSlop={8}
              style={styles.removeNumber}
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ))}
      </View>

      <Button
        title={pageMode === "Add" ? "Add client" : "Save changes"}
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
          <Text style={styles.deleteText}>Delete client</Text>
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
    numbersHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 18,
    },
    addNumber: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    addNumberText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary,
      marginLeft: 2,
    },
    numberRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    numberInput: {
      flex: 1,
    },
    removeNumber: {
      padding: 8,
      marginLeft: 6,
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

export default ClientAddEditScreen;
