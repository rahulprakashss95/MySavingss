/**
 * The app's entire data layer: every read and write in HomeVault goes through
 * one of the functions exported here, and nothing above `database/` ever talks
 * to the storage SDK directly.
 *
 * **Currently backed by Supabase (hosted Postgres); before 2026-07-17 it was
 * Firestore.** The file is named for its role rather than its provider on
 * purpose — the old `firebaseQuery` name meant that swapping providers renamed
 * an import in ~20 screens for no reason. Keep it that way: if this moves off
 * Supabase again, only this file and `client.ts` should change, and these
 * comments should be updated to name the new store.
 *
 * The provider shows through in four places worth knowing about:
 *  - rows are `{ scope columns..., data jsonb }`, mapped to flat records here
 *    (see `toRecord`/`toData`) — see `schema.sql`;
 *  - failures arrive as a value, not a rejection, so everything goes through
 *    `unwrap`, which throws;
 *  - ids are minted client-side by `newId`, not by the database;
 *  - anything that must run signed-out (registration, the login screen's family
 *    lookup, recovery) or needs the service_role key (creating members) goes to
 *    the `auth` Edge Function via `callAuth` rather than straight to a table.
 *
 * Note that the family/visibility filtering below is no longer the only thing
 * protecting the data — the RLS policies in `schema.sql` enforce the same rules
 * in Postgres. It is kept because it costs nothing and keeps the two honest.
 */

import type { PostgrestError } from "@supabase/supabase-js";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import moment from "moment";
import { Platform } from "react-native";
import { DATE_FORMAT } from "../src/utils/deposits";
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
import type { BankInput, BankModel } from "../src/models/BankModel";
import type {
  ExpenseInput,
  ExpenseModel,
  ExpenseTypeInput,
  ExpenseTypeModel,
} from "../src/models/ExpenseModel";
import type { FixedDepositModel } from "../src/models/FixedDepositModel";
import type { LoginUserModel, UserRole } from "../src/models/LoginUserModel";
import type { FamilyInput, FamilyModel } from "../src/models/FamilyModel";
import { normalizeFamilyCode } from "../src/models/FamilyModel";
import type {
  Attachment,
  ModuleKey,
  Owned,
  Visibility,
} from "../src/models/common";
import { DEFAULT_VISIBILITY, canView, canEdit } from "../src/models/common";
import supabase, { callAuth } from "./client";

const FAMILIES = "families";
const FAMILY_SETTINGS = "family_settings";
const LOGIN_USERS = "login_users";
const BANKS = "banks";
const FIXED_DEPOSIT = "fixed_deposits";
const GOVERNMENT_DOCUMENTS = "government_documents";
const BANK_DOCUMENTS = "bank_documents";
const ORNAMENTS = "ornaments";
const PROPERTIES = "properties";
const LEDGER_CLIENTS = "ledger_clients";
const LEDGER_EARNINGS = "ledger_earnings";
const LEDGER_SAVINGS = "ledger_savings";
const EXPENSES = "expenses";
const EXPENSE_TYPES = "expense_types";

/** The Storage bucket holding every attachment, across all modules. */
const ATTACHMENT_BUCKET = "documents";

/**
 * How long a signed file URL stays good — short enough that a leaked link is
 * worthless by the time it travels anywhere.
 *
 * Not shorter, though: thumbnails are signed URLs too, and a form can sit open
 * on screen for a while. Under a minute, a re-render after the link aged out
 * would swap a loaded preview for a broken one.
 */
const ATTACHMENT_URL_TTL_SECONDS = 300;

/* ------------------------------------------------------------------ *
 * Postgres plumbing
 *
 * Supabase reports failures as a value on the response rather than by
 * rejecting. Every read/write funnels through `unwrap` so a database error
 * surfaces as a thrown Error — the shape the screens' try/catch and the Redux
 * thunks' error toasts already expect.
 * ------------------------------------------------------------------ */

