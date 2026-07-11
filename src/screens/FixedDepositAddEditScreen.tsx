import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DatePicker from "../components/DatePicker";
import {
  NavigationProp,
  RouteProps,
  showConfirmationAlert,
  showToast,
} from "../utils/Utils";
import { FixedDepositModel } from "../models/FixedDepositModel";
import { ClientModel } from "../models/ClientModel";
import { ThemeColors } from "../utils/Color";
import { useTheme } from "../context/ThemeContext";
import Button from "../components/Button";
import {
  addFixedDeposit,
  deleteFixedDeposit,
  getClients,
  getFixedDeposit,
  updateFixedDeposit,
} from "../../database/firebaseQuery";
import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import { depositorNameForUser, isAdmin } from "../utils/permissions";

type Props = {
  route: RouteProps;
  navigation: NavigationProp;
};

const FixedDepositAddEditScreen = ({ route, navigation }: Props) => {
  const { fixedDepositData } = route.params || {};
  const pageMode = fixedDepositData ? "Edit" : "Add";
  const fixedDeposit: FixedDepositModel = fixedDepositData || null;

  const [clients, setClients] = useState<ClientModel[]>([]);
  const [depositorList, setDepositorList] = useState<string[]>([]);
  const [clientId, setClientId] = useState(fixedDeposit?.clientId ?? "");
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
  const [isLoading, setIsLoading] = useState(true);

  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const canChooseDepositor = isAdmin(user);

  useEffect(() => {
    // The picker options are data, not constants: banks come from `clients`
    // and depositor names from whoever already holds a deposit.
    Promise.all([getClients(), getFixedDeposit()])
      .then(([clientData, depositData]: any[]) => {
        const clientList = (clientData as ClientModel[]) ?? [];
        setClients(
          [...clientList].sort((a, b) => a.name.localeCompare(b.name))
        );

        const deposits = (depositData as FixedDepositModel[]) ?? [];
        const allDepositors = Array.from(
          new Set(deposits.map((deposit) => deposit.depositorName).filter(Boolean))
        );

        // Offer every known depositor to everyone, plus the user's own name
        // even if they have no deposits yet (otherwise the pre-selected value
        // below wouldn't match any option and the picker would look empty).
        const ownName = depositorNameForUser(user, deposits);
        const names = new Set(allDepositors);
        if (ownName) {
          names.add(ownName);
        }
        setDepositorList([...names].sort((a, b) => a.localeCompare(b)));

        // Non-admins default to their own name when creating a deposit, so a
        // new record is scoped to them and doesn't vanish from their own list.
        if (pageMode === "Add" && ownName && !canChooseDepositor) {
          setDepositorName(ownName);
        }
      })
      .catch((error) => {
        console.log(error);
        showToast(
          "error",
          "Unable to load options",
          "Banks and depositors could not be fetched.",
          "bottom"
        );
      })
      .finally(() => setIsLoading(false));
  }, [user]);

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
    if (!clientId) return "Choose a bank.";
    if (!depositorName) return "Choose a depositor.";
    if (!amount || Number(amount) <= 0) return "Enter a deposit amount.";
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
      clientId,
      depositorName,
      amount,
      interest: interestAmount,
      interestPercentage,
      depositedDate,
      maturityDate,
    };

    const save =
      pageMode == "Add"
        ? addFixedDeposit({ ...payload, loginUserId: user?.id ?? "" })
        : updateFixedDeposit(fixedDeposit.id, {
            ...payload,
            // Carry the existing record's flags through; setDoc replaces the
            // whole document, so omitting these would silently reset them.
            loginUserId: fixedDeposit.loginUserId,
            canShow: fixedDeposit.canShow,
            isCompleted: fixedDeposit.isCompleted,
          });

    save
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
      deleteFixedDeposit(fixedDeposit.id)
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
      <Loader loading={isLoading} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Deposit</Text>

        <Text style={styles.label}>Bank</Text>
        <View style={styles.pickerContainer}>
          <Picker
            style={styles.picker}
            dropdownIconColor={colors.text}
            mode="dialog"
            selectedValue={clientId}
            onValueChange={setClientId}
          >
            <Picker.Item
              label="Select a bank"
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

        <Text style={styles.label}>Depositor</Text>
        <View style={styles.pickerContainer}>
          <Picker
            style={styles.picker}
            dropdownIconColor={colors.text}
            mode="dropdown"
            selectedValue={depositorName}
            onValueChange={setDepositorName}
          >
            <Picker.Item
              label="Select a depositor"
              value=""
              color={colors.placeholder}
              style={styles.pickerItem}
            />
            {depositorList.map((depositor) => (
              <Picker.Item
                key={depositor}
                label={depositor}
                value={depositor}
                color={colors.text}
                style={styles.pickerItem}
              />
            ))}
          </Picker>
        </View>

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

      <Button
        title={pageMode == "Add" ? "Add deposit" : "Save changes"}
        onPress={handleUpdate}
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
