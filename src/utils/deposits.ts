import moment from "moment";
import { BankModel } from "../models/BankModel";
import { FixedDepositModel } from "../models/FixedDepositModel";

export const DATE_FORMAT = "DD-MMM-YYYY";

/**
 * `maturityDate` is either "" (none set) or DD-MMM-YYYY: it comes from a real
 * `date` column via `dateToApp` in `database/query.ts`, which can't produce
 * anything else. The old "0"/0 shapes were Firestore-era and are gone.
 */
export const parseMaturity = (maturityDate: string) => {
  if (!maturityDate) {
    return null;
  }
  const parsed = moment(maturityDate, DATE_FORMAT, true);
  return parsed.isValid() ? parsed : null;
};

/**
 * Attach each deposit's bank name from the bank list, without mutating input.
 *
 * A deposit stores `bankId`, not the bank's name — so renaming a bank updates
 * every deposit at once, with no stored copies to go stale. The join happens
 * here rather than in Postgres because the bank list is already cached for the
 * picker, which makes it free; and rather than denormalising a `bankName` onto
 * the deposit, which is what would go stale on a rename.
 *
 * A bank that no longer exists reads as "Unknown" — deleting a bank leaves its
 * deposits intact by design (see the `owner_id` note in `database/schema.sql`).
 */
export const mergeBankNames = (
  deposits: FixedDepositModel[],
  banks: BankModel[]
): FixedDepositModel[] => {
  const byId = new Map((banks ?? []).map((bank) => [bank.id, bank]));
  return deposits.map((deposit) => ({
    ...deposit,
    name: byId.get(deposit.bankId)?.name ?? "Unknown",
  }));
};

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
