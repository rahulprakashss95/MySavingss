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
  updateDoc,
  where,
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
import type { ClientInput, ClientModel } from "../src/models/ClientModel";
import type { FixedDepositModel } from "../src/models/FixedDepositModel";
import type { LoginUserModel, StoredLoginUser, UserRole } from "../src/models/LoginUserModel";
import type { FamilyInput, FamilyModel } from "../src/models/FamilyModel";
import { normalizeFamilyCode } from "../src/models/FamilyModel";
import type { ModuleKey, Owned, Visibility } from "../src/models/common";
import { DEFAULT_VISIBILITY, canView, canEdit } from "../src/models/common";
import { makeCredential, verifyPassword } from "../src/utils/passwordHash";
import firebaseDb from "./firebaseDb";

const db = getFirestore(firebaseDb);

const FAMILIES = "families";
const FAMILY_SETTINGS = "familySettings";
const LOGIN_USERS = "loginUsers";
const CLIENTS = "clients";
const FIXED_DEPOSIT = "fixedDeposits";
const GOVERNMENT_DOCUMENTS = "governmentDocuments";
const BANK_DOCUMENTS = "bankDocuments";
const ORNAMENTS = "ornaments";
const PROPERTIES = "properties";
const LEDGER_CLIENTS = "ledgerClients";
const LEDGER_EARNINGS = "ledgerEarnings";
const LEDGER_SAVINGS = "ledgerSavings";

/* ------------------------------------------------------------------ *
 * Active scope
 *
 * Every domain read/write is scoped to one family and attributed to one
 * login user. Rather than thread (familyId, userId) through ~30 screens, the
 * signed-in scope is set once by AuthContext and read here. Reads filter by
 * family + visibility; writes stamp family + owner automatically.
 * ------------------------------------------------------------------ */

type ActiveScope = { familyId: string; userId: string };

let activeScope: ActiveScope | null = null;

export const setActiveScope = (scope: ActiveScope) => {
  activeScope = scope;
};

export const clearActiveScope = () => {
  activeScope = null;
};

const requireScope = (): ActiveScope => {
  if (!activeScope) {
    throw new Error("No active family scope — sign in before reading/writing.");
  }
  return activeScope;
};

/* ------------------------------------------------------------------ *
 * Generic scoped helpers
 * ------------------------------------------------------------------ */

/**
 * Every row in a scoped collection lives in exactly one family. Reads filter to
 * the active family, then drop private records the current user doesn't own.
 * With no active scope (e.g. before sign-in) this resolves empty rather than
 * throwing, so a stray read can't crash the app.
 */
const listScoped = <T extends Owned>(collectionName: string): Promise<T[]> => {
  if (!activeScope) {
    return Promise.resolve([]);
  }
  const { familyId, userId } = activeScope;
  return getDocs(
    query(collection(db, collectionName), where("familyId", "==", familyId))
  ).then((snapshot) =>
    snapshot.docs
      .map((entry) => entry.data() as T)
      .filter((record) => canView(record, userId))
  );
};

/**
 * setDoc replaces the whole document, so callers must pass every field they
 * want to keep. On create, the row is stamped with the active family and the
 * creator as owner; on edit, the original family and owner are preserved (a
 * non-owner editing a public record must not seize ownership), while a caller
 * can still change `visibility`. Passing no refId creates a new id.
 */
const saveScoped = async <T extends { visibility?: Visibility }>(
  collectionName: string,
  input: T,
  refId?: string
): Promise<T & Owned & { id: string }> => {
  const scope = requireScope();
  const id = refId ?? doc(collection(db, collectionName)).id;

  let ownerId = scope.userId;
  let familyId = scope.familyId;
  if (refId) {
    const existing = await getDoc(doc(db, collectionName, refId));
    if (existing.exists()) {
      const data = existing.data() as Partial<Owned>;
      // Only the creator may edit an existing record. Public records are
      // visible to the whole family but must not be editable by anyone else.
      if (!canEdit(data, scope.userId)) {
        throw new Error("You can only edit records you created.");
      }
      ownerId = data.ownerId ?? ownerId;
      familyId = data.familyId ?? familyId;
    }
  }

  const visibility: Visibility = input.visibility ?? DEFAULT_VISIBILITY;
  const record = {
    ...input,
    visibility,
    familyId,
    ownerId,
    id,
  };
  await setDoc(doc(db, collectionName, id), record);
  return record;
};

