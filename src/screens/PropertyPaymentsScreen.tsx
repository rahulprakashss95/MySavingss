import { Ionicons } from "@expo/vector-icons";
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
import { updateProperty } from "../../database/query";
import { commitSave, useAppDispatch } from "../query/hooks";
import Button from "../components/Button";
import DatePicker from "../components/DatePicker";
import Loader from "../components/Loader";
import ProgressBar from "../components/ProgressBar";
import { useTheme } from "../context/ThemeContext";
import { PaymentEntry, PropertyModel } from "../models/AssetModel";
import { newEntryId, paymentTotals, sortEntries } from "../utils/assets";
import { isValidAmount } from "../utils/amount";
import { ThemeColors } from "../utils/Color";
import { DATE_FORMAT } from "../utils/deposits";
import {
  amountFormat,
  showConfirmationAlert,
  showToast,
} from "../utils/Utils";

type Props = {
  /** The property whose payments are being managed. Resolved by the route. */
  property: PropertyModel;
};

/**
 * Payment entries live inside the property document, so every change here
 * rewrites the whole property. State is held locally and pushed on each edit â€”
 * the list is small, and it keeps the screen responsive.
 */
const PropertyPaymentsScreen = ({ property }: Props) => {
  const isLoan = property.paymentMode === "loan";

  const [entries, setEntries] = useState<PaymentEntry[]>(property.entries ?? []);
  const [isLoading, setIsLoading] = useState(false);

  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [date, setDate] = useState(
    // A loan payment is recorded as it happens, so today is the useful default.
    // An installment is scheduled, so the user must pick its due date.
    isLoan ? moment().format(DATE_FORMAT) : ""
  );

  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const totals = paymentTotals({ totalAmount: property.totalAmount, entries });
  const sorted = useMemo(() => sortEntries(entries), [entries]);

  /** Writes the new set, rolling back the local state if the write fails. */
  const persist = (next: PaymentEntry[], failureTitle: string) => {
    const previous = entries;
    setEntries(next);
    setIsLoading(true);

    const { id, ...input } = { ...property, entries: next };
    dispatch(commitSave("properties", updateProperty(property.id, input)))
      .catch((error) => {
        setEntries(previous);
        showToast("error", failureTitle, String(error), "bottom");
      })
      .finally(() => setIsLoading(false));
  };

  const handleAdd = () => {
    if (!isValidAmount(amount)) {
      showToast("error", "Missing amount", "Enter an amount.", "bottom");
      return;
    }
    if (!date) {
      showToast(
        "error",
        "Missing date",
        isLoan ? "Pick the payment date." : "Pick the due date.",
        "bottom"
      );
      return;
    }

    const entry: PaymentEntry = {
      id: newEntryId(),
      label: label.trim(),
      date,
      amount: amount.trim(),
      // A loan entry records money already handed over; an installment is a
      // plan you tick off later.
      paid: isLoan,
    };

    persist([...entries, entry], "Unable to add");
    setAmount("");
    setLabel("");
    setDate(isLoan ? moment().format(DATE_FORMAT) : "");
  };

  const togglePaid = (entry: PaymentEntry) => {
    persist(
      entries.map((candidate) =>
        candidate.id === entry.id
          ? { ...candidate, paid: !candidate.paid }
          : candidate
      ),
      "Unable to update"
    );
  };

  const handleDelete = (entry: PaymentEntry) => {
    showConfirmationAlert(
      isLoan ? "Delete payment" : "Delete installment",
      "Are you sure? This cannot be undone."
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      persist(
        entries.filter((candidate) => candidate.id !== entry.id),
        "Unable to delete"
      );
    });
  };

  const renderEntry = (entry: PaymentEntry) => (
    <View key={entry.id} style={styles.entry}>
      <Pressable
        onPress={() => togglePaid(entry)}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: entry.paid }}
        accessibilityLabel={`${entry.label || entry.date}, ${
          entry.paid ? "paid" : "unpaid"
        }`}
        style={({ pressed }) => [
          styles.checkbox,
          entry.paid && styles.checkboxChecked,
          pressed && styles.pressed,
        ]}
      >
        {entry.paid && (
          <Ionicons name="checkmark" size={15} color={colors.onPrimary} />
        )}
      </Pressable>

      <View style={styles.entryText}>
        <Text style={[styles.entryAmount, entry.paid && styles.entryPaid]}>
          â‚¹ {amountFormat(entry.amount)}
        </Text>
        <Text style={styles.entryMeta}>
          {entry.label ? `${entry.label} Â· ` : ""}
          {entry.date || "No date"}
        </Text>
      </View>

      <Pressable
        onPress={() => handleDelete(entry)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Delete entry"
        style={({ pressed }) => [styles.trash, pressed && styles.pressed]}
      >
        <Ionicons name="trash-outline" size={18} color={colors.negative} />
      </Pressable>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Loader loading={isLoading} />

      <View style={styles.card}>
        <Text style={styles.propertyName}>{property.name}</Text>
        {isLoan && !!property.lender && (
          <Text style={styles.lender}>
            {property.lender}
            {property.interestRate ? ` Â· ${property.interestRate}% p.a.` : ""}
          </Text>
        )}

        <Text style={styles.remaining}>â‚¹ {amountFormat(totals.remaining)}</Text>
        <Text style={styles.remainingLabel}>
          remaining of â‚¹ {amountFormat(totals.total)}
        </Text>

        <View style={styles.progressWrap}>
          <ProgressBar progress={totals.progress} />
        </View>

        <View style={styles.totalsRow}>
          <Text style={styles.totalsPaid}>
            â‚¹ {amountFormat(totals.paid)} paid
          </Text>
          {!isLoan && totals.entryCount > 0 && (
            <Text style={styles.totalsCount}>
              {totals.paidCount} of {totals.entryCount} installments
            </Text>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {isLoan ? "Payments made" : "Installments"}
        </Text>

        {sorted.length === 0 ? (
          <Text style={styles.emptyText}>
            {isLoan
              ? "No payments recorded yet. Add one below as you pay."
              : "No installments yet. Add each one below, then tick it off as you pay."}
          </Text>
        ) : (
          sorted.map(renderEntry)
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {isLoan ? "Record a payment" : "Add an installment"}
        </Text>

        <Text style={styles.label}>Amount</Text>
        <View style={[styles.affixRow, styles.inputSpacing]}>
          <Text style={styles.affix}>â‚¹</Text>
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
          label={isLoan ? "Payment date" : "Due date"}
          dateValue={date}
          onDateChange={(next: any) => setDate(next || "")}
        />

        <Text style={styles.label}>Label (optional)</Text>
        <TextInput
          style={[styles.input, styles.inputSpacing]}
          onChangeText={setLabel}
          value={label}
          placeholder={isLoan ? "e.g. EMI 4" : "e.g. Registration"}
          placeholderTextColor={colors.placeholder}
        />

        <Button
          title={isLoan ? "Record payment" : "Add installment"}
          onPress={handleAdd}
          buttonStyle={styles.primaryButton}
        />
      </View>
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
    propertyName: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    lender: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    remaining: {
      fontSize: 32,
      fontWeight: "700",
      color: colors.text,
      marginTop: 16,
      fontVariant: ["tabular-nums"],
    },
    remainingLabel: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    progressWrap: {
      marginTop: 16,
    },
    totalsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 10,
    },
    totalsPaid: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.positive,
      fontVariant: ["tabular-nums"],
    },
    totalsCount: {
      fontSize: 13,
      color: colors.textMuted,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
    },
    entry: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    checkboxChecked: {
      backgroundColor: colors.positive,
      borderColor: colors.positive,
    },
    entryText: {
      flex: 1,
    },
    entryAmount: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    entryPaid: {
      color: colors.textMuted,
      textDecorationLine: "line-through",
    },
    entryMeta: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    trash: {
      padding: 6,
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
    pressed: {
      opacity: 0.6,
    },
  });

export default PropertyPaymentsScreen;
