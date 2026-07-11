import "firebase/firestore";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  where
} from "firebase/firestore";
import type {
  MetalRates,
  OrnamentInput,
  OrnamentModel,
  PropertyInput,
  PropertyModel,
} from "../src/models/AssetModel";
import { EMPTY_METAL_RATES } from "../src/models/AssetModel";
import type {
  BankDocumentInput,
  BankDocumentModel,
  GovernmentDocumentInput,
  GovernmentDocumentModel,
} from "../src/models/DocumentModel";
import type {
  EarningInput,
  EarningModel,
  LedgerClientInput,
  LedgerClientModel,
  SavingInput,
  SavingModel,
} from "../src/models/LedgerModel";
import type { ClientModel } from "../src/models/ClientModel";
import type { FixedDepositModel } from "../src/models/FixedDepositModel";
import type { LoginUserModel } from "../src/models/LoginUserModel";
import firebaseDb from "./firebaseDb";

const db = getFirestore(firebaseDb);

const LOGIN_USERS = "loginUsers";
const CLIENTS = "clients";
const FIXED_DEPOSIT = "fixedDeposit";
const GOVERNMENT_DOCUMENTS = "governmentDocuments";
const BANK_DOCUMENTS = "bankDocuments";
const ORNAMENTS = "ornaments";
const PROPERTIES = "properties";
const LEDGER_CLIENTS = "ledgerClients";
const LEDGER_EARNINGS = "ledgerEarnings";
const LEDGER_SAVINGS = "ledgerSavings";

/** Every document row stores its own id, so `data()` alone is enough. */
const listAll = <T,>(collectionName: string) =>
  getDocs(query(collection(db, collectionName))).then((snapshot) =>
    snapshot.docs.map((entry) => entry.data() as T)
  );

/**
 * setDoc replaces the whole document, so callers must pass every field they
 * want to keep. Passing no refId creates one.
 */
const saveRecord = <T,>(collectionName: string, input: T, refId?: string) => {
  const id = refId ?? doc(collection(db, collectionName)).id;
  return setDoc(doc(db, collectionName, id), { ...input, id }).then(() => id);
};

const deleteRecord = (collectionName: string, id: string) =>
  deleteDoc(doc(db, collectionName, id));

/**
 * Ledger reads are scoped to one login. A missing id resolves empty rather than
 * falling back to an unfiltered read — the failure mode there is showing one
 * user another's earnings.
 */
const listForUser = <T,>(collectionName: string, loginUserId: string) => {
  if (!loginUserId) {
    return Promise.resolve([] as T[]);
  }
  return getDocs(
    query(collection(db, collectionName), where("loginUserId", "==", loginUserId))
  ).then((snapshot) => snapshot.docs.map((entry) => entry.data() as T));
};

/**
 * Resolves the matching user (with its doc id) or null on bad credentials —
 * never rejects for "not found", so the login spinner can't hang.
 */
export const getLoginUser = (username: string, password: string) =>
  getDocs(
    query(
      collection(db, LOGIN_USERS),
      where("username", "==", username),
      where("password", "==", password)
    )
  ).then((snapshot) => {
    if (snapshot.empty) {
      return null;
    }
    const match = snapshot.docs[0];
    return { ...match.data(), id: match.id };
  });

/**
 * Every family member's account, for the "person" picker on documents. Only the
 * naming fields are projected — the rest of the row holds credentials.
 */
export const getLoginUsers = () =>
  getDocs(query(collection(db, LOGIN_USERS))).then((snapshot) =>
    snapshot.docs.map(
      (entry) =>
        ({
          id: entry.id,
          username: entry.data().username,
          name: entry.data().name,
        } as LoginUserModel)
    )
  );

export const getClients = () => listAll<ClientModel>(CLIENTS);

export const getFixedDeposit = () => listAll<FixedDepositModel>(FIXED_DEPOSIT);

export type FixedDepositInput = {
  clientId: string;
  depositorName: string;
  amount: string;
  interest: string;
  interestPercentage: string;
  depositedDate: string;
  maturityDate: string;
  /** Owning login user. Preserved verbatim on edit so it is never blanked. */
  loginUserId?: string;
  canShow?: boolean;
  isCompleted?: boolean;
};

/**
 * setDoc replaces the whole document, so the owner and status flags have to be
 * written back on every save or they'd blank out. Defaults apply on create.
 */