/**
 * Deletes a scoped record, but only for its owner. Public records stay
 * removable by their creator alone — another family member who can see one
 * still can't delete it.
 */
const deleteRecord = async (collectionName: string, id: string) => {
  const scope = requireScope();
  const existing = await getDoc(doc(db, collectionName, id));
  if (existing.exists() && !canEdit(existing.data() as Partial<Owned>, scope.userId)) {
    throw new Error("You can only delete records you created.");
  }
  return deleteDoc(doc(db, collectionName, id));
};

/* ------------------------------------------------------------------ *
 * Families
 * ------------------------------------------------------------------ */

/** Every registered family, for the login screen's family chooser. */
export const getFamilies = (): Promise<FamilyModel[]> =>
  getDocs(query(collection(db, FAMILIES))).then((snapshot) =>
    snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id } as FamilyModel))
  );

/** True if no other family already uses this code (case/space-insensitive). */
export const isFamilyCodeAvailable = (code: string, exceptId?: string) =>
  getDocs(
    query(collection(db, FAMILIES), where("code", "==", normalizeFamilyCode(code)))
  ).then((snapshot) => snapshot.docs.every((entry) => entry.id === exceptId));

/** Creates a family with an internal immutable id and a normalized code. */
export const createFamily = (input: FamilyInput): Promise<FamilyModel> => {
  const id = doc(collection(db, FAMILIES)).id;
  const family: FamilyModel = {
    ...input,
    code: normalizeFamilyCode(input.code),
    id,
  };
  return setDoc(doc(db, FAMILIES, id), family).then(() => family);
};

export const getFamilyById = (id: string): Promise<FamilyModel | null> =>
  getDoc(doc(db, FAMILIES, id)).then((snapshot) =>
    snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as FamilyModel) : null
  );

export const getFamilyByCode = (code: string): Promise<FamilyModel | null> =>
  getDocs(
    query(collection(db, FAMILIES), where("code", "==", normalizeFamilyCode(code)))
  ).then((snapshot) => {
    if (snapshot.empty) {
      return null;
    }
    const match = snapshot.docs[0];
    return { ...match.data(), id: match.id } as FamilyModel;
  });

/** Admins can rename the family or change its handle without re-stamping rows. */
export const updateFamily = (id: string, patch: Partial<FamilyInput>) => {
  const data =
    patch.code != null
      ? { ...patch, code: normalizeFamilyCode(patch.code) }
      : patch;
  return updateDoc(doc(db, FAMILIES, id), data);
};

/* ------------------------------------------------------------------ *
 * Login users
 * ------------------------------------------------------------------ */

/**
 * Usernames are unique within a family (not globally), so two families can each
 * have their own "admin" or "dad". Login picks the family first, so the handle
 * only ever needs to be unique alongside its siblings.
 */
export const isUsernameAvailable = (
  familyId: string,
  username: string,
  exceptId?: string
) =>
  getDocs(
    query(
      collection(db, LOGIN_USERS),
      where("familyId", "==", familyId),
      where("username", "==", username.trim())
    )
  ).then((snapshot) => snapshot.docs.every((entry) => entry.id === exceptId));

/** Full stored user incl. credentials — only login/admin flows use this. */
export const getStoredUser = (
  familyId: string,
  username: string
): Promise<StoredLoginUser | null> =>
  getDocs(
    query(
      collection(db, LOGIN_USERS),
      where("familyId", "==", familyId),
      where("username", "==", username.trim())
    )
  ).then((snapshot) => {
    if (snapshot.empty) {
      return null;
    }
    const match = snapshot.docs[0];
    return { ...match.data(), id: match.id } as StoredLoginUser;
  });

/**
 * Resolves the matching user in the chosen family (with its doc id) or null on
 * bad credentials — never rejects for "not found", so the login spinner can't
 * hang. Verifies the password against the stored salt, not a plaintext column.
 */
export const authenticate = async (
  familyId: string,
  username: string,
  password: string
): Promise<StoredLoginUser | null> => {
  const stored = await getStoredUser(familyId, username);
  if (!stored) {
    return null;
  }
  const ok = await verifyPassword(password, stored);
  return ok ? stored : null;
};

