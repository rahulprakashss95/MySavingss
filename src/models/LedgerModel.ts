import type { Creatable, Owned } from "./common";

/**
 * The ledger is inherently personal: its records default to private, so a
 * member only ever sees their own. Ownership rides on `ownerId` (from `Owned`).
 */
type UserOwned = Owned;

/**
 * Deliberately not the existing `clients` collection: that one holds the banks
 * a fixed deposit sits with. These are the people and firms that pay you.
 */
export type LedgerClientModel = UserOwned & {
  id: string;
  name: string;
  phone: string;
  email: string;
  description: string;
};

/**
 * A user-defined income kind (e.g. "Salary", "Freelance"), managed from the
 * Ledger Setup tile. Mirrors `ExpenseTypeModel`. Earnings store the *name* (not
 * an id — see `EarningModel`), so these supply the option names for the earning
 * form's Type dropdown.
 */
export type EarningTypeModel = UserOwned & {
  id: string;
  name: string;
};

export type EarningTypeInput = Creatable<EarningTypeModel>;

type LedgerEntry = UserOwned & {
  id: string;
  /** `ledgerClients` doc id. */
  clientId: string;
  /** Denormalised so lists and totals don't need a join. */
  clientName: string;
  amount: string;
  /** DATE_FORMAT (DD-MMM-YYYY), matching the rest of the app. */
  date: string;
  comments: string;
};

export type EarningModel = LedgerEntry & {
  /** The earning type's name, from `earning_types`. Free text so older rows read. */
  type: string;
};

/**
 * A saving is a monthly flow — "I set aside this much" — that also records
 * *where* it went via `accountId`, pointing at an `accounts` row (see
 * `AccountModel`). The account holds the running balance; this holds the
 * history of how it got there. `clientId` is retained from `LedgerEntry` for
 * older rows but is unused by savings going forward.
 */
export type SavingModel = LedgerEntry & {
  /** `accounts` row id — the destination this saving went into. */
  accountId: string;
  /** Denormalised so lists don't need a join. */
  accountName: string;
};

export type LedgerClientInput = Creatable<LedgerClientModel>;
export type EarningInput = Creatable<EarningModel>;
export type SavingInput = Creatable<SavingModel>;