const unwrap = <T,>(result: { data: T; error: PostgrestError | null }): T => {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data;
};

/**
 * Ids are minted here rather than by the database, mirroring the Firestore SDK
 * this replaces: a record's id has to be known before the insert, because it is
 * written into the row itself and handed straight back to the Redux cache. Same
 * alphabet and length as a Firestore doc id, from the platform CSPRNG.
 */
const ID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const newId = () =>
  Array.from(Crypto.getRandomBytes(20))
    .map((byte) => ID_ALPHABET[byte % ID_ALPHABET.length])
    .join("");

/* ------------------------------------------------------------------ *
 * Row <-> record mapping
 *
 * A row keeps the fields queries filter on as real columns and everything else
 * in `data`. The app above this file never sees that split: it hands over and
 * receives flat records, exactly as it did with Firestore documents.
 *
 * ## Why there is conversion here at all
 *
 * The app carries amounts as strings ("2500") and dates in its display format
 * ("17-Jul-2026", `DATE_FORMAT`). Neither can be queried: text dates sort
 * "01-Apr-2025" before "01-Aug-2024", and a text amount can't be summed. So the
 * four measured tables store `numeric` and `date` columns, and the translation
 * happens **only here**, at the boundary.
 *
 * That is deliberate. Screens, forms, DatePicker and the totals in `utils/`
 * keep working in the app's own formats and are untouched; the database gets
 * types it can index and aggregate. The display format never reaches Postgres.
 * ------------------------------------------------------------------ */

type ScopedRow = {
  id: string;
  family_id: string;
  owner_id: string;
  visibility: Visibility;
  data: Record<string, unknown>;
} & Record<string, unknown>;

/** How a promoted app field maps onto its column, and how to convert it. */
type Promoted = { column: string; kind: "number" | "date" | "boolean" | "text" };

/**
 * Per-table: app field name -> column. Anything not listed stays in `data`.
 * Only fields worth filtering, sorting or totalling are promoted — see the
 * rationale at the top of `schema.sql`. The other seven tables promote nothing
 * and so don't appear here at all.
 */
const PROMOTED: Record<string, Record<string, Promoted>> = {
  expenses: {
    amount: { column: "amount", kind: "number" },
    date: { column: "spent_on", kind: "date" },
    typeId: { column: "type_id", kind: "text" },
  },
  ledger_earnings: {
    amount: { column: "amount", kind: "number" },
    date: { column: "entry_date", kind: "date" },
    clientId: { column: "client_id", kind: "text" },
  },
  ledger_savings: {
    amount: { column: "amount", kind: "number" },
    date: { column: "entry_date", kind: "date" },
    clientId: { column: "client_id", kind: "text" },
  },
  fixed_deposits: {
    amount: { column: "amount", kind: "number" },
    bankId: { column: "bank_id", kind: "text" },
    depositedDate: { column: "deposited_on", kind: "date" },
    maturityDate: { column: "matures_on", kind: "date" },
    interest: { column: "interest", kind: "number" },
    interestPercentage: { column: "interest_percentage", kind: "number" },
  },
};

/** Postgres `date` in, app display format out. Empty/unparseable becomes "". */
const dateToApp = (value: unknown): string => {
  if (typeof value !== "string" || !value) return "";
  const parsed = moment(value, "YYYY-MM-DD", true);
  return parsed.isValid() ? parsed.format(DATE_FORMAT) : "";
};

/**
 * App display format in, Postgres `date` out. Anything unparseable becomes
 * null rather than throwing: the date columns are nullable precisely because
 * the forms allow a blank date, and a half-typed one must not fail the save.
 */
const dateToDb = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = moment(value.trim(), DATE_FORMAT, true);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
};

/** Postgres `numeric` comes back as a JS number; the app wants its string. */
const numberToApp = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

/**
 * The app's amount strings come from a numeric keyboard, but nothing stops a
 * web user typing "1,000" — and `Number("1,000")` is NaN. Returning null here
 * lets a NOT NULL column reject the save loudly, instead of the old behavior
 * where `Number(amount) || 0` quietly totalled it as zero.
 */
