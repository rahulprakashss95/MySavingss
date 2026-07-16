import type { Owned } from "./common";

export type FixedDepositModel = Owned & {
  amount: string;
  canShow: boolean;
  bankId: string;
  depositedDate: string;
  /** Display label for whose deposit this is; ownership is `ownerId` (from Owned). */
  depositorName: string;
  id: string;
  interest: string;
  interestPercentage: string;
  isCompleted: boolean;
  maturityDate: any;
  name: string;
  mobile: string;
};
