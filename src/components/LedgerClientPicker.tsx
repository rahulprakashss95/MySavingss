import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getLedgerClients } from "../../database/firebaseQuery";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { LedgerClientModel } from "../models/LedgerModel";
import { ThemeColors } from "../utils/Color";
import { showToast } from "../utils/Utils";

type ILedgerClientPicker = {
  selectedId: string;
  /** Both id and name are lifted: the name is denormalised onto the entry. */
  onSelect: (clientId: string, clientName: string) => void;
};

/**
 * The clients of whoever is signed in. Empty until they add one, which the
 * caller surfaces as a validation error rather than a silent no-op.
 */
const LedgerClientPicker = ({ selectedId, onSelect }: ILedgerClientPicker) => {
  const [clients, setClients] = useState<LedgerClientModel[]>([]);
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    getLedgerClients()
      .then((data) =>
        setClients([...data].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")))
      )
      .catch((error) => {
        console.log(error);
        showToast(
          "error",
          "Unable to load clients",
          "Your client list could not be fetched.",
          "bottom"
        );
      });
  }, [user]);

  const handleChange = (clientId: string) => {
    const client = clients.find((candidate) => candidate.id === clientId);
    onSelect(clientId, client?.name ?? "");
  };

  return (
    <>
      <Text style={styles.label}>Client</Text>
      <View style={styles.pickerContainer}>
        <Picker
          style={styles.picker}
          dropdownIconColor={colors.text}
          mode="dropdown"
          selectedValue={selectedId}
          onValueChange={handleChange}
        >
          <Picker.Item
            label={clients.length ? "Select a client" : "No clients yet"}
            value=""
            color={colors.placeholder}
            style={styles.pickerItem}
          />
          {clients.map((client) => (
            <Picker.Item
              key={client.id}
              label={client.name}
              value={client.id}
              color={colors.text}
              style={styles.pickerItem}
            />
          ))}
        </Picker>
      </View>
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
  });

export default LedgerClientPicker;