const numberToDb = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const toApp = (kind: Promoted["kind"], value: unknown) => {
  switch (kind) {
    case "date":
      return dateToApp(value);
    case "number":
      return numberToApp(value);
    case "boolean":
      return value ?? false;
    default:
      return value ?? "";
  }
};

const toDb = (kind: Promoted["kind"], value: unknown) => {
  switch (kind) {
    case "date":
      return dateToDb(value);
    case "number":
      return numberToDb(value);
    case "boolean":
      return value ?? false;
    default:
      return value ?? null;
  }
};

/** Rebuilds the flat record the app expects from columns + `data`. */
const toRecord = <T,>(tableName: string, row: ScopedRow): T => {
  const record: Record<string, unknown> = {
    ...row.data,
    id: row.id,
    familyId: row.family_id,
    ownerId: row.owner_id,
    visibility: row.visibility,
  };
  for (const [field, { column, kind }] of Object.entries(
    PROMOTED[tableName] ?? {}
  )) {
    record[field] = toApp(kind, row[column]);
  }
  return record as T;
};

/**
 * Splits a record into its columns and its `data` payload. The scope fields and
 * every promoted field live in columns, so they must not be duplicated in
 * `data` — a stale copy there would silently shadow the real column on read.
 */
const toRow = (tableName: string, input: Record<string, unknown>) => {
  const { id, familyId, ownerId, visibility, ...rest } = input;
  const promoted = PROMOTED[tableName] ?? {};
  const columns: Record<string, unknown> = {};

  for (const [field, { column, kind }] of Object.entries(promoted)) {
    columns[column] = toDb(kind, rest[field]);
    delete rest[field];
  }
  return { columns, data: rest };
};

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
const listScoped = async <T extends Owned>(
  tableName: string
): Promise<T[]> => {
  if (!activeScope) {
    return [];
  }
  const { familyId, userId } = activeScope;
  const rows = unwrap(
    await supabase.from(tableName).select("*").eq("family_id", familyId)
  ) as ScopedRow[];
  return rows
    .map((row) => toRecord<T>(tableName, row))
    .filter((record) => canView(record, userId));
};

/** The stored row for an id, or null when it doesn't exist. */
const findRow = async (
  tableName: string,
  id: string
): Promise<ScopedRow | null> =>
  unwrap(
    await supabase.from(tableName).select("*").eq("id", id).maybeSingle()
  ) as ScopedRow | null;

/**
 * Writes the whole record, so callers must pass every field they want to keep.
 * On create, the row is stamped with the active family and the creator as
 * owner; on edit, the original family and owner are preserved (a non-owner
 * editing a public record must not seize ownership), while a caller can still
 * change `visibility`. Passing no refId creates a new id.
 */
