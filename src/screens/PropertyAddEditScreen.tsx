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
  addProperty,
  deleteProperty,
  updateProperty,
} from "../../database/query";
import Button from "../components/Button";
import DualUnitInput from "../components/DualUnitInput";
import Loader from "../components/Loader";
import PersonPicker from "../components/PersonPicker";
import SearchableSelect from "../components/SearchableSelect";
import ProgressBar from "../components/ProgressBar";
import ReadOnlyBanner from "../components/ReadOnlyBanner";
import ReadOnlyGuard from "../components/ReadOnlyGuard";
import VisibilityToggle from "../components/VisibilityToggle";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { commitDelete, commitSave, useAppDispatch } from "../redux/hooks";
import { canEdit, Visibility } from "../models/common";
import {
  CENTS_PER_ACRE_LABEL,
  PaymentMode,
  PROPERTY_TYPES,
  PropertyModel,
} from "../models/AssetModel";
import { CENTS_PER_ACRE, hasArea, paymentTotals } from "../utils/assets";
import { isValidAmount } from "../utils/amount";
import { ThemeColors } from "../utils/Color";
import {
  amountFormat,
  NavigationProp,
  RouteProps,
  showConfirmationAlert,
  showToast,
} from "../utils/Utils";

type Props = {
  route: RouteProps;
  navigation: NavigationProp;
};

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "full", label: "Paid in full" },
  { value: "installments", label: "Installments" },
  { value: "loan", label: "Loan" },
];

