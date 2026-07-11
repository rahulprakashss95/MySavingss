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
  addLedgerClient,
  deleteLedgerClient,
  updateLedgerClient,
} from "../../database/firebaseQuery";
import Button from "../components/Button";
import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { LedgerClientModel } from "../models/LedgerModel";
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

const LedgerClientAddEditScreen = ({ route, navigation }: Props) => {
  const { clientData } = (route.params as any) || {};
  const client: LedgerClientModel | null = clientData || null;
  const pageMode = client ? "Edit" : "Add";

  const [name, setName] = useState(client?.name ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [description, setDescription] = useState(client?.description ?? "");
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSave = () => {
    if (!name.trim()) {
      showToast("error", "Incomplete form", "Enter the client's name.", "bottom");
      return;
    }

    setIsLoading(true);
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      description: description.trim(),
      // setDoc replaces the whole document, so the owner has to be written back
      // on edit or the client would vanish from its owner's ledger.
      loginUserId: client?.loginUserId ?? user?.id ?? "",
    };

    const save =
      pageMode === "Add"
        ? addLedgerClient(payload)
        : updateLedgerClient(client!.id, payload);

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
      "Earnings and savings already recorded against this client are kept. Continue?"
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      setIsLoading(true);
      deleteLedgerClient(client!.id)
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
        <Text style={styles.sectionTitle}>Client</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={[styles.input, styles.inputSpacing]}
          onChangeText={setName}
          value={name}
          placeholder="e.g. Acme Corp"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={[styles.input, styles.inputSpacing]}
          onChangeText={setPhone}
          value={phone}
          placeholder="Phone number"
          placeholderTextColor={colors.placeholder}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          onChangeText={setEmail}
          value={email}
          placeholder="name@example.com"
          placeholderTextColor={colors.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
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
          placeholder="Anything worth remembering about this client…"
          placeholderTextColor={colors.placeholder}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
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

export default LedgerClientAddEditScreen;