const saveScoped = async <T extends { visibility?: Visibility }>(
  tableName: string,
  input: T,
  refId?: string
): Promise<T & Owned & { id: string }> => {
  const scope = requireScope();
  const id = refId ?? newId();

  let ownerId = scope.userId;
  let familyId = scope.familyId;
  if (refId) {
    const existing = await findRow(tableName, refId);
    if (existing) {
      const data = toRecord<Partial<Owned>>(tableName, existing);
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
  const { columns, data } = toRow(tableName, { ...record });
  // upsert, not insert: saveScoped backs both add and edit, and an edit must
  // replace the stored row outright rather than fail on the existing id.
  unwrap(
    await supabase.from(tableName).upsert({
      id,
      family_id: familyId,
      owner_id: ownerId,
      visibility,
      ...columns,
      data,
    })
  );
  return record;
};

/**
 * Deletes a scoped record, but only for its owner. Public records stay
 * removable by their creator alone — another family member who can see one
 * still can't delete it.
 *
 * Any attachments go with it. That happens here rather than in each screen so
 * every module gets it for free and none can forget: the row is the only thing
 * that knows these paths, so deleting it without them would strand the objects
 * in the bucket permanently, with nothing left pointing at them.
 */
const deleteRecord = async (tableName: string, id: string) => {
  const scope = requireScope();
  const existing = await findRow(tableName, id);
  if (
    existing &&
    !canEdit(toRecord<Partial<Owned>>(tableName, existing), scope.userId)
  ) {
    throw new Error("You can only delete records you created.");
  }
  const attachments = (existing?.data?.attachments ?? []) as Attachment[];
  unwrap(await supabase.from(tableName).delete().eq("id", id));
  // After the row is gone, for the same reason as in the save path: a failed
  // delete must not have destroyed the files the surviving row still lists.
  await deleteAttachments(attachments.map((file) => file.path));
};

/* ------------------------------------------------------------------ *
 * Attachments
 *
 * The bytes go to the `documents` Storage bucket; the metadata this returns is
 * stored by the caller inside the owning record's `data.attachments` (see the
 * attachments section of `schema.sql` for why it lives there and not in a table
 * of its own).
 *
 * Uploads are deliberately NOT done when the user picks a file — the screens
 * call `uploadAttachment` as part of saving. Uploading on pick would leave a
 * paid-for object in the bucket every time someone opened a form, attached a
 * scan and then backed out, and nothing would ever collect it: the row that
 * would have named the path was never written. Staging the pick locally and
 * uploading on save means the only objects in the bucket are ones a live row
 * points at.
 * ------------------------------------------------------------------ */

/** A picked-but-not-yet-uploaded file, as the picker hands it over. */
export type StagedFile = {
  /** Local `file://` uri on native, `blob:` on web. */
  uri: string;
  name: string;
  mime: string;
  size: number;
};

/**
 * The picked file's bytes, by the only route that works on each platform.
 *
 * On web the uri is a blob: URL and `fetch` reads it natively. On native it is
 * a file: uri, which RN's `fetch` handles inconsistently (it has historically
 * returned a zero-length blob on Android), so the bytes are read through
 * expo-file-system instead — the same reason the Supabase RN guides read files
 * rather than fetching them.
 */
const readFileBytes = async (uri: string): Promise<Uint8Array> => {
  if (Platform.OS === "web") {
    return new Uint8Array(await (await fetch(uri)).arrayBuffer());
  }
  return new File(uri).bytes();
};

/** The extension for a path, from the file name, falling back to the mime. */
const fileExtension = (name: string, mime: string): string => {
  const fromName = name.includes(".") ? name.split(".").pop() : "";
  if (fromName && /^[a-zA-Z0-9]{1,5}$/.test(fromName)) {
    return fromName.toLowerCase();
  }
  return mime === "application/pdf" ? "pdf" : mime.split("/")[1] || "bin";
};

/**
 * Uploads one staged file and returns the metadata to store on the record.
 *
 * The object is named `{familyId}/{id}.{ext}` — never the user's file name. A
 * name like "../other-family/x.pdf" would otherwise decide where the object
 * landed, and the family folder is the tenant boundary the Storage policies key
 * off. The original name is kept in the metadata, for display only.
 */
export const uploadAttachment = async (
  file: StagedFile
): Promise<Attachment> => {
  const { familyId } = requireScope();
  const id = newId();
  const path = `${familyId}/${id}.${fileExtension(file.name, file.mime)}`;

  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, await readFileBytes(file.uri), { contentType: file.mime });

  if (error) {
    throw new Error(`Couldn't upload ${file.name}: ${error.message}`);
  }
  return {
    id,
    name: file.name,
    path,
    mime: file.mime,
    size: file.size,
    uploadedAt: moment().format("YYYY-MM-DD"),
  };
};

/**
 * Removes objects from the bucket. Called after the owning row is written, so a
 * failed save never destroys a file the record still lists.
 *
 * A failure here is swallowed on purpose: the row has already been saved and no
 * longer references these paths, so the user's intent is done. Surfacing "your
 * document was saved but a file couldn't be removed" would be an error they can
 * neither act on nor retry — the worst case is an orphaned object.
 */
export const deleteAttachments = async (paths: string[]): Promise<void> => {
  if (!paths.length) {
    return;
  }
  const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).remove(paths);
  if (error) {
    console.log("Couldn't remove attachment objects", error.message);
  }
};

