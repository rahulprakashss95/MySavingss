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
  addVehicle,
  deleteVehicle,
  updateVehicle,
} from "../../database/query";
import AttachmentField, { useAttachments } from "../components/AttachmentField";
import Button from "../components/Button";
import DatePicker from "../components/DatePicker";
import Loader from "../components/Loader";
import PersonPicker from "../components/PersonPicker";
import ReadOnlyBanner from "../components/ReadOnlyBanner";
import ReadOnlyGuard from "../components/ReadOnlyGuard";
import SearchableSelect from "../components/SearchableSelect";
import VisibilityToggle from "../components/VisibilityToggle";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { commitDelete, commitSave, useAppDispatch } from "../redux/hooks";
import { canEdit, Visibility } from "../models/common";
import { VEHICLE_TYPES, VehicleModel } from "../models/AssetModel";
import { ThemeColors } from "../utils/Color";
import { showConfirmationAlert, showToast } from "../utils/Utils";
import { useRouter } from "expo-router";

type Props = {
  /** The vehicle being edited, or null to create. Resolved by the route. */
  initial: VehicleModel | null;
};

const VehicleAddEditScreen = ({ initial }: Props) => {
  const router = useRouter();
  const vehicle = initial;
  const pageMode = vehicle ? "Edit" : "Add";

  const [personId, setPersonId] = useState(vehicle?.personId ?? "");
  const [personName, setPersonName] = useState(vehicle?.personName ?? "");
  const [vehicleType, setVehicleType] = useState(vehicle?.vehicleType ?? "");
  const [name, setName] = useState(vehicle?.name ?? "");
  const [number, setNumber] = useState(vehicle?.number ?? "");
  const [insurer, setInsurer] = useState(vehicle?.insurer ?? "");
  const [policyNumber, setPolicyNumber] = useState(vehicle?.policyNumber ?? "");
  const [insuranceExpiry, setInsuranceExpiry] = useState(
    vehicle?.insuranceExpiry ?? ""
  );
  const [description, setDescription] = useState(vehicle?.description ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    vehicle?.visibility ?? "private"
  );
  const [isLoading, setIsLoading] = useState(false);
  const attachments = useAttachments(vehicle?.attachments);

  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Public records are viewable family-wide but editable only by their owner.
  const readOnly = pageMode === "Edit" && !canEdit(vehicle!, user?.id);

  const selectPerson = (id: string, personLabel: string) => {
    setPersonId(id);
    setPersonName(personLabel);
  };

  /** Returns an error message, or null when the form is good to submit. */
  const validationError = () => {
    if (!personId) return "Choose who this vehicle belongs to.";
    if (!vehicleType) return "Choose a vehicle type.";
    if (!name.trim()) return "Enter the vehicle's name.";
    if (!number.trim()) return "Enter the registration number.";
    return null;
  };

  const handleSave = async () => {
    const error = validationError();
    if (error) {
      showToast("error", "Incomplete form", error, "bottom");
      return;
    }

    setIsLoading(true);
    try {
      // Files first: if an upload fails the record is left untouched, rather
      // than saved pointing at a scan that never made it to the bucket.
      const files = await attachments.commit();

      const payload = {
        personId,
        personName,
        vehicleType,
        name: name.trim(),
        number: number.trim(),
        insurer: insurer.trim(),
        policyNumber: policyNumber.trim(),
        insuranceExpiry: insuranceExpiry.trim(),
        description: description.trim(),
        attachments: files,
        visibility,
      };

      const save =
        pageMode === "Add"
          ? addVehicle(payload)
          : updateVehicle(vehicle!.id, payload);

      await dispatch(commitSave("vehicles", save));
      // Only once the row no longer references them: a save that threw above
      // leaves the old row intact, and its files must still be there.
      await attachments.cleanup(files);
      router.back();
    } catch (saveError) {
      showToast("error", "Unable to save", String(saveError), "bottom");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    showConfirmationAlert(
      "Delete vehicle",
      "Are you sure you want to delete this vehicle?"
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      setIsLoading(true);
      dispatch(commitDelete("vehicles", vehicle!.id, deleteVehicle))
        .then(() => router.back())
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

      <ReadOnlyBanner show={readOnly} />

      <ReadOnlyGuard active={readOnly}>
      <View style={styles.card}>
        <VisibilityToggle value={visibility} onChange={setVisibility} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Vehicle</Text>

        <PersonPicker
          selectedId={personId}
          selectedName={personName}
          onSelect={selectPerson}
          autoSelectSelf={pageMode === "Add"}
        />

        <SearchableSelect
          label="Type"
          placeholder="Select a vehicle type"
          selectedId={vehicleType}
          selectedName={vehicleType}
          options={VEHICLE_TYPES.map((type) => ({ id: type, name: type }))}
          onSelect={(id) => setVehicleType(id)}
        />

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={[styles.input, styles.inputSpacing]}
          onChangeText={setName}
          value={name}
          placeholder="e.g. Honda City"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Registration number</Text>
        <TextInput
          style={styles.input}
          onChangeText={setNumber}
          value={number}
          placeholder="e.g. TN 01 AB 1234"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Insurance</Text>

        <Text style={styles.label}>Insurer</Text>
        <TextInput
          style={[styles.input, styles.inputSpacing]}
          onChangeText={setInsurer}
          value={insurer}
          placeholder="e.g. ICICI Lombard"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Policy number</Text>
        <TextInput
          style={[styles.input, styles.inputSpacing]}
          onChangeText={setPolicyNumber}
          value={policyNumber}
          placeholder="Policy number"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <DatePicker
          label="Insurance expiry"
          dateValue={insuranceExpiry}
          onDateChange={setInsuranceExpiry}
        />
      </View>

      <View style={styles.card}>
        <AttachmentField
          drafts={attachments.drafts}
          onChange={attachments.setDrafts}
          readOnly={readOnly}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notes</Text>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          onChangeText={setDescription}
          value={description}
          placeholder="Model year, colour, where the RC is kept…"
          placeholderTextColor={colors.placeholder}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      </ReadOnlyGuard>

      {!readOnly && (
        <Button
          title={pageMode === "Add" ? "Add vehicle" : "Save changes"}
          onPress={handleSave}
          buttonStyle={styles.primaryButton}
        />
      )}

      {pageMode !== "Add" && !readOnly && (
        <Pressable
          onPress={handleDelete}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.deleteText}>Delete vehicle</Text>
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

export default VehicleAddEditScreen;
