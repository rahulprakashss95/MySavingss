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

/** Add to this list as new kinds of income turn up. */
export const EARNING_TYPES = ["Salary", "Incentive"] as const;

export type EarningType = (typeof EARNING_TYPES)[number];

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
  /** One of EARNING_TYPES. Typed loosely so older rows still read. */
  type: string;
};

export type SavingModel = LedgerEntry;

export type LedgerClientInput = Creatable<LedgerClientModel>;
export type EarningInput = Creatable<EarningModel>;
export type SavingInput = Creatable<SavingModel>;
