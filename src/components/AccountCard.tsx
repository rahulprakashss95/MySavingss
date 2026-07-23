import { Pressable, Text, View, StyleSheet } from "react-native";
import { useMemo, useState } from "react";
import moment from "moment";
import { Ionicons } from "@expo/vector-icons";
import { amountFormat } from "../utils/Utils";
import {
  AccountModel,
  accountTypeLabel,
  isMaturingAccount,
} from "../models/AccountModel";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors, tint } from "../utils/Color";
import {
  DATE_FORMAT,
  parseMaturity,
  rdMonthCount,
  rdMonthly,
  rdPaidCount,
  rdSchedule,
} from "../utils/deposits";

type Props = {
  account: AccountModel;
  /** Bank/institution label, resolved by the list via `accountInstitution`. */
  institution: string;
  /** Owning member's name, resolved by the list from `account.ownerId`. */
  ownerName: string;
  onClickCard: (data: AccountModel) => void;
  /** Whether the viewer may mark RD instalments paid (owner only). */
  editable?: boolean;
  /** Persists a change to an RD instalment's paid flag. */
  onToggleInstalment?: (
    account: AccountModel,
    index: number,
    paid: boolean
  ) => void;
};

type Status = { label: string; tone: "matured" | "active" | "none" };

const maturityStatus = (maturityDate: string): Status => {
  const maturity = parseMaturity(maturityDate);
  if (!maturity) {
    return { label: "No maturity date", tone: "none" };
  }
  if (maturity.isBefore(moment(), "day")) {
    return { label: "Matured", tone: "matured" };
  }
  return { label: `Matures ${maturity.fromNow()}`, tone: "active" };
};