/**
 * A temporary URL for viewing or downloading a file. The bucket is private, so
 * this is the only way to read one, and the link is useless once it expires —
 * which is why nothing caches these or stores them on a record.
 */
export const getAttachmentUrl = async (path: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(path, ATTACHMENT_URL_TTL_SECONDS);

  if (error || !data) {
    throw new Error(error?.message ?? "Couldn't open this file.");
  }
  return data.signedUrl;
};

/** Strips anything that isn't safe in a file name — the display name is
 * user-supplied and this one does reach the filesystem. */
const safeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "attachment";

/**
 * A local `file://` uri for a stored attachment, for handing to the OS share
 * sheet — which needs real bytes on disk, not a URL.
 *
 * On web there is nothing to download to: the signed URL *is* the shareable
 * thing, and the caller passes it to `navigator.share` or opens it.
 *
 * The copy is cached under the attachment's id and reused. That is safe because
 * an attachment is immutable — editing a record uploads a new file with a new
 * id rather than replacing one — so a cached copy can never go stale. It lives
 * in the cache directory, so the OS reclaims it whenever it needs the space.
 */
export const downloadAttachment = async (
  attachment: Attachment
): Promise<string> => {
  const url = await getAttachmentUrl(attachment.path);
  if (Platform.OS === "web") {
    return url;
  }
  // Nested under the id so the file keeps its real name in the share sheet —
  // "aadhaar-front.jpg" rather than the opaque id the bucket knows it by.
  const folder = new Directory(Paths.cache, "attachments", attachment.id);
  if (!folder.exists) {
    folder.create({ intermediates: true });
  }
  const cached = new File(folder, safeFileName(attachment.name));
  if (cached.exists) {
    return cached.uri;
  }
  return (await File.downloadFileAsync(url, cached, { idempotent: true })).uri;
};

/* ------------------------------------------------------------------ *
 * Families
 * ------------------------------------------------------------------ */

type FamilyRow = { id: string; code: string; data: Record<string, unknown> };

const toFamily = (row: FamilyRow): FamilyModel =>
  ({ ...row.data, code: row.code, id: row.id } as FamilyModel);

/**
 * True if no other family already uses this code (case/space-insensitive).
 * Registration runs this before anyone is signed in, so it goes through the
 * Edge Function; RLS would otherwise (correctly) show a signed-out caller no
 * families at all, and every code would look available.
 */
export const isFamilyCodeAvailable = async (code: string, exceptId?: string) =>
  (await callAuth<{ available: boolean }>("code-available", { code, exceptId }))
    .available;

/** Creates a family with an internal immutable id and a normalized code. */
export const createFamily = async (input: FamilyInput): Promise<FamilyModel> =>
  (
    await callAuth<{ family: FamilyModel }>("create-family", {
      name: input.name,
      code: input.code,
      createdAt: input.createdAt,
    })
  ).family;

/** Only ever the caller's own family — RLS sees to that. */
export const getFamilyById = async (id: string): Promise<FamilyModel | null> => {
  const row = unwrap(
    await supabase.from(FAMILIES).select("*").eq("id", id).maybeSingle()
  ) as FamilyRow | null;
  return row ? toFamily(row) : null;
};

/**
 * Resolves the Family ID typed on the login screen, before any session exists.
 * The Edge Function answers by exact code only and never lists families, which
 * is what keeps the handle from being enumerable.
 */
export const getFamilyByCode = async (code: string): Promise<FamilyModel | null> =>
  (await callAuth<{ family: FamilyModel | null }>("family-by-code", { code }))
    .family;

