import { Picker } from "@react-native-picker/picker";
import moment from "moment";
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
  addEarning,
  deleteEarning,
  updateEarning,
} from "../../database/firebaseQuery";
import Button from "../components/Button";
import DatePicker from "../components/DatePicker";
import LedgerClientPicker from "../components/LedgerClientPicker";
import Loader from "../components/Loader";
import VisibilityToggle from "../components/VisibilityToggle";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Visibility } from "../models/common";
import { EARNING_TYPES, EarningModel } from "../models/LedgerModel";
import { ThemeColors } from "../utils/Color";
import { DATE_FORMAT } from "../utils/deposits";
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

const EarningAddEditScreen = ({ route, navigation }: Props) => {
  const { earningData } = (route.params as any) || {};
  const earning: EarningModel | null = earningData || null;
  const pageMode = earning ? "Edit" : "Add";

  const [clientId, setClientId] = useState(earning?.clientId ?? "");
  const [clientName, setClientName] = useState(earning?.clientName ?? "");
  const [type, setType] = useState(earning?.type ?? "");
  const [amount, setAmount] = useState(earning?.amount ?? "");
  // Money is nearly always recorded the day it lands, so today is a fair default.
  const [date, setDate] = useState(
    earning?.date ?? moment().format(DATE_FORMAT)
  );
  const [comments, setComments] = useState(earning?.comments ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    earning?.visibility ?? "private"
  );
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selectClient = (id: string, label: string) => {
    setClientId(id);
    setClientName(label);
  };

  /** Returns an error message, or null when the form is good to submit. */
  const validationError = () => {
    if (!clientId) return "Choose a client. Add one first if the list is empty.";
    if (!type) return "Choose an earning type.";
    if (!amount.trim() || Number(amount) <= 0) return "Enter an amount.";
    if (!date) return "Pick a date.";
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
      clientId,
      clientName,
      type,
      amount: amount.trim(),
      date,
      comments: comments.trim(),
      visibility,
      loginUserId: earning?.loginUserId ?? user?.id ?? "",
    };

    const save =
      pageMode === "Add"
        ? addEarning(payload)
        : updateEarning(earning!.id, payload);

    save
      .then(() => navigation.goBack())
      .catch((saveError) => {
        showToast("error", "Unable to save", String(saveError), "bottom");
      })
      .finally(() => setIsLoading(false));
  };

  const handleDelete = () => {
    showConfirmationAlert(
      "Delete earning",
      "Are you sure you want to delete this entry?"
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      setIsLoading(true);
      deleteEarning(earning!.id)
        .then(() => navigation.goBack())
        .catch((deleteError) => {
          showToast("error", "Unable to delete", String(deleteError), "bottom");
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
        <Text style={styles.sectionTitle}>Earning</Text>

        <LedgerClientPicker selectedId={clientId} onSelect={selectClient} />

        <Text style={styles.label}>Type</Text>
        <View style={styles.pickerContainer}>
          <Picker
            style={styles.picker}
            dropdownIconColor={colors.text}
            mode="dialog"
            selectedValue={type}
            onValueChange={setType}
          >
            <Picker.Item
              label="Select a type"
              value=""
              color={colors.placeholder}
              style={styles.pickerItem}
            />
            {EARNING_TYPES.map((option) => (
              <Picker.Item
                key={option}
                label={option}
                value={option}
                color={colors.text}
                style={styles.pickerItem}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Amount</Text>
        <View style={[styles.affixRow, styles.inputSpacing]}>
          <Text style={styles.affix}>₹</Text>
          <TextInput
            style={styles.affixInput}
            onChangeText={setAmount}
            value={amount}
            placeholder="0"
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
          />
        </View>

        <DatePicker
          label="Date"
          dateValue={date}
          onDateChange={(next: any) => setDate(next || "")}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notes</Text>

        <Text style={styles.label}>Comments</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          onChangeText={setComments}
          value={comments}
          placeholder="Anything worth remembering about this payment…"
          placeholderTextColor={colors.placeholder}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <Button
        title={pageMode === "Add" ? "Add earning" : "Save changes"}
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
          <Text style={styles.deleteText}>Delete earning</Text>
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
    inputSpacing: {
      marginBottom: 18,
    },
    multiline: {
      minHeight: 96,
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

export default EarningAddEditScreen;
