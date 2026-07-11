/**
 * The ledger is private to one login. Unlike documents and assets — which the
 * whole family shares — nothing here is grouped by person, because everything
 * on the screen already belongs to whoever is signed in.
 */
type UserOwned = {
  /** `loginUsers` doc id. Every ledger read is filtered on this. */
  loginUserId: string;
};

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

export type LedgerClientInput = Omit<LedgerClientModel, "id">;
export type EarningInput = Omit<EarningModel, "id">;
export type SavingInput = Omit<SavingModel, "id">;