const PropertyAddEditScreen = ({ route, navigation }: Props) => {
  const { propertyData } = (route.params as any) || {};
  const property: PropertyModel | null = propertyData || null;
  const pageMode = property ? "Edit" : "Add";

  const [personId, setPersonId] = useState(property?.personId ?? "");
  const [personName, setPersonName] = useState(property?.personName ?? "");
  const [propertyType, setPropertyType] = useState(property?.propertyType ?? "");
  const [name, setName] = useState(property?.name ?? "");
  const [cents, setCents] = useState(property?.cents ?? "");
  const [description, setDescription] = useState(property?.description ?? "");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(
    property?.paymentMode ?? "full"
  );
  const [totalAmount, setTotalAmount] = useState(property?.totalAmount ?? "");
  const [lender, setLender] = useState(property?.lender ?? "");
  const [interestRate, setInterestRate] = useState(property?.interestRate ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    property?.visibility ?? "private"
  );
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Public records are viewable family-wide but editable only by their owner.
  const readOnly = pageMode === "Edit" && !canEdit(property!, user?.id);

  // Entries are owned by the payments screen; this form never edits them, it
  // only carries them through the save so setDoc doesn't wipe them.
  const entries = property?.entries ?? [];
  const showsArea = hasArea(propertyType);
  const totals = paymentTotals({ totalAmount, entries });

  const selectPerson = (id: string, personLabel: string) => {
    setPersonId(id);
    setPersonName(personLabel);
  };

  /** Returns an error message, or null when the form is good to submit. */
  const validationError = () => {
    if (!personId) return "Choose who this property belongs to.";
    if (!propertyType) return "Choose a property type.";
    if (!name.trim()) return "Give the property a name.";
    if (paymentMode !== "full" && !isValidAmount(totalAmount)) {
      return paymentMode === "loan"
        ? "Enter the loan amount."
        : "Enter the total amount.";
    }
    if (paymentMode === "loan" && !lender.trim()) return "Enter the lender.";
    return null;
  };

  const buildPayload = () => ({
    personId,
    personName,
    propertyType,
    name: name.trim(),
    // A car has no area. Clear it rather than keeping a stale figure from a
    // type the user switched away from.
    cents: showsArea ? cents.trim() : "",
    description: description.trim(),
    paymentMode,
    totalAmount: totalAmount.trim(),
    lender: paymentMode === "loan" ? lender.trim() : "",
    interestRate: paymentMode === "loan" ? interestRate.trim() : "",
    entries,
    visibility,
  });

  const handleSave = () => {
    const error = validationError();
    if (error) {
      showToast("error", "Incomplete form", error, "bottom");
      return;
    }

    setIsLoading(true);
    const payload = buildPayload();

    const save =
      pageMode === "Add"
        ? addProperty(payload)
        : updateProperty(property!.id, payload);

    dispatch(commitSave("properties", save))
      .then(() => navigation.goBack())
      .catch((saveError) => {
        showToast("error", "Unable to save", String(saveError), "bottom");
      })
      .finally(() => setIsLoading(false));
  };

  const handleDelete = () => {
    showConfirmationAlert(
      "Delete property",
      "This deletes the property and its payment history. Are you sure?"
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      setIsLoading(true);
      dispatch(commitDelete("properties", property!.id, deleteProperty))
        .then(() => navigation.goBack())
        .catch((deleteError) => {
          showToast("error", "Unable to delete", String(deleteError), "bottom");
        })
        .finally(() => setIsLoading(false));
    });
  };

  /**
   * Commits the form before handing off. The payments screen rewrites the whole
   * property document, so any unsaved edit sitting in this form would otherwise
   * be silently resurrected — or lost — on the next entry it writes.
   */
  const managePayments = () => {
    const error = validationError();
    if (error) {
      showToast("error", "Incomplete form", error, "bottom");
      return;
    }

    setIsLoading(true);
    const payload = buildPayload();
    dispatch(commitSave("properties", updateProperty(property!.id, payload)))
      .then(() => {
        navigation.navigate("PropertyPayments", {
          propertyData: { ...payload, id: property!.id },
        });
      })
      .catch((saveError) => {
        showToast("error", "Unable to save", String(saveError), "bottom");
      })
      .finally(() => setIsLoading(false));
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
        <Text style={styles.sectionTitle}>Property</Text>

        <PersonPicker
          selectedId={personId}
          selectedName={personName}
          onSelect={selectPerson}
          autoSelectSelf={pageMode === "Add"}
        />

        <SearchableSelect
          label="Type"
          placeholder="Select a property type"
          selectedId={propertyType}
          selectedName={propertyType}
          options={PROPERTY_TYPES.map((type) => ({ id: type, name: type }))}
          onSelect={(id) => setPropertyType(id)}
        />

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={[styles.input, styles.inputSpacing]}
          onChangeText={setName}
          value={name}
          placeholder="e.g. Chennai flat"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="words"
        />

        {showsArea && (
          <>
            <DualUnitInput
              label="Area"
              value={cents}
              onChange={setCents}
              canonicalUnit="cents"
              derivedUnit="acres"
              perDerivedUnit={CENTS_PER_ACRE}
            />
            <Text style={styles.hint}>{CENTS_PER_ACRE_LABEL}</Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payment</Text>

        <SearchableSelect
          label="How was it paid?"
          placeholder="Select a payment mode"
          selectedId={paymentMode}
          selectedName={
            PAYMENT_MODES.find((mode) => mode.value === paymentMode)?.label
          }
          options={PAYMENT_MODES.map((mode) => ({
            id: mode.value,
            name: mode.label,
          }))}
          onSelect={(id) => setPaymentMode(id as PaymentMode)}
        />

        <Text style={styles.label}>
          {paymentMode === "loan" ? "Loan amount" : "Total amount"}
        </Text>
        <View style={[styles.affixRow, styles.inputSpacing]}>
          <Text style={styles.affix}>₹</Text>
          <TextInput
            style={styles.affixInput}
            onChangeText={setTotalAmount}
            value={totalAmount}
            placeholder="0"
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
          />
        </View>

        {paymentMode === "loan" && (
          <>
            <Text style={styles.label}>Lender</Text>
            <TextInput
              style={[styles.input, styles.inputSpacing]}
              onChangeText={setLender}
              value={lender}
              placeholder="e.g. HDFC Bank"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Interest rate</Text>
            <View style={[styles.affixRow, styles.inputSpacing]}>
              <TextInput
                style={styles.affixInput}
                onChangeText={setInterestRate}
                value={interestRate}
                placeholder="0.0"
                placeholderTextColor={colors.placeholder}
                keyboardType="decimal-pad"
              />
              <Text style={styles.affix}>% p.a.</Text>
            </View>
          </>
        )}

        {paymentMode !== "full" && (
          <>
            {pageMode === "Add" ? (
              <Text style={styles.hint}>
                Save the property first, then add its{" "}
                {paymentMode === "loan" ? "payments" : "installments"}.
              </Text>
            ) : (
              <>
                <ProgressBar progress={totals.progress} />
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsPaid}>
                    ₹ {amountFormat(totals.paid)} paid
                  </Text>
                  <Text style={styles.totalsRemaining}>
                    ₹ {amountFormat(totals.remaining)} left
                  </Text>
                </View>

                <Pressable
                  onPress={managePayments}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.manageButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.manageText}>
                    {paymentMode === "loan"
                      ? "Manage payments"
                      : "Manage installments"}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.primary}
                  />
                </Pressable>
              </>
            )}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notes</Text>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          onChangeText={setDescription}
          value={description}
          placeholder="Survey number, registration details, anything worth noting…"
          placeholderTextColor={colors.placeholder}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      </ReadOnlyGuard>

      {!readOnly && (
        <Button
          title={pageMode === "Add" ? "Add property" : "Save changes"}
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
          <Text style={styles.deleteText}>Delete property</Text>
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
    totalsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
    },
    totalsPaid: {
      fontSize: 13,
      color: colors.positive,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    totalsRemaining: {
      fontSize: 13,
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
    },
    manageButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
      marginTop: 16,
    },
    manageText: {
      color: colors.primary,
      fontWeight: "600",
      fontSize: 14,
      marginRight: 6,
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

export default PropertyAddEditScreen;