const AccountCard = ({
  account,
  institution,
  ownerName,
  onClickCard,
  editable = false,
  onToggleInstalment,
}: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  const isFD = account.accountType === "Fixed Deposit";
  const isRD = account.accountType === "Recurring Deposit";
  const isDeposit = isMaturingAccount(account.accountType);
  const isCash = account.accountType === "Cash";

  const payoutWord =
    account.interestFrequency === "Quarterly" ? "quarter" : "month";

  // RD figures.
  const schedule = useMemo(() => (isRD ? rdSchedule(account) : []), [
    isRD,
    account,
  ]);
  const monthCount = rdMonthCount(account);
  const paidCount = rdPaidCount(account);
  const monthly = rdMonthly(account);

  // The pill: FD shows its maturity countdown, RD shows paid progress, cash a
  // plain tag; an account balance needs none (its tab already says what it is).
  const status = maturityStatus(account.maturityDate);
  const toneColors: Record<Status["tone"], string> = {
    active: colors.positive,
    matured: colors.accentAmber,
    none: colors.textMuted,
  };
  let pillLabel = "";
  let pillTone = colors.accentBlue;
  if (isFD) {
    pillLabel = status.label;
    pillTone = toneColors[status.tone];
  } else if (isRD) {
    pillLabel = `${paidCount}/${monthCount} paid`;
    pillTone =
      monthCount > 0 && paidCount >= monthCount
        ? colors.positive
        : colors.accentBlue;
  } else if (isCash) {
    pillLabel = accountTypeLabel("Cash");
  }
  const showPill = isFD || isRD || isCash;

  // The Name field only exists for cash now, so non-cash rows title from the
  // institution (falling back to a legacy name, then the type).
  const name = (account.name ?? "").trim();
  const inst = institution && institution !== "—" ? institution : "";
  const title = isCash
    ? name || accountTypeLabel("Cash")
    : inst || name || accountTypeLabel(account.accountType);

  // Don't repeat the institution in the subtitle when it's already the title.
  const subtitleParts = [
    isCash || title === inst ? "" : inst,
    ownerName,
    isFD && account.interestPercentage
      ? `${account.interestPercentage}% p.a.`
      : "",
    isFD && account.interestFrequency ? account.interestFrequency : "",
  ].filter(Boolean);

  const a11yLabel = showPill ? `${title}, ${pillLabel}` : title;

  return (
    <Pressable
      onPress={() => onClickCard(account)}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.topRow}>
        <Text style={styles.name} numberOfLines={1}>
          {title}
        </Text>
        {showPill && (
          <View style={[styles.pill, { backgroundColor: tint(pillTone) }]}>
            <Text style={[styles.pillText, { color: pillTone }]}>
              {pillLabel}
            </Text>
          </View>
        )}
      </View>

      {subtitleParts.length > 0 && (
        <Text style={styles.subtitle}>{subtitleParts.join(" · ")}</Text>
      )}

      <Text style={styles.amount}>₹ {amountFormat(account.balance)}</Text>
      {isFD && Number(account.interest) > 0 && (
        <Text style={styles.interest}>
          + ₹ {amountFormat(account.interest)} interest
          {account.interestFrequency ? ` / ${payoutWord}` : ""}
        </Text>
      )}
      {isFD && Number(account.maturityAmount) > 0 && (
        <Text style={styles.interest}>
          → ₹ {amountFormat(account.maturityAmount)} at maturity
        </Text>
      )}
      {isRD && (
        <Text style={styles.rdCaption}>
          {paidCount} of {monthCount} months paid · ₹{amountFormat(monthly)}/mo
        </Text>
      )}

      <View style={styles.divider} />

      {isFD && (
        <View style={styles.dateRow}>
          <View>
            <Text style={styles.dateLabel}>Deposited</Text>
            <Text style={styles.dateValue}>{account.depositedDate || "—"}</Text>
          </View>
          <View style={styles.dateColumnEnd}>
            <Text style={styles.dateLabel}>Matures</Text>
            <Text style={styles.dateValue}>
              {parseMaturity(account.maturityDate)?.format(DATE_FORMAT) ?? "—"}
            </Text>
          </View>
        </View>
      )}

      {isRD && (
        <>
          <Pressable
            onPress={() => setExpanded((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? "Hide schedule" : "View schedule"}
            style={styles.scheduleToggle}
          >
            <Text style={styles.scheduleToggleText}>
              {expanded ? "Hide schedule" : "View schedule"}
            </Text>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textMuted}
            />
          </Pressable>

          {expanded &&
            schedule.map((instalment) => (
              <View key={instalment.index} style={styles.instalmentRow}>
                <View style={styles.instalmentInfo}>
                  <Text style={styles.instalmentMonth}>
                    Month {instalment.index + 1}
                  </Text>
                  <Text style={styles.instalmentDue}>
                    {instalment.due || "—"}
                  </Text>
                </View>
                <Text style={styles.instalmentAmount}>
                  ₹ {amountFormat(instalment.amount)}
                </Text>
                {editable ? (
                  <Pressable
                    onPress={() =>
                      onToggleInstalment?.(
                        account,
                        instalment.index,
                        !instalment.paid
                      )
                    }
                    accessibilityRole="button"
                    style={[
                      styles.payPill,
                      {
                        backgroundColor: instalment.paid
                          ? tint(colors.positive)
                          : colors.inputBackground,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.payPillText,
                        {
                          color: instalment.paid
                            ? colors.positive
                            : colors.textMuted,
                        },
                      ]}
                    >
                      {instalment.paid ? "Paid" : "Mark paid"}
                    </Text>
                  </Pressable>
                ) : (
                  <Text
                    style={[
                      styles.payPillText,
                      {
                        color: instalment.paid
                          ? colors.positive
                          : colors.textMuted,
                      },
                    ]}
                  >
                    {instalment.paid ? "Paid" : "Unpaid"}
                  </Text>
                )}
              </View>
            ))}
        </>
      )}

      {!isDeposit && (
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>Balance as of</Text>
          <Text style={styles.dateValue}>{account.balanceAsOf || "—"}</Text>
        </View>
      )}
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 14,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 2,
    },
    cardPressed: {
      opacity: 0.65,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    name: {
      flex: 1,
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
      marginRight: 12,
    },
    pill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pillText: {
      fontSize: 11,
      fontWeight: "600",
    },
    subtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
    },
    amount: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      marginTop: 12,
      fontVariant: ["tabular-nums"],
    },
    interest: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.positive,
      marginTop: 2,
      fontVariant: ["tabular-nums"],
    },
    rdCaption: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
      fontVariant: ["tabular-nums"],
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: 14,
    },
    dateRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    dateColumnEnd: {
      alignItems: "flex-end",
    },
    dateLabel: {
      fontSize: 12,
      color: colors.textMuted,
    },
    dateValue: {
      fontSize: 14,
      color: colors.text,
      marginTop: 2,
    },
    scheduleToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    scheduleToggleText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
    },
    instalmentRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12,
      gap: 12,
    },
    instalmentInfo: {
      flex: 1,
    },
    instalmentMonth: {
      fontSize: 14,
      color: colors.text,
    },
    instalmentDue: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    instalmentAmount: {
      fontSize: 14,
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    payPill: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      minWidth: 84,
      alignItems: "center",
    },
    payPillText: {
      fontSize: 12,
      fontWeight: "600",
    },
  });

export default AccountCard;