/** Admins can rename the family or change its handle without re-stamping rows. */
export const updateFamily = async (id: string, patch: Partial<FamilyInput>) => {
  const existing = unwrap(
    await supabase.from(FAMILIES).select("*").eq("id", id).maybeSingle()
  ) as FamilyRow | null;
  if (!existing) {
    throw new Error("Family not found.");
  }
  const { code, ...rest } = patch;
  // A patch touches only the keys it carries, so it is merged into the stored
  // row rather than replacing it.
  const next: Record<string, unknown> = { data: { ...existing.data, ...rest } };
  if (code != null) {
    next.code = normalizeFamilyCode(code);
  }
  unwrap(await supabase.from(FAMILIES).update(next).eq("id", id));
};

/* ------------------------------------------------------------------ *
 * Login users
 * ------------------------------------------------------------------ */

type LoginUserRow = {
  id: string;
  family_id: string;
  username: string;
  data: Record<string, unknown>;
};

const toLoginUser = (row: LoginUserRow): LoginUserModel =>
  ({
    ...row.data,
    id: row.id,
    familyId: row.family_id,
    username: row.username,
    role: (row.data.role ?? "member") as UserRole,
    moduleAccess: (row.data.moduleAccess ?? []) as ModuleKey[],
  } as LoginUserModel);

/**
 * Supabase Auth identifies users by email. HomeVault identifies them by
 * username within a family and has no email anywhere — so every member gets a
 * synthetic address derived from (familyId, username), which nobody ever sees
 * or types. Because it is derived rather than stored, the login screen can
 * build it from what the user typed without first looking the account up (a
 * lookup that would leak whether a username exists).
 *
 * MUST match `syntheticEmail` in `supabase/functions/auth/index.ts` exactly —
 * if the two ever disagree, logins fail. The local part is hashed because
 * usernames are free text and may contain characters an address can't hold.
 */
const syntheticEmail = async (familyId: string, username: string) => {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    username.trim()
  );
  return `${digest.slice(0, 40)}@${familyId.toLowerCase()}.homevault.internal`;
};

/**
 * Usernames are unique within a family (not globally), so two families can each
 * have their own "admin" or "dad". Login picks the family first, so the handle
 * only ever needs to be unique alongside its siblings.
 */
export const isUsernameAvailable = async (
  familyId: string,
  username: string,
  exceptId?: string
) =>
  (
    await callAuth<{ available: boolean }>("username-available", {
      familyId,
      username,
      exceptId,
    })
  ).available;

/**
 * Signs in and resolves the matching member. Returns null for bad credentials —
 * never rejects for those, so the login spinner can't hang and a wrong username
 * stays indistinguishable from a wrong password.
 *
 * On success the session is live on the shared client, which is what every
 * subsequent read depends on: until this resolves, RLS shows the app nothing.
 *
 * Credentials being right but the profile being unreadable is a *different*
 * failure and throws rather than returning null. It used to return null too,
 * which reported a working password as "username or password is incorrect" and
 * made a server-side problem look like user error — the one thing that turns a
 * five-minute diagnosis into an hour. Saying so out loud leaks nothing: the
 * caller has already proved the password, so this is not the credential oracle
 * the null path exists to protect.
 */
export const authenticate = async (
  familyId: string,
  username: string,
  password: string
): Promise<LoginUserModel | null> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: await syntheticEmail(familyId, username),
    password,
  });
  if (error || !data.user) {
    return null;
  }

  const { data: row, error: rowError } = await supabase
    .from(LOGIN_USERS)
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  // Either way the session is unusable, so don't leave one lying around.
  if (rowError) {
    await supabase.auth.signOut();
    throw new Error(
      `Signed in, but your profile couldn't be read: ${rowError.message}`
    );
  }
  if (!row) {
    await supabase.auth.signOut();
    // An empty result, not an error, is what RLS returns when it hides a row —
    // so this is either a missing `login_users` row or, far more often, the
    // `login_users_select` policy: it requires `family_id = jwt_family_id()`,
    // and `jwt_family_id()` reads `app_metadata.family_id` off the token. An
    // account whose `app_metadata` was never stamped by the auth Edge Function
    // authenticates perfectly and then cannot see itself.
    throw new Error(
      "Your password is correct, but this account has no readable profile in " +
        "this family. Its app_metadata.family_id claim is probably missing, so " +
        "the login_users row is hidden by RLS."
    );
  }
  return toLoginUser(row as LoginUserRow);
};

