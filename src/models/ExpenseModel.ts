import type { Creatable, Owned } from "./common";

/**
 * A user-defined expense category (e.g. "Groceries", "Fuel"). Its own record so
 * types persist and can be added on the fly from the expense form — mirrors how
 * `ledgerClients` back the ledger's client dropdown.
 */
export type ExpenseTypeModel = Owned & {
  id: string;
  name: string;
};

export type ExpenseTypeInput = Creatable<ExpenseTypeModel>;

/**
 * A single expense. `typeName` is denormalised alongside `typeId` so lists and
 * totals don't need a join; ownership/visibility ride on `Owned`.
 */
export type ExpenseModel = Owned & {
  id: string;
  /** `expenseTypes` doc id. */
  typeId: string;
  /** Denormalised type name, kept in sync on save. */
  typeName: string;
  amount: string;
  /** DATE_FORMAT (DD-MMM-YYYY), matching the rest of the app. */
  date: string;
  /** Free-text note. */
  comments: string;
};

export type ExpenseInput = Creatable<ExpenseModel>;
