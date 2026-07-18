import type { Owned } from "./common";

export type FixedDepositModel = Owned & {
  amount: string;
  bankId: string;
  depositedDate: string;
  /** Display label for whose deposit this is; ownership is `ownerId` (from Owned). */
  depositorName: string;
  id: string;
  interest: string;
  interestPercentage: string;
  maturityDate: string;
  /**
   * Derived, not stored: `mergeBankNames` fills this in from `bankId` against
   * the bank list, so it is absent on a record read straight from the database.
   */
  name: string;
};
