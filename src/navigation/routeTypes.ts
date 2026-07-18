/**
 * Legacy React Navigation param list, relocated out of the old `App.tsx` when
 * the app moved to Expo Router. It survives only for the modules not yet
 * migrated (Documents, Assets, Ledger, Expenses) and the dead nav shell
 * (BottomTabBar/SideDrawer/navigationRef) — all removed once Phase C lands.
 */
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  RecoverFamily: undefined;
  Admin: undefined;
  Home: undefined;
  Deposit: undefined;
  Banks: undefined;
  BankAddEdit: any;
  FixedDepositList: undefined;
  FixedDepositAddEdit: any;
  Documents: undefined;
  GovernmentDocumentList: undefined;
  GovernmentDocumentAddEdit: any;
  BankDocumentList: undefined;
  BankDocumentAddEdit: any;
  Assets: undefined;
  OrnamentList: undefined;
  OrnamentAddEdit: any;
  PropertyList: undefined;
  PropertyAddEdit: any;
  PropertyPayments: any;
  AssetOverview: undefined;
  Ledger: undefined;
  LedgerClientList: undefined;
  LedgerClientAddEdit: any;
  EarningList: undefined;
  EarningAddEdit: any;
  SavingList: undefined;
  SavingAddEdit: any;
  LedgerOverview: undefined;
  Expenses: undefined;
  ExpenseList: undefined;
  ExpenseAddEdit: any;
  ExpenseTypeList: undefined;
  ExpenseTypeAddEdit: any;
  ExpenseOverview: undefined;
  OverView: undefined;
  Profile: undefined;
  Settings: undefined;
};
