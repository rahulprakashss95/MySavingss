import type { Creatable, Owned } from "./common";

/**
 * One record type for every place money sits — the balance layer of net worth.
 * A Fixed Deposit is just `accountType: "Fixed Deposit"`; normal money kept at a
 * bank/financier/institution ("Account Balance"), a recurring deposit, or cash
 * are the other types. This replaces the old standalone `fixed_deposits` table:
 * FD rows were migrated in as this type, so nothing about FDs is lost — they
 * simply became one kind of account.
 *
 * A bank, a finance company and any other institution are one category here:
 * each can hold both normal money and deposits, so the *money-kind* is what the
 * type distinguishes, not the institution. The list groups these types into
 * three sections — Balances, Deposits and Cash in Hand — via `accountSection`.
 *
 * `balance` is the number net worth sums, maintained as a snapshot the user
 * edits (see the schema note). The deposit-only fields (`principal`, interest,
 * dates) stay blank for a balance or cash and live in jsonb.
 */

export const ACCOUNT_TYPES = [
  "Account Balance",
  "Fixed Deposit",
  "Recurring Deposit",
  "Cash",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * What each type is *called* in the UI, kept separate from the stored value so a
 * wording change never means migrating rows. "Cash" stores as before but reads
 * as "Cash in Hand" — the section it lives under is now "Cash & Deposits", and
 * an umbrella sharing its name with one of its own tabs reads as a mistake.
 */
const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  "Account Balance": "Account Balance",
  "Fixed Deposit": "Fixed Deposit",
  "Recurring Deposit": "Recurring Deposit",
  Cash: "Cash in Hand",
};

/** Display name for a stored type; unknown legacy types show as-is. */
export const accountTypeLabel = (accountType: string): string =>
  ACCOUNT_TYPE_LABELS[accountType as AccountType] ?? accountType;

/** The deposit-like types: they mature and carry interest. */
export const MATURING_ACCOUNT_TYPES: readonly string[] = [
  "Fixed Deposit",
  "Recurring Deposit",
];

/** True for account types whose maturity/interest fields are meaningful. */
export const isMaturingAccount = (accountType: string): boolean =>
  MATURING_ACCOUNT_TYPES.includes(accountType);

/**
 * How a Fixed Deposit pays its interest. Monthly/Quarterly pay a periodic
 * amount (derivable from principal × rate); "On Maturity" pays nothing until the
 * end, so its periodic interest is zero and the payout is the `maturityAmount`.
 */
export const INTEREST_FREQUENCIES = [
  "Monthly",
  "Quarterly",
  "On Maturity",
] as const;

export type InterestFrequency = (typeof INTEREST_FREQUENCIES)[number];

/** The three groups the list and overview organise accounts into. */
export const ACCOUNT_SECTIONS = ["Balances", "Deposits", "Cash in Hand"] as const;

export type AccountSection = (typeof ACCOUNT_SECTIONS)[number];

/**
 * Which section an account belongs to. Deposits mature; cash is cash; anything
 * else is normal money held at an institution. Written to tolerate legacy rows:
 * the retired "Savings Account" and "Financier / Non-FD" types both fall
 * through to Balances, so old data groups correctly without a migration.
 */
export const accountSection = (accountType: string): AccountSection => {
  if (isMaturingAccount(accountType)) return "Deposits";
  if (accountType === "Cash") return "Cash in Hand";
  return "Balances";
};

/**
 * Map any stored type onto one of the current ACCOUNT_TYPES so the add/edit
 * form can highlight the right chip. Legacy balance types ("Savings Account",
 * "Financier / Non-FD") collapse to "Account Balance"; the rest already match.
 */
export const normalizeAccountType = (accountType: string): AccountType => {
  if ((ACCOUNT_TYPES as readonly string[]).includes(accountType)) {
    return accountType as AccountType;
  }
  return accountType === "Cash" ? "Cash" : "Account Balance";
};

export type AccountModel = Owned & {
  id: string;
  /** One of ACCOUNT_TYPES; typed loosely so older rows still read. */
  accountType: string;
  /** What to call it, e.g. "HDFC Savings" or "Muthoot Deposit". */
  name: string;
  /** `banks` row id when it sits with a bank in the directory; else "". */
  bankId: string;
  /**
   * Free-text institution — a financier, or a bank not worth adding to the
   * directory. Shown when there is no `bankId`.
   */
  institution: string;
  /** The current balance — the figure net worth sums. Maintained as a snapshot. */
  balance: string;
  /** When `balance` was last set. DATE_FORMAT. */
  balanceAsOf: string;

  // Deposit-only (Fixed / Recurring). Blank for an account balance, cash, etc.
  /** Amount originally deposited — also mirrored into `balance` for net worth. */
  principal: string;
  /** Periodic interest payout (per month/quarter). Zero for "On Maturity". */
  interest: string;
  interestPercentage: string;
  /** FD only: one of INTEREST_FREQUENCIES. Blank for RD/others. Stored in jsonb. */
  interestFrequency: string;
  /** FD "On Maturity" only: the amount received at maturity. Stored in jsonb. */
  maturityAmount: string;
  depositedDate: string;
  maturityDate: string;

  // Recurring Deposit only. An RD is tracked as N monthly instalments rather
  // than by maturity: `principal` is the per-month amount, and `payments`
  // records which instalments have been paid. All live in jsonb.
  /** When the RD started. DATE_FORMAT. */
  startDate: string;
  /** Tenure — the number of monthly instalments. Stored as a string. */
  months: string;
  /** Paid flag per instalment (index 0 = first month); length tracks `months`. */
  payments?: boolean[];
};

export type AccountInput = Creatable<AccountModel>;
