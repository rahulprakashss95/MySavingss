import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import DatePicker from "../components/DatePicker";
import { showConfirmationAlert, showToast } from "../utils/Utils";
import {
  AccountModel,
  ACCOUNT_TYPES,
  AccountType,
  accountTypeLabel,
  INTEREST_FREQUENCIES,
  InterestFrequency,
  isMaturingAccount,
  normalizeAccountType,
} from "../models/AccountModel";
import { BankModel } from "../models/BankModel";
import { rdMonthCount } from "../utils/deposits";
import SearchableSelect from "../components/SearchableSelect";
import BankForm from "../components/forms/BankForm";
import { isValidAmount } from "../utils/amount";
import { ThemeColors, tint } from "../utils/Color";
import { useTheme } from "../context/ThemeContext";
import Button from "../components/Button";
import { addAccount, deleteAccount, updateAccount } from "../../database/query";
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
} from "../query/hooks";
import { canEdit, Visibility } from "../models/common";

type Props = {
  /** Resolved by the [id] route from the cache; null = create. */
  initial: AccountModel | null;
  /** Type to preselect on a new record (from the list tab the + was tapped on). */
  presetType?: string;
};

const AccountAddEditScreen = ({ initial, presetType }: Props) => {
  const router = useRouter();
  const pageMode = initial ? "Edit" : "Add";
  const account = initial as AccountModel;

  // Normalise on load so a legacy "Savings Account" / "Financier / Non-FD" row
  // lands on the "Account Balance" chip; a new record honours the tab preset.
  const initialType = normalizeAccountType(
    account?.accountType ?? presetType ?? "Account Balance"
  );
  const [accountType, setAccountType] = useState<string>(initialType);
  const [name, setName] = useState(account?.name ?? "");
  const [bankId, setBankId] = useState(account?.bankId ?? "");
  const [bankName, setBankName] = useState("");
  // Kept read-only: legacy rows may carry free-text institution; we preserve it
  // on save but no longer offer an input, since institutions come from the picker.
  const [institution] = useState(account?.institution ?? "");
  const [balance, setBalance] = useState(account?.balance ?? "");
  const [balanceAsOf, setBalanceAsOf] = useState(account?.balanceAsOf ?? "");
  const [principal, setPrincipal] = useState(account?.principal ?? "");
  const [interestPercentage, setInterestPercentage] = useState(
    account?.interestPercentage ?? ""
  );
  const [interestAmount, setInterestAmount] = useState(account?.interest ?? "");
  const [interestFrequency, setInterestFrequency] = useState<string>(
    account?.interestFrequency || "Monthly"
  );
  const [maturityAmount, setMaturityAmount] = useState(
    account?.maturityAmount ?? ""
  );
  const [depositedDate, setDepositedDate] = useState(account?.depositedDate ?? "");
  const [maturityDate, setMaturityDate] = useState(account?.maturityDate ?? "");
  // Recurring Deposit fields.
  const [startDate, setStartDate] = useState(account?.startDate ?? "");
  const [months, setMonths] = useState(account?.months ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    account?.visibility ?? "private"
  );
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isDeposit = isMaturingAccount(accountType);
  const isFD = accountType === "Fixed Deposit";
  const isRD = accountType === "Recurring Deposit";
  const isCash = accountType === "Cash";
  // FD paid at maturity carries no periodic interest — it has a maturity amount.
  const isOnMaturity = isFD && interestFrequency === "On Maturity";
  const periodWord = interestFrequency === "Quarterly" ? "quarter" : "month";
  const periodicInterestLabel = isFD
    ? `Interest per ${periodWord}`
    : "Interest amount";

  // Public accounts are viewable family-wide but editable only by their owner.
  const readOnly = pageMode === "Edit" && !canEdit(account, user?.id);

  const bankState = useCollectionState<BankModel>("banks");
  const banks = useMemo(
    () => [...bankState.items].sort((a, b) => a.name.localeCompare(b.name)),
    [bankState.items]
  );

  // Accounts store only `bankId`, so on edit the picker's display name is
  // resolved from the banks cache once it has loaded.
  useEffect(() => {
    if (bankId && !bankName) {
      const bank = bankState.items.find((b) => b.id === bankId);
      if (bank) setBankName(bank.name);
    }
  }, [bankId, bankName, bankState.items]);

  // Periods per year for the payout frequency; "On Maturity" pays nothing along
  // the way. RD (no frequency field) is treated as a monthly payout.
  const periodsPerYear = interestFrequency === "Quarterly" ? 4 : 12;

  const calculateInterestAmount = () => {
    if (!principal || !interestPercentage) {
      showToast(
        "info",
        "Missing values",
        "Enter a principal and interest rate first.",
        "bottom"
      );
      return;
    }
    const yearly = (Number(principal) * Number(interestPercentage)) / 100;
    const calculated = Math.floor(yearly / periodsPerYear).toString();
    setInterestAmount(calculated);
  };

  const navigateBack = () => router.back();

  /** Returns an error message, or null when the form is good to submit. */
  const validationError = () => {
    // Cash is identified by its name; everything else by its institution.
    if (isCash) {
      if (!name.trim()) return "Give this cash entry a name.";
    } else if (!bankId) {
      return "Select an institution.";
    }
    if (isRD) {
      if (!isValidAmount(principal)) return "Enter the monthly instalment.";
      if (!startDate) return "Pick the start date.";
      if (Number(months) <= 0) return "Enter the number of months.";
    } else if (isDeposit) {
      if (!isValidAmount(principal)) return "Enter the deposit amount.";
      if (!interestPercentage) return "Enter an interest rate.";
      if (isOnMaturity && !isValidAmount(maturityAmount)) {
        return "Enter the maturity amount.";
      }
    } else if (!isValidAmount(balance)) {
      return "Enter a balance.";
    }
    return null;
  };

  const handleUpdate = () => {
    const error = validationError();
    if (error) {
      showToast("error", "Incomplete form", error, "bottom");
      return;
    }

    setIsLoading(true);

    // RD: keep the existing paid flags, resized to the (possibly changed)
    // tenure, and set the balance to what's been paid so far at the current
    // monthly amount. The schedule is then marked off from the list.
    const rdCount = rdMonthCount({ months } as AccountModel);
    const existingPayments = account?.payments ?? [];
    const rdPayments = Array.from(
      { length: rdCount },
      (_, i) => !!existingPayments[i]
    );
    const rdBalance = rdPayments.filter(Boolean).length * (Number(principal) || 0);

    // The balance net worth counts: RD = paid so far, FD = principal, others =
    // the entered balance.
    let savedBalance = balance;
    if (isRD) savedBalance = String(rdBalance);
    else if (isDeposit) savedBalance = principal;

    const payload = {
      accountType,
      name: name.trim(),
      bankId: isCash ? "" : bankId,
      // Free-text institution is no longer entered here; preserved as-is for
      // legacy rows so their display label isn't wiped on save.
      institution: isCash ? "" : institution.trim(),
      balance: savedBalance,
      balanceAsOf: isDeposit ? "" : balanceAsOf,
      // Deposit-only; left as-is (usually blank) for other types.
      principal: isDeposit ? principal : "",
      interest: isFD && !isOnMaturity ? interestAmount : "",
      interestPercentage: isFD ? interestPercentage : "",
      interestFrequency: isFD ? interestFrequency : "",
      maturityAmount: isOnMaturity ? maturityAmount : "",
      depositedDate: isFD ? depositedDate : "",
      maturityDate: isFD ? maturityDate : "",
      // Recurring-deposit-only.
      startDate: isRD ? startDate : "",
      months: isRD ? months : "",
      payments: isRD ? rdPayments : [],
      visibility,
    };

    const save =
      pageMode === "Add"
        ? addAccount(payload)
        : updateAccount(account.id, payload);

    dispatch(commitSave("accounts", save))
      .then(() => navigateBack())
      .catch((err) => showToast("error", "Unable to save", String(err), "bottom"))
      .finally(() => setIsLoading(false));
  };

  const handleDelete = () => {
    showConfirmationAlert(
      "Delete holding",
      "Are you sure you want to delete this holding?"
    ).then((confirmed) => {
      if (!confirmed) return;
      setIsLoading(true);
      dispatch(commitDelete("accounts", account.id, deleteAccount))
        .then(() => navigateBack())
        .catch((err) =>
          showToast("error", "Unable to delete", String(err), "bottom")
        )
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
      <Loader loading={isLoading || !bankState.hasLoaded} />

      <ReadOnlyBanner show={readOnly} />

      <ReadOnlyGuard active={readOnly}>
        <View style={styles.card}>
          <VisibilityToggle value={visibility} onChange={setVisibility} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Holding</Text>

          <Text style={styles.label}>Type</Text>
          <View style={styles.chipRow}>
            {ACCOUNT_TYPES.map((type: AccountType) => {
              const active = type === accountType;
              return (
                <Pressable
                  key={type}
                  onPress={() => setAccountType(type)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {accountTypeLabel(type)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isCash && (
            <>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                onChangeText={setName}
                value={name}
                placeholder="e.g. Home cash"
                placeholderTextColor={colors.placeholder}
              />
            </>
          )}

          {!isCash && (
            <SearchableSelect
              label="Institution"
              placeholder="Select a bank or financier"
              selectedId={bankId}
              selectedName={bankName}
              options={banks}
              onSelect={(id, selectedName) => {
                setBankId(id);
                setBankName(selectedName);
              }}
              addLabel="Add institution"
              renderAddForm={({ onCreated }) => (
                <BankForm
                  onSaved={(saved) =>
                    onCreated({ id: saved.id, name: saved.name })
                  }
                />
              )}
            />
          )}
        </View>

        {!isDeposit && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Balance</Text>
            <Text style={styles.label}>Current balance</Text>
            <View style={styles.affixRow}>
              <Text style={styles.affix}>₹</Text>
              <TextInput
                style={styles.affixInput}
                onChangeText={setBalance}
                value={balance}
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
              />
            </View>
            <DatePicker
              label="Balance as of"
              dateValue={balanceAsOf}
              onDateChange={(date: string) => setBalanceAsOf(date || balanceAsOf)}
            />
          </View>
        )}

        {isFD && (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Deposit</Text>

              <Text style={styles.label}>Principal</Text>
              <View style={styles.affixRow}>
                <Text style={styles.affix}>₹</Text>
                <TextInput
                  style={styles.affixInput}
                  onChangeText={setPrincipal}
                  value={principal}
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                />
              </View>

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

              {isFD && (
                <>
                  <Text style={styles.label}>Interest payout</Text>
                  <View style={styles.chipRow}>
                    {INTEREST_FREQUENCIES.map((freq: InterestFrequency) => {
                      const active = freq === interestFrequency;
                      return (
                        <Pressable
                          key={freq}
                          onPress={() => setInterestFrequency(freq)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              active && styles.chipTextActive,
                            ]}
                          >
                            {freq}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              {isOnMaturity ? (
                <>
                  <Text style={styles.label}>Maturity amount</Text>
                  <View style={styles.affixRow}>
                    <Text style={styles.affix}>₹</Text>
                    <TextInput
                      style={styles.affixInput}
                      onChangeText={setMaturityAmount}
                      value={maturityAmount}
                      placeholder="0"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={styles.hint}>
                    Interest is paid in full at maturity, so no periodic payout is
                    recorded.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.label}>{periodicInterestLabel}</Text>
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
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Dates</Text>
              <DatePicker
                label="Deposited date"
                dateValue={depositedDate}
                onDateChange={(date: string) =>
                  setDepositedDate(date || depositedDate)
                }
              />
              <DatePicker
                label="Maturity date"
                dateValue={maturityDate}
                onDateChange={(date: string) =>
                  setMaturityDate(date || maturityDate)
                }
              />
            </View>
          </>
        )}

        {isRD && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Recurring deposit</Text>

            <Text style={styles.label}>Amount per month</Text>
            <View style={styles.affixRow}>
              <Text style={styles.affix}>₹</Text>
              <TextInput
                style={styles.affixInput}
                onChangeText={setPrincipal}
                value={principal}
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.label}>Number of months</Text>
            <View style={styles.affixRow}>
              <TextInput
                style={styles.affixInput}
                onChangeText={setMonths}
                value={months}
                placeholder="e.g. 12"
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
              />
              <Text style={styles.affix}>months</Text>
            </View>

            <DatePicker
              label="Start date"
              dateValue={startDate}
              onDateChange={(date: string) => setStartDate(date || startDate)}
            />
            <Text style={styles.hint}>
              After saving, mark each month paid from the list.
            </Text>
          </View>
        )}
      </ReadOnlyGuard>

      {!readOnly && (
        <Button
          title={pageMode === "Add" ? "Add holding" : "Save changes"}
          onPress={handleUpdate}
          buttonStyle={styles.primaryButton}
        />
      )}

      {pageMode !== "Add" && !readOnly && (
        <Pressable
          onPress={handleDelete}
          accessibilityRole="button"
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
        >
          <Text style={styles.deleteText}>Delete holding</Text>
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
      paddingVertical: 14,
      paddingHorizontal: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 18,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 18,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: tint(colors.primary),
    },
    chipText: {
      fontSize: 13,
      color: colors.text,
    },
    chipTextActive: {
      color: colors.primary,
      fontWeight: "600",
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
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: -8,
      marginBottom: 4,
      lineHeight: 17,
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

export default AccountAddEditScreen;
