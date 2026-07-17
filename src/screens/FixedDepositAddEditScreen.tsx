import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import DatePicker from "../components/DatePicker";
import {
  NavigationProp,
  RouteProps,
  showConfirmationAlert,
  showToast,
} from "../utils/Utils";
import { FixedDepositModel } from "../models/FixedDepositModel";
import { BankModel } from "../models/BankModel";
import SearchableSelect from "../components/SearchableSelect";
import BankForm from "../components/forms/BankForm";
import { isValidAmount } from "../utils/amount";
import { ThemeColors } from "../utils/Color";
import { useTheme } from "../context/ThemeContext";
import Button from "../components/Button";
import {
  addFixedDeposit,
  deleteFixedDeposit,
  updateFixedDeposit,
} from "../../database/query";
import Loader from "../components/Loader";
import ReadOnlyBanner from "../components/ReadOnlyBanner";
import ReadOnlyGuard from "../components/ReadOnlyGuard";
import VisibilityToggle from "../components/VisibilityToggle";
import { useAuth } from "../context/AuthContext";
import {
  commitDelete,
  commitSave,
  useAppDispatch,
  useCollectionState,
} from "../redux/hooks";
import { canEdit, Visibility } from "../models/common";
import { depositorNameForUser } from "../utils/permissions";

type Props = {
  route: RouteProps;
  navigation: NavigationProp;
};