const withFixedDepositDefaults = (input: FixedDepositInput) => ({
  ...input,
  loginUserId: input.loginUserId ?? "",
  canShow: input.canShow ?? true,
  isCompleted: input.isCompleted ?? false,
});

export const addFixedDeposit = (input: FixedDepositInput) =>
  saveRecord(FIXED_DEPOSIT, withFixedDepositDefaults(input));

export const updateFixedDeposit = (refId: string, input: FixedDepositInput) =>
  saveRecord(FIXED_DEPOSIT, withFixedDepositDefaults(input), refId);

export const deleteFixedDeposit = (id: string) => deleteRecord(FIXED_DEPOSIT, id);

export const getGovernmentDocuments = () =>
  listAll<GovernmentDocumentModel>(GOVERNMENT_DOCUMENTS);

export const addGovernmentDocument = (input: GovernmentDocumentInput) =>
  saveRecord(GOVERNMENT_DOCUMENTS, input);

export const updateGovernmentDocument = (
  refId: string,
  input: GovernmentDocumentInput
) => saveRecord(GOVERNMENT_DOCUMENTS, input, refId);

export const deleteGovernmentDocument = (id: string) =>
  deleteRecord(GOVERNMENT_DOCUMENTS, id);

export const getBankDocuments = () => listAll<BankDocumentModel>(BANK_DOCUMENTS);

export const addBankDocument = (input: BankDocumentInput) =>
  saveRecord(BANK_DOCUMENTS, input);

export const updateBankDocument = (refId: string, input: BankDocumentInput) =>
  saveRecord(BANK_DOCUMENTS, input, refId);

export const deleteBankDocument = (id: string) =>
  deleteRecord(BANK_DOCUMENTS, id);

export const getOrnaments = () => listAll<OrnamentModel>(ORNAMENTS);

export const addOrnament = (input: OrnamentInput) => saveRecord(ORNAMENTS, input);

export const updateOrnament = (refId: string, input: OrnamentInput) =>
  saveRecord(ORNAMENTS, input, refId);

export const deleteOrnament = (id: string) => deleteRecord(ORNAMENTS, id);

export const getProperties = () => listAll<PropertyModel>(PROPERTIES);

export const addProperty = (input: PropertyInput) => saveRecord(PROPERTIES, input);

/** Payment entries live inside the property document, so this writes them too. */
export const updateProperty = (refId: string, input: PropertyInput) =>
  saveRecord(PROPERTIES, input, refId);

export const deleteProperty = (id: string) => deleteRecord(PROPERTIES, id);

/** A single shared document, not a collection — one rate for the whole family. */
const METAL_RATES_DOC = doc(db, "settings", "metalRates");

export const getMetalRates = () =>
  getDoc(METAL_RATES_DOC).then((snapshot) =>
    snapshot.exists() ? ({ ...EMPTY_METAL_RATES, ...snapshot.data() } as MetalRates) : EMPTY_METAL_RATES
  );

export const saveMetalRates = (rates: MetalRates) =>
  setDoc(METAL_RATES_DOC, rates);

export const getLedgerClients = (loginUserId: string) =>
  listForUser<LedgerClientModel>(LEDGER_CLIENTS, loginUserId);

export const addLedgerClient = (input: LedgerClientInput) =>
  saveRecord(LEDGER_CLIENTS, input);

export const updateLedgerClient = (refId: string, input: LedgerClientInput) =>
  saveRecord(LEDGER_CLIENTS, input, refId);

export const deleteLedgerClient = (id: string) =>
  deleteRecord(LEDGER_CLIENTS, id);

export const getEarnings = (loginUserId: string) =>
  listForUser<EarningModel>(LEDGER_EARNINGS, loginUserId);

export const addEarning = (input: EarningInput) =>
  saveRecord(LEDGER_EARNINGS, input);

export const updateEarning = (refId: string, input: EarningInput) =>
  saveRecord(LEDGER_EARNINGS, input, refId);

export const deleteEarning = (id: string) => deleteRecord(LEDGER_EARNINGS, id);

export const getSavings = (loginUserId: string) =>
  listForUser<SavingModel>(LEDGER_SAVINGS, loginUserId);

export const addSaving = (input: SavingInput) => saveRecord(LEDGER_SAVINGS, input);

export const updateSaving = (refId: string, input: SavingInput) =>
  saveRecord(LEDGER_SAVINGS, input, refId);

export const deleteSaving = (id: string) => deleteRecord(LEDGER_SAVINGS, id);
