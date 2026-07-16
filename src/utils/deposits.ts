import moment from "moment";
import { BankModel } from "../models/BankModel";
import { FixedDepositModel } from "../models/FixedDepositModel";

export const DATE_FORMAT = "DD-MMM-YYYY";

/**
 * `maturityDate` arrives as "", "0", 0 or a DD-MMM-YYYY string depending on how
 * the record was written, so normalise before parsing.
 */
export const parseMaturity = (maturityDate: any) => {
  if (!maturityDate || maturityDate === "0") {
    return null;
  }
  const parsed = moment(maturityDate, DATE_FORMAT, true);
  return parsed.isValid() ? parsed : null;
};

/** Rows flagged `canShow: false` are soft-deleted and must never be counted. */
export const visibleDeposits = (deposits: FixedDepositModel[]) =>
  deposits.filter((deposit: any) => deposit?.canShow);

/** Attach each deposit's bank name from the bank list, without mutating input. */
export const mergeBankNames = (
  deposits: FixedDepositModel[],
  banks: BankModel[]
): FixedDepositModel[] =>
  deposits.map((deposit) => {
    const bank = banks?.find((b) => b.id == deposit.bankId);
    return {
      ...deposit,
      name: bank?.name ?? "Unknown",
      mobile: (bank?.mobile as any) ?? null,
    };
  });

/**
 * Soonest maturity first; deposits with no maturity date sort to the end.
 * Partitioning first avoids comparing against unparseable dates.
 */
export const sortByMaturity = (deposits: FixedDepositModel[]) => {
  const dated: FixedDepositModel[] = [];
  const undated: FixedDepositModel[] = [];

  for (const deposit of deposits) {
    (parseMaturity(deposit.maturityDate) ? dated : undated).push(deposit);
  }

  dated.sort(
    (a, b) =>
      parseMaturity(a.maturityDate)!.valueOf() -
      parseMaturity(b.maturityDate)!.valueOf()
  );

  return [...dated, ...undated];
};

export type BankTotal = { label: string; value: number };

export type DepositTotals = {
  amount: number;
  interest: number;
  depositCount: number;
  bankCount: number;
  largestDeposit: number;
  amountByBank: BankTotal[];
  interestByBank: BankTotal[];
};

/** Roll a list of deposits (already merged with bank names) up into totals. */
export const buildTotals = (deposits: FixedDepositModel[]): DepositTotals => {
  const byBank: Record<string, { amount: number; interest: number }> = {};
  let amount = 0;
  let interest = 0;
  let largestDeposit = 0;

  for (const deposit of deposits) {
    const bank = deposit.name || "Unknown";
    const depositAmount = Number(deposit.amount) || 0;
    const depositInterest = Number(deposit.interest) || 0;

    amount += depositAmount;
    interest += depositInterest;
    largestDeposit = Math.max(largestDeposit, depositAmount);

    if (!byBank[bank]) {
      byBank[bank] = { amount: 0, interest: 0 };
    }
    byBank[bank].amount += depositAmount;
    byBank[bank].interest += depositInterest;
  }

  const banks = Object.entries(byBank);

  return {
    amount,
    interest,
    depositCount: deposits.length,
    bankCount: banks.length,
    largestDeposit,
    amountByBank: banks.map(([label, v]) => ({ label, value: v.amount })),
    interestByBank: banks.map(([label, v]) => ({ label, value: v.interest })),
  };
};