/**
 * "Forgot Family ID" recovery without email: given a username + password, find
 * every family where those credentials are valid. Verifies the password before
 * revealing anything, so it only ever discloses a family to someone who already
 * has a working account in it. Usually returns exactly one match.
 */
export const findFamiliesForCredentials = async (
  username: string,
  password: string
): Promise<{ family: FamilyModel; user: StoredLoginUser }[]> => {
  const snapshot = await getDocs(
    query(collection(db, LOGIN_USERS), where("username", "==", username.trim()))
  );
  const matches: { family: FamilyModel; user: StoredLoginUser }[] = [];
  for (const entry of snapshot.docs) {
    const stored = { ...entry.data(), id: entry.id } as StoredLoginUser;
    if (await verifyPassword(password, stored)) {
      const family = await getFamilyById(stored.familyId);
      if (family) {
        matches.push({ family, user: stored });
      }
    }
  }
  return matches;
};

export type CreateUserInput = {
  familyId: string;
  username: string;
  name?: string;
  role: UserRole;
  moduleAccess: ModuleKey[];
  password: string;
};

/** Creates a member with a freshly salted+hashed password. */
export const createLoginUser = async (input: CreateUserInput): Promise<string> => {
  const id = doc(collection(db, LOGIN_USERS)).id;
  const credential = await makeCredential(input.password);
  const { password: _password, name, ...rest } = input;
  // Firestore rejects `undefined` field values, so store an empty display name
  // rather than omitting it; displayNameOf() falls back to the username.
  await setDoc(doc(db, LOGIN_USERS, id), {
    ...rest,
    name: name ?? "",
    ...credential,
    id,
  });
  return id;
};

/** Profile/access edits only — never touches credentials. */
export const updateLoginUser = (
  id: string,
  patch: Partial<Pick<LoginUserModel, "name" | "role" | "moduleAccess" | "username">>
) => {
  // Drop undefined values; Firestore updateDoc rejects them.
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined)
  );
  return updateDoc(doc(db, LOGIN_USERS, id), clean);
};

export const resetUserPassword = async (id: string, password: string) => {
  const credential = await makeCredential(password);
  return updateDoc(doc(db, LOGIN_USERS, id), credential);
};

// Member removal is an admin action authorized by role (enforced in the admin
// screen), not by record ownership — so it skips the owner check that guards
// the domain collections.
export const deleteLoginUser = (id: string) =>
  deleteDoc(doc(db, LOGIN_USERS, id));

/**
 * Every member of the active family, projected without credentials. Used by the
 * admin panel and the "person" pickers on documents and assets.
 */
export const getFamilyUsers = (): Promise<LoginUserModel[]> =>
  getDocs(
    query(collection(db, LOGIN_USERS), where("familyId", "==", requireScope().familyId))
  ).then((snapshot) =>
    snapshot.docs.map((entry) => {
      const data = entry.data();
      return {
        id: entry.id,
        familyId: data.familyId,
        username: data.username,
        name: data.name,
        role: (data.role ?? "member") as UserRole,
        moduleAccess: (data.moduleAccess ?? []) as ModuleKey[],
      } as LoginUserModel;
    })
  );

/** Kept name for the person pickers; identical to getFamilyUsers. */
export const getLoginUsers = getFamilyUsers;

/* ------------------------------------------------------------------ *
 * Domain collections (all scoped to the active family + visibility)
 * ------------------------------------------------------------------ */

export const getClients = () => listScoped<ClientModel>(CLIENTS);

export const addClient = (input: ClientInput) => saveScoped(CLIENTS, input);

export const updateClient = (refId: string, input: ClientInput) =>
  saveScoped(CLIENTS, input, refId);

export const deleteClient = (id: string) => deleteRecord(CLIENTS, id);

export const getFixedDeposit = () => listScoped<FixedDepositModel>(FIXED_DEPOSIT);

export type FixedDepositInput = {
  clientId: string;
  depositorName: string;
  amount: string;
  interest: string;
  interestPercentage: string;
  depositedDate: string;
  maturityDate: string;
  canShow?: boolean;
  isCompleted?: boolean;
  visibility?: Visibility;
};

/**
 * setDoc replaces the whole document, so the status flags have to be written
 * back on every save or they'd blank out. Family/owner/visibility are stamped
 * by saveScoped; defaults here cover the status flags on create.
 */
const withFixedDepositDefaults = (input: FixedDepositInput) => ({
  ...input,
  canShow: input.canShow ?? true,
  isCompleted: input.isCompleted ?? false,
});

