/**
 * Cross-cutting types for the multi-family model. Every domain record is scoped
 * to one family and owned by the login user who created it, and carries a
 * visibility that decides who else in the family can see it.
 */

/** The modules a family member can be granted access to, in menu order. */
export const MODULE_KEYS = [
  "deposits",
  "documents",
  "assets",
  "ledger",
  "expenses",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

/** Human labels for the module keys, for the admin panel and gating UI. */
export const MODULE_LABELS: Record<ModuleKey, string> = {
  deposits: "Deposits",
  documents: "Documents",
  assets: "Assets",
  ledger: "Ledger",
  expenses: "Expenses",
};

/**
 * Private: only the creator sees it. Public: everyone in the family sees it.
 * New records default to private — the safe default for financial data.
 */
export type Visibility = "private" | "public";

export const DEFAULT_VISIBILITY: Visibility = "private";

/**
 * A file hanging off a record — a scan of an ID, a photo of a jewellery bill, a
 * property deed. The bytes live in the `documents` Storage bucket; this is the
 * metadata, and it is stored in the owning record's `data.attachments` array
 * rather than in a table of its own, so an attachment is exactly as visible as
 * the record it belongs to. See the attachments section of `schema.sql`.
 */
export type Attachment = {
  /** Also the file's name in the bucket, minus the extension. */
  id: string;
  /** The name as the user picked it, for display only. Never used as a path. */
  name: string;
  /** Full object path: `{familyId}/{id}.{ext}`. The one field reads need. */
  path: string;
  mime: string;
  /** Bytes, for the size hint under the file name. */
  size: number;
  /** ISO date. Display-only, so unlike the measured tables this stays a string. */
  uploadedAt: string;
};

/** Mixed into any record that can carry files. */
export type Attachable = {
  attachments: Attachment[];
};

/** The file types the picker offers and the bucket accepts — keep in step with
 * `allowed_mime_types` in `schema.sql`. */
export const ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

/** Mirrors the bucket's `file_size_limit`, so the form can reject an oversized
 * file with a readable message instead of letting the upload fail. */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Files per record. A government ID needs a front and a back and nothing more,
 * which is the shape of every module here — a deed, a bill, a passbook.
 *
 * Only the form enforces this. Postgres could (a jsonb length check on `data`),
 * but the cap is a product decision that will move, and a row written under an
 * older, laxer limit must stay readable rather than fail every later save.
 */
export const ATTACHMENT_MAX_PER_RECORD = 2;

export const isImageAttachment = (attachment: { mime: string }): boolean =>
  attachment.mime.startsWith("image/");

/** "184 KB" / "1.4 MB", for the row under a file name. */
export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Stamped on every record so reads can be filtered to one family. */
export type FamilyScoped = {
  /** `families` doc id. Immutable once written. */
  familyId: string;
};

/**
 * Ownership + visibility, shared by every domain record. `ownerId` is the
 * `loginUsers` doc id of whoever created the record and is the single source of
 * truth for "who can see a private record" — replacing the older per-module
 * ownership heuristics (fuzzy `depositorName`, `loginUserId`, `personId`).
 */
export type Owned = FamilyScoped & {
  ownerId: string;
  visibility: Visibility;
};

/**
 * The shape a create/edit screen supplies: everything except the id and the
 * scope fields the data layer stamps automatically (`familyId`, `ownerId`).
 * `visibility` stays — the user picks it via the private/public toggle.
 */
export type Creatable<T extends Owned & { id: string }> = Omit<
  T,
  "id" | "familyId" | "ownerId" | "visibility"
> & { visibility?: Visibility };

/**
 * True if `user` may see `record`: the whole family sees public records, and
 * only the creator sees private ones. Records written before this model existed
 * (no visibility) are treated as private so nothing leaks by default.
 */
export const canView = (
  record: Partial<Owned>,
  userId: string | undefined
): boolean => {
  if (record.visibility === "public") {
    return true;
  }
  return !!userId && record.ownerId === userId;
};

/**
 * True if `user` may modify or delete `record`. Only the creator can: a public
 * record is visible to the whole family (see `canView`) but stays editable by
 * its owner alone, so one member can't change or remove another's data.
 */
export const canEdit = (
  record: Partial<Owned>,
  userId: string | undefined
): boolean => !!userId && record.ownerId === userId;