/**
 * Changes the signed-in member's own password.
 *
 * Self-service, so unlike `resetUserPassword` it needs no admin and no Edge
 * Function: Supabase Auth lets a live session update its own credentials, and
 * the service_role key is only required to act on *someone else's* account.
 *
 * The current password is verified first even though `updateUser` does not ask
 * for it. Sessions here are long-lived and survive restarts, so without this
 * check anyone holding an unlocked phone could lock the real owner out of the
 * family vault. Re-signing in is how we confirm it — the result is a session for
 * the same user, so nothing else is disturbed.
 */
export const changeOwnPassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const { familyId, userId } = requireScope();

  const row = unwrap(
    await supabase.from(LOGIN_USERS).select("*").eq("id", userId).maybeSingle()
  ) as LoginUserRow | null;
  if (!row) {
    throw new Error("Your account could not be found.");
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: await syntheticEmail(familyId, row.username),
    password: currentPassword,
  });
  if (signInError) {
    throw new Error("Your current password is incorrect.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw new Error(error.message);
  }
};

/** Ends the Supabase session. The app's own session lives in `AuthContext`. */
export const signOut = async () => {
  await supabase.auth.signOut();
};

/**
 * True if the storage session is still usable, refreshing it if it has merely
 * lapsed. `AuthContext` checks this on cold start: its own persisted session
 * and this one can fall out of step (a password reset elsewhere, or an absence
 * long enough for the refresh token to expire), and a stored login with no
 * session behind it would leave every screen mysteriously empty rather than
 * sending the user to log in.
 */
export const hasActiveSession = async () => {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
};

/**
 * "Forgot Family ID" recovery without email: given a username + password, find
 * every family where those credentials are valid. Runs in the Edge Function,
 * which confirms each candidate with a real sign-in attempt before returning
 * it, so it only ever discloses a family to someone who already has a working
 * account in it. Usually returns exactly one match.
 *
 * Note this does NOT sign the user in — the recovery screen still has the
 * password and calls `authenticate` once a family is chosen.
 */
export const findFamiliesForCredentials = async (
  username: string,
  password: string
): Promise<{ family: FamilyModel; user: LoginUserModel }[]> =>
  (
    await callAuth<{ matches: { family: FamilyModel; user: LoginUserModel }[] }>(
      "recover",
      { username, password }
    )
  ).matches;

export type CreateUserInput = {
  familyId: string;
  username: string;
  name?: string;
  role: UserRole;
  moduleAccess: ModuleKey[];
  password: string;
};

/**
 * Creates a member. Runs in the Edge Function because it needs the service_role
 * key: a client `signUp()` would replace the admin's own session with the new
 * member's, and only service_role may stamp the `app_metadata.family_id` claim
 * that every RLS policy trusts.
 */
export const createLoginUser = async (input: CreateUserInput): Promise<string> =>
  (await callAuth<{ userId: string }>("create-member", { ...input })).userId;

/** Profile/access edits only — never touches credentials. */
export const updateLoginUser = async (
  id: string,
  patch: Partial<Pick<LoginUserModel, "name" | "role" | "moduleAccess" | "username">>
) => {
  // Drop undefined values so a patch never blanks a field it didn't mention.
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined)
  );
  await callAuth("update-member", { userId: id, patch: clean });
};

export const resetUserPassword = async (id: string, password: string) => {
  await callAuth("reset-password", { userId: id, password });
};