const FixedDepositAddEditScreen = ({ route, navigation }: Props) => {
  const { fixedDepositData } = route.params || {};
  const pageMode = fixedDepositData ? "Edit" : "Add";
  const fixedDeposit: FixedDepositModel = fixedDepositData || null;

  const [bankId, setBankId] = useState(fixedDeposit?.bankId ?? "");
  const [bankName, setBankName] = useState(fixedDeposit?.name ?? "");
  const [depositorName, setDepositorName] = useState(
    fixedDeposit?.depositorName ?? ""
  );
  const [amount, setAmount] = useState(fixedDeposit?.amount ?? "");
  const [interestPercentage, setInterestPercentage] = useState(
    fixedDeposit?.interestPercentage ?? ""
  );
  const [interestAmount, setInterestAmount] = useState(
    fixedDeposit?.interest ?? ""
  );
  const [depositedDate, setDepositedDate] = useState(
    fixedDeposit?.depositedDate ?? ""
  );
  const [maturityDate, setMaturityDate] = useState(
    fixedDeposit?.maturityDate ?? ""
  );
  const [visibility, setVisibility] = useState<Visibility>(
    fixedDeposit?.visibility ?? "private"
  );
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Public deposits are viewable family-wide but editable only by their owner.
  const readOnly = pageMode === "Edit" && !canEdit(fixedDeposit, user?.id);

  // Options come from the cache: banks, and the depositor name from the user's
  // own existing deposits — no extra reads on open.
  const bankState = useCollectionState<BankModel>("banks");
  const depositState = useCollectionState<FixedDepositModel>("fixedDeposits");
  const optionsLoading = !bankState.hasLoaded || !depositState.hasLoaded;

  const banks = useMemo(
    () => [...bankState.items].sort((a, b) => a.name.localeCompare(b.name)),
    [bankState.items]
  );

  // Each user records their own deposits, so the only depositor offered is the
  // signed-in user — other people's names are never listed.
  const ownName = useMemo(
    () => depositorNameForUser(user, depositState.items),
    [user, depositState.items]
  );
  const depositorList = ownName ? [ownName] : [];

  // Pre-select the depositor on a new deposit so it's scoped to this user.
  useEffect(() => {
    if (pageMode === "Add" && ownName && !depositorName) {
      setDepositorName(ownName);
    }
  }, [ownName]);

  const calculateInterestAmount = () => {
    if (!amount || !interestPercentage) {
      showToast(
        "info",
        "Missing values",
        "Enter an amount and interest rate first.",
        "bottom"
      );
      return;
    }
    const calculatedInterest = Math.floor(
      ((Number(amount) / 12) * Number(interestPercentage)) / 100
    ).toString();
    setInterestAmount(calculatedInterest);
  };

  const navigateBack = () => {
    navigation.goBack();
  };

  /** Returns an error message, or null when the form is good to submit. */
  const validationError = () => {
    if (!bankId) return "Choose a bank.";
    if (!depositorName) return "Choose a depositor.";
    if (!isValidAmount(amount)) return "Enter a deposit amount.";
    if (!interestPercentage) return "Enter an interest rate.";
    return null;
  };

  const handleUpdate = () => {
    const error = validationError();
    if (error) {
      showToast("error", "Incomplete form", error, "bottom");
      return;
    }

    setIsLoading(true);
    const payload = {
      bankId,
      depositorName,
      amount,
      interest: interestAmount,
      interestPercentage,
      depositedDate,
      maturityDate,
      visibility,
    };

    const save =
      pageMode == "Add"
        ? addFixedDeposit(payload)
        : updateFixedDeposit(fixedDeposit.id, payload);

    dispatch(commitSave("fixedDeposits", save))
      .then(() => {
        navigateBack();
      })
      .catch((error) => {
        showToast("error", "Unable to save", String(error), "bottom");
      })
      .finally(() => setIsLoading(false));
  };

  const handleDelete = () => {
    showConfirmationAlert(
      "Delete deposit",
      "Are you sure you want to delete this deposit?"
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      setIsLoading(true);
      dispatch(commitDelete("fixedDeposits", fixedDeposit.id, deleteFixedDeposit))
        .then(() => {
          navigateBack();
        })
        .catch((error) => {
          showToast("error", "Unable to Delete", String(error), "bottom");
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
      <Loader loading={isLoading || optionsLoading} />

      <ReadOnlyBanner show={readOnly} />

      <ReadOnlyGuard active={readOnly}>
      <View style={styles.card}>
        <VisibilityToggle value={visibility} onChange={setVisibility} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Deposit</Text>

        <SearchableSelect
          label="Bank"
          placeholder="Select a bank"
          selectedId={bankId}
          selectedName={bankName}
          options={banks}
          onSelect={(id, name) => {
            setBankId(id);
            setBankName(name);
          }}
          addLabel="Add bank"
          renderAddForm={({ onCreated }) => (
            <BankForm
              onSaved={(saved) => onCreated({ id: saved.id, name: saved.name })}
            />
          )}
        />

        <SearchableSelect
          label="Depositor"
          placeholder="Select a depositor"
          selectedId={depositorName}
          selectedName={depositorName}
          options={depositorList.map((depositor) => ({
            id: depositor,
            name: depositor,
          }))}
          onSelect={(id) => setDepositorName(id)}
        />

        <Text style={styles.label}>Amount</Text>
        <View style={styles.affixRow}>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Interest</Text>

        <Text style={styles.label}>Rate</Text>
        <View style={styles.affixRow}>
          <TextInput
            style={styles.affixInput}
            onChangeText={setInterestPercentage}
            value={interestPercentage}
            placeholder="0.0"
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
          />
          <Text style={styles.affix}>% p.a.</Text>
        </View>

        <Text style={styles.label}>Interest amount</Text>
        <View style={styles.calculateRow}>
          <View style={[styles.affixRow, styles.calculateInput]}>
            <Text style={styles.affix}>₹</Text>
            <TextInput
              style={styles.affixInput}
              onChangeText={setInterestAmount}
              value={interestAmount}
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
            />
          </View>
          <Pressable
            onPress={calculateInterestAmount}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.calculateButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.calculateText}>Calculate</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dates</Text>
        <DatePicker
          label="Deposited date"
          dateValue={depositedDate}
          onDateChange={(date: any) => setDepositedDate(date || depositedDate)}
        />
        <DatePicker
          label="Maturity date"
          dateValue={maturityDate}
          onDateChange={(date: any) => setMaturityDate(date || maturityDate)}
        />
      </View>

      </ReadOnlyGuard>

      {!readOnly && (
        <Button
          title={pageMode == "Add" ? "Add deposit" : "Save changes"}
          onPress={handleUpdate}
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
          <Text style={styles.deleteText}>Delete deposit</Text>
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
    affixRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 12,
      marginBottom: 18,
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
    calculateRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    calculateInput: {
      flex: 1,
      marginRight: 10,
    },
    calculateButton: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 15,
    },
    calculateText: {
      color: colors.primary,
      fontWeight: "600",
      fontSize: 14,
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

export default FixedDepositAddEditScreen;
