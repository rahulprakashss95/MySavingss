import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { displayNameOf } from "../models/LoginUserModel";
import { ThemeColors } from "../utils/Color";

type IPersonPicker = {
  selectedId: string;
  /** Both id and display name are lifted: the name is denormalised onto the row. */
  onSelect: (personId: string, personName: string) => void;
  /** On a new document, preselect whoever is signed in. */
  autoSelectSelf?: boolean;
  /**
   * The stored person name for `selectedId`. Only needed when viewing another
   * member's record (read-only): that person isn't the signed-in user, so the
   * picker has no option for them and falls back to this label to stay filled.
   */
  selectedName?: string;
};

/**
 * Whose document is this? Each member records only their own data, so the only
 * option offered is the signed-in user — other family members' names are never
 * listed, and a record can't be attributed to someone else. When an existing
 * record belongs to someone else (a shared record opened read-only), their
 * stored name is shown as a non-selectable option so the field isn't blank.
 */
const PersonPicker = ({
  selectedId,
  onSelect,
  autoSelectSelf,
  selectedName,
}: IPersonPicker) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selfName = user ? displayNameOf(user) : "";
  // A record owned by another member: their id matches no offered option, so
  // add their stored name purely so the picker displays a value.
  const showsOther = !!selectedId && selectedId !== user?.id;

  useEffect(() => {
    if (!autoSelectSelf || selectedId || !user) {
      return;
    }
    onSelect(user.id, selfName);
  }, [user]);

  const handleChange = (id: string) => {
    if (id === user?.id) return onSelect(id, selfName);
    if (id === selectedId) return onSelect(id, selectedName ?? "");
    onSelect(id, "");
  };

  return (
    <>
      <Text style={styles.label}>Belongs to</Text>
      <View style={styles.pickerContainer}>
        <Picker
          style={styles.picker}
          dropdownIconColor={colors.text}
          mode="dropdown"
          selectedValue={selectedId}
          onValueChange={handleChange}
        >
          <Picker.Item
            label="Select a person"
            value=""
            color={colors.placeholder}
            style={styles.pickerItem}
          />
          {user && (
            <Picker.Item
              label={selfName}
              value={user.id}
              color={colors.text}
              style={styles.pickerItem}
            />
          )}
          {showsOther && (
            <Picker.Item
              label={selectedName || "—"}
              value={selectedId}
              color={colors.text}
              style={styles.pickerItem}
            />
          )}
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

export default PersonPicker;