// Member removal is an admin action authorized by role, not by record
// ownership — so it skips the owner check that guards the domain collections.
// The records the member owned deliberately outlive the account.
export const deleteLoginUser = async (id: string) => {
  await callAuth("delete-member", { userId: id });
};

/**
 * Every member of the active family, projected without credentials. Used by the
 * admin panel and the "person" pickers on documents and assets.
 */
export const getFamilyUsers = async (): Promise<LoginUserModel[]> => {
  const rows = unwrap(
    await supabase
      .from(LOGIN_USERS)
      .select("*")
      .eq("family_id", requireScope().familyId)
  ) as LoginUserRow[];
  // Credentials aren't a concern here: Supabase Auth owns them, and this table
  // has never held them.
  return rows.map(toLoginUser);
};

/** Kept name for the person pickers; identical to getFamilyUsers. */
export const getLoginUsers = getFamilyUsers;

/* ------------------------------------------------------------------ *
 * Domain collections (all scoped to the active family + visibility)
 * ------------------------------------------------------------------ */

export const getBanks = () => listScoped<BankModel>(BANKS);

export const addBank = (input: BankInput) => saveScoped(BANKS, input);

export const updateBank = (refId: string, input: BankInput) =>
  saveScoped(BANKS, input, refId);

export const deleteBank = (id: string) => deleteRecord(BANKS, id);

export const getFixedDeposit = () => listScoped<FixedDepositModel>(FIXED_DEPOSIT);

export type FixedDepositInput = {
  bankId: string;
  depositorName: string;
  amount: string;
  interest: string;
  interestPercentage: string;
  depositedDate: string;
  maturityDate: string;
  visibility?: Visibility;
};

export const addFixedDeposit = (input: FixedDepositInput) =>
  saveScoped(FIXED_DEPOSIT, input);

export const updateFixedDeposit = (refId: string, input: FixedDepositInput) =>
  saveScoped(FIXED_DEPOSIT, input, refId);

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

/** Payment entries live inside the property record, so this writes them too. */
export const updateProperty = (refId: string, input: PropertyInput) =>
  saveScoped(PROPERTIES, input, refId);

export const deleteProperty = (id: string) => deleteRecord(PROPERTIES, id);

/**
 * Metal rates are shared within a family — one rate so everyone's overview
 * agrees — but not across families. Stored per family under `family_settings`,
 * keyed by the family id.
 */
export const getMetalRates = async (): Promise<MetalRates> => {
  const row = unwrap(
    await supabase
      .from(FAMILY_SETTINGS)
      .select("data")
      .eq("id", requireScope().familyId)
      .maybeSingle()
  ) as { data: Record<string, unknown> } | null;
  return row
    ? ({ ...EMPTY_METAL_RATES, ...row.data } as MetalRates)
    : EMPTY_METAL_RATES;
};

export const saveMetalRates = async (rates: MetalRates) => {
  unwrap(
    await supabase
      .from(FAMILY_SETTINGS)
      .upsert({ id: requireScope().familyId, data: rates })
  );
};

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

/* ------------------------------------------------------------------ *
 * Expenses
 * ------------------------------------------------------------------ */

export const getExpenseTypes = () =>
  listScoped<ExpenseTypeModel>(EXPENSE_TYPES);

export const addExpenseType = (input: ExpenseTypeInput) =>
  saveScoped(EXPENSE_TYPES, input);

export const updateExpenseType = (refId: string, input: ExpenseTypeInput) =>
  saveScoped(EXPENSE_TYPES, input, refId);

export const deleteExpenseType = (id: string) =>
  deleteRecord(EXPENSE_TYPES, id);

export const getExpenses = () => listScoped<ExpenseModel>(EXPENSES);

export const addExpense = (input: ExpenseInput) => saveScoped(EXPENSES, input);

export const updateExpense = (refId: string, input: ExpenseInput) =>
  saveScoped(EXPENSES, input, refId);

export const deleteExpense = (id: string) => deleteRecord(EXPENSES, id);
