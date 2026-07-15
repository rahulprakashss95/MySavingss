import { Picker } from "@react-native-picker/picker";
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
  addOrnament,
  deleteOrnament,
  updateOrnament,
} from "../../database/firebaseQuery";
import Button from "../components/Button";
import DualUnitInput from "../components/DualUnitInput";
import Loader from "../components/Loader";
import PersonPicker from "../components/PersonPicker";
import VisibilityToggle from "../components/VisibilityToggle";
import { useTheme } from "../context/ThemeContext";
import { Visibility } from "../models/common";
import {
  DEFAULT_GOLD_KARAT,
  GOLD_KARATS,
  GRAMS_PER_PAWN_LABEL,
  ORNAMENT_TYPES,
  OrnamentModel,
} from "../models/AssetModel";
import { GRAMS_PER_PAWN } from "../utils/assets";
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

const OrnamentAddEditScreen = ({ route, navigation }: Props) => {
  const { ornamentData } = (route.params as any) || {};
  const ornament: OrnamentModel | null = ornamentData || null;
  const pageMode = ornament ? "Edit" : "Add";

  const [personId, setPersonId] = useState(ornament?.personId ?? "");
  const [personName, setPersonName] = useState(ornament?.personName ?? "");
  const [ornamentType, setOrnamentType] = useState(ornament?.ornamentType ?? "");
  const [karat, setKarat] = useState(ornament?.karat ?? DEFAULT_GOLD_KARAT);
  const [name, setName] = useState(ornament?.name ?? "");
  const [count, setCount] = useState(ornament?.count ?? "1");
  const [grams, setGrams] = useState(ornament?.grams ?? "");
  const [description, setDescription] = useState(ornament?.description ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    ornament?.visibility ?? "private"
  );
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Only gold is karated. Silver and stones have no purity to record.
  const isGold = ornamentType === "Gold";

  const selectPerson = (id: string, personLabel: string) => {
    setPersonId(id);
    setPersonName(personLabel);
  };

  /** Returns an error message, or null when the form is good to submit. */
  const validationError = () => {
    if (!personId) return "Choose who this ornament belongs to.";
    if (!ornamentType) return "Choose a metal.";
    if (!name.trim()) return "Enter the ornament's name.";
    if (!grams.trim() || Number(grams) <= 0) return "Enter the weight.";
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
      personId,
      personName,
      ornamentType,
      // Don't leave a karat on a silver chain if the type was switched.
      karat: isGold ? karat : "",
      name: name.trim(),
      count: count.trim() || "1",
      grams: grams.trim(),
      description: description.trim(),
      visibility,
    };

    const save =
      pageMode === "Add"
        ? addOrnament(payload)
        : updateOrnament(ornament!.id, payload);

    save
      .then(() => navigation.goBack())
      .catch((saveError) => {
        showToast("error", "Unable to save", String(saveError), "bottom");
      })
      .finally(() => setIsLoading(false));
  };

  const handleDelete = () => {
    showConfirmationAlert(
      "Delete ornament",
      "Are you sure you want to delete this ornament?"
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      setIsLoading(true);
      deleteOrnament(ornament!.id)
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
        <Text style={styles.sectionTitle}>Ornament</Text>

        <PersonPicker
          selectedId={personId}
          onSelect={selectPerson}
          autoSelectSelf={pageMode === "Add"}
        />

        <Text style={styles.label}>Metal</Text>
        <View style={styles.pickerContainer}>
          <Picker
            style={styles.picker}
            dropdownIconColor={colors.text}
            mode="dialog"
            selectedValue={ornamentType}
            onValueChange={setOrnamentType}
          >
            <Picker.Item
              label="Select a metal"
              value=""
              color={colors.placeholder}
              style={styles.pickerItem}
            />
            {ORNAMENT_TYPES.map((type) => (
              <Picker.Item
                key={type}
                label={type}
                value={type}
                color={colors.text}
                style={styles.pickerItem}
              />
            ))}
          </Picker>
        </View>

        {isGold && (
          <>
            <Text style={styles.label}>Purity</Text>
            <View style={styles.pickerContainer}>
              <Picker
                style={styles.picker}
                dropdownIconColor={colors.text}
                mode="dialog"
                selectedValue={karat}
                onValueChange={setKarat}
              >
                {GOLD_KARATS.map((option) => (
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
          </>
        )}

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={[styles.input, styles.inputSpacing]}
          onChangeText={setName}
          value={name}
          placeholder="e.g. Necklace"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Number of pieces</Text>
        <TextInput
          style={[styles.input, styles.inputSpacing]}
          onChangeText={setCount}
          value={count}
          placeholder="1"
          placeholderTextColor={colors.placeholder}
          keyboardType="number-pad"
        />

        <DualUnitInput
          label="Weight"
          value={grams}
          onChange={setGrams}
          canonicalUnit="grams"
          derivedUnit="pawn"
          perDerivedUnit={GRAMS_PER_PAWN}
        />
        <Text style={styles.hint}>{GRAMS_PER_PAWN_LABEL}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notes</Text>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          onChangeText={setDescription}
          value={description}
          placeholder="Purity, where it's kept, who gifted it…"
          placeholderTextColor={colors.placeholder}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <Button
        title={pageMode === "Add" ? "Add ornament" : "Save changes"}
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
          <Text style={styles.deleteText}>Delete ornament</Text>
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
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: -8,
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

export default OrnamentAddEditScreen;
