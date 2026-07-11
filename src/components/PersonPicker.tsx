import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getLoginUsers } from "../../database/firebaseQuery";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { displayNameOf, LoginUserModel } from "../models/LoginUserModel";
import { ThemeColors } from "../utils/Color";
import { showToast } from "../utils/Utils";

type IPersonPicker = {
  selectedId: string;
  /** Both id and display name are lifted: the name is denormalised onto the row. */
  onSelect: (personId: string, personName: string) => void;
  /** On a new document, preselect whoever is signed in. */
  autoSelectSelf?: boolean;
};

/**
 * Whose document is this? Options are the family's login accounts, so the
 * spelling of a name is decided once, at signup, and never drifts across rows.
 */
const PersonPicker = ({
  selectedId,
  onSelect,
  autoSelectSelf,
}: IPersonPicker) => {
  const [people, setPeople] = useState<LoginUserModel[]>([]);
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    getLoginUsers()
      .then((users) => {
        const sorted = [...users].sort((a, b) =>
          displayNameOf(a).localeCompare(displayNameOf(b))
        );
        setPeople(sorted);

        if (!autoSelectSelf || selectedId) {
          return;
        }
        const self = sorted.find((person) => person.id === user?.id);
        if (self) {
          onSelect(self.id, displayNameOf(self));
        }
      })
      .catch((error) => {
        console.log(error);
        showToast(
          "error",
          "Unable to load people",
          "The list of family members could not be fetched.",
          "bottom"
        );
      });
  }, [user]);

  const handleChange = (personId: string) => {
    const person = people.find((candidate) => candidate.id === personId);
    onSelect(personId, person ? displayNameOf(person) : "");
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
          {people.map((person) => (
            <Picker.Item
              key={person.id}
              label={displayNameOf(person)}
              value={person.id}
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

export default PersonPicker;