export const addFixedDeposit = (input: FixedDepositInput) =>
  saveScoped(FIXED_DEPOSIT, withFixedDepositDefaults(input));

export const updateFixedDeposit = (refId: string, input: FixedDepositInput) =>
  saveScoped(FIXED_DEPOSIT, withFixedDepositDefaults(input), refId);

export const deleteFixedDeposit = (id: string) => deleteRecord(FIXED_DEPOSIT, id);

export const getGovernmentDocuments = () =>
  listScoped<GovernmentDocumentModel>(GOVERNMENT_DOCUMENTS);

export const addGovernmentDocument = (input: GovernmentDocumentInput) =>
  saveScoped(GOVERNMENT_DOCUMENTS, input);

export const updateGovernmentDocument = (
  refId: string,
  input: GovernmentDocumentInput
) => saveScoped(GOVERNMENT_DOCUMENTS, input, refId);

export const deleteGovernmentDocument = (id: string) =>
  deleteRecord(GOVERNMENT_DOCUMENTS, id);

export const getBankDocuments = () => listScoped<BankDocumentModel>(BANK_DOCUMENTS);

export const addBankDocument = (input: BankDocumentInput) =>
  saveScoped(BANK_DOCUMENTS, input);

export const updateBankDocument = (refId: string, input: BankDocumentInput) =>
  saveScoped(BANK_DOCUMENTS, input, refId);

export const deleteBankDocument = (id: string) =>
  deleteRecord(BANK_DOCUMENTS, id);

export const getOrnaments = () => listScoped<OrnamentModel>(ORNAMENTS);

export const addOrnament = (input: OrnamentInput) => saveScoped(ORNAMENTS, input);

export const updateOrnament = (refId: string, input: OrnamentInput) =>
  saveScoped(ORNAMENTS, input, refId);

export const deleteOrnament = (id: string) => deleteRecord(ORNAMENTS, id);

export const getProperties = () => listScoped<PropertyModel>(PROPERTIES);

export const addProperty = (input: PropertyInput) => saveScoped(PROPERTIES, input);

/** Payment entries live inside the property document, so this writes them too. */
export const updateProperty = (refId: string, input: PropertyInput) =>
  saveScoped(PROPERTIES, input, refId);

export const deleteProperty = (id: string) => deleteRecord(PROPERTIES, id);

/**
 * Metal rates are shared within a family — one rate so everyone's overview
 * agrees — but not across families. Stored per family under `familySettings`.
 */
const metalRatesDoc = () => doc(db, FAMILY_SETTINGS, requireScope().familyId);

export const getMetalRates = () =>
  getDoc(metalRatesDoc()).then((snapshot) =>
    snapshot.exists()
      ? ({ ...EMPTY_METAL_RATES, ...snapshot.data() } as MetalRates)
      : EMPTY_METAL_RATES
  );

export const saveMetalRates = (rates: MetalRates) =>
  setDoc(metalRatesDoc(), rates);

export const getLedgerClients = () =>
  listScoped<LedgerClientModel>(LEDGER_CLIENTS);

export const addLedgerClient = (input: LedgerClientInput) =>
  saveScoped(LEDGER_CLIENTS, input);

export const updateLedgerClient = (refId: string, input: LedgerClientInput) =>
  saveScoped(LEDGER_CLIENTS, input, refId);

export const deleteLedgerClient = (id: string) =>
  deleteRecord(LEDGER_CLIENTS, id);

export const getEarnings = () => listScoped<EarningModel>(LEDGER_EARNINGS);

export const addEarning = (input: EarningInput) =>
  saveScoped(LEDGER_EARNINGS, input);

export const updateEarning = (refId: string, input: EarningInput) =>
  saveScoped(LEDGER_EARNINGS, input, refId);

export const deleteEarning = (id: string) => deleteRecord(LEDGER_EARNINGS, id);

export const getSavings = () => listScoped<SavingModel>(LEDGER_SAVINGS);

export const addSaving = (input: SavingInput) => saveScoped(LEDGER_SAVINGS, input);

export const updateSaving = (refId: string, input: SavingInput) =>
  saveScoped(LEDGER_SAVINGS, input, refId);

export const deleteSaving = (id: string) => deleteRecord(LEDGER_SAVINGS, id);
