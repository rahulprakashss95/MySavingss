/**
 * Cross-cutting types for the multi-family model. Every domain record is scoped
 * to one family and owned by the login user who created it, and carries a
 * visibility that decides who else in the family can see it.
 */

/**
 * Access is tile-wise. Each module is a bottom-tab that groups a set of feature
 * tiles; a member is granted individual tiles, not whole modules. The rules
 * that fall out of that:
 *
 *  - a member sees a module's tab when they hold at least one of its tiles;
 *  - each landing tile — and each Overview section — gates on its own feature
 *    key (`hasFeature`); Overview is never its own key, it just reflects the
 *    tiles you can see;
 *  - admins implicitly hold every feature.
 *
 * `moduleAccess` on a member stores leaf `FeatureKey`s. Early builds stored the
 * coarse module keys instead ("deposits", "expenses", …); `normalizeAccess`
 * expands those to features at read time, so old rows keep working with no data
 * migration. Adding a tile here and to the relevant landing screen is all a new
 * feature needs — the admin panel and gating pick it up from this registry.
 */
export const MODULES = [
  {
    key: "documents",
    label: "Documents",
    features: [
      { key: "governmentDocuments", label: "Government IDs" },
      { key: "bankDocuments", label: "Bank Accounts" },
    ],
  },
  {
    key: "assets",
    label: "Assets",
    features: [
      { key: "ornaments", label: "Ornaments" },
      { key: "properties", label: "Properties" },
      { key: "vehicles", label: "Vehicles" },
      { key: "accounts", label: "Cash & Deposits" },
    ],
  },
  {
    key: "ledger",
    label: "Ledger",
    features: [
      { key: "earnings", label: "Earnings" },
      { key: "savings", label: "Savings" },
      { key: "expenses", label: "Expenses" },
      { key: "setup", label: "Setup" },
    ],
  },
] as const;

/** A bottom-tab module — the group an admin ticks to grant all its tiles. */
export type ModuleKey = (typeof MODULES)[number]["key"];

/** A single tile within a module — the unit access is actually granted at. */
export type FeatureKey =
  (typeof MODULES)[number]["features"][number]["key"];

/** Every feature key, in menu order — the canonical order access is stored in. */
export const ALL_FEATURE_KEYS: FeatureKey[] = MODULES.flatMap((m) =>
  m.features.map((f) => f.key)
);

export const MODULE_LABELS: Record<ModuleKey, string> = Object.fromEntries(
  MODULES.map((m) => [m.key, m.label])
) as Record<ModuleKey, string>;

export const FEATURE_LABELS: Record<FeatureKey, string> = Object.fromEntries(
  MODULES.flatMap((m) => m.features.map((f) => [f.key, f.label]))
) as Record<FeatureKey, string>;

/** The tiles that belong to a module. */
export const featuresForModule = (moduleKey: ModuleKey): FeatureKey[] =>
  (MODULES.find((m) => m.key === moduleKey)?.features ?? []).map((f) => f.key);

/**
 * Legacy coarse module keys → the features they now stand for. "assets" used to
 * cover only ornaments/properties/vehicles and "deposits" was its own module,
 * so a member who had both keys still ends up with the whole (new) Assets tab;
 * likewise "ledger" + "expenses" → the whole Ledger tab.
 */
const LEGACY_MODULE_FEATURES: Record<string, FeatureKey[]> = {
  documents: ["governmentDocuments", "bankDocuments"],
  deposits: ["accounts"],
  assets: ["ornaments", "properties", "vehicles"],
  ledger: ["earnings", "savings", "setup"],
  expenses: ["expenses"],
};

/**
 * Renamed leaf keys → their current name, so a member granted the old key keeps
 * the access. "clients" became the "setup" tile (which manages clients, earning
 * types and expense types).
 */
const FEATURE_ALIASES: Record<string, FeatureKey> = {
  clients: "setup",
};

/**
 * Normalizes a stored `moduleAccess` array to leaf feature keys: leaf keys pass
 * through, legacy module keys expand to their features, unknown keys are
 * dropped. Result is deduped and returned in canonical menu order.
 */
export const normalizeAccess = (
  access: readonly string[] | undefined
): FeatureKey[] => {
  if (!access?.length) return [];
  const leaf = new Set<string>(ALL_FEATURE_KEYS);
  const granted = new Set<FeatureKey>();
  for (const key of access) {
    if (leaf.has(key)) {
      granted.add(key as FeatureKey);
    } else if (FEATURE_ALIASES[key]) {
      granted.add(FEATURE_ALIASES[key]);
    } else {
      LEGACY_MODULE_FEATURES[key]?.forEach((f) => granted.add(f));
    }
  }
  return ALL_FEATURE_KEYS.filter((k) => granted.has(k));
};

/** The access-bearing fields of a session/login user, for the helpers below. */
export type AccessScope = {
  role?: string;
  moduleAccess?: readonly string[];
} | null | undefined;

/** True if `user` may open a single tile. Admins hold everything. */
export const hasFeature = (user: AccessScope, feature: FeatureKey): boolean => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return normalizeAccess(user.moduleAccess).includes(feature);
};

/** True if `user` may see a module's tab — i.e. holds any tile inside it. */
export const canSeeModule = (user: AccessScope, moduleKey: ModuleKey): boolean => {
  if (!user) return false;
  if (user.role === "admin") return true;
  const granted = new Set(normalizeAccess(user.moduleAccess));
  return featuresForModule(moduleKey).some((f) => granted.has(f));
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

/**
 * A member's profile picture. Only the object path is stored — the file lives
 * in the public `avatars` bucket, so its display URL is derived from the path
 * (no signed URL to mint or expire). Absent means "show initials".
 */
export type Avatar = {
  /** Object path in the `avatars` bucket: `{userId}/{id}.{ext}`. */
  path: string;
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

const MB = 1024 * 1024;

/**
 * Per-module upload size caps, in bytes.
 *
 * This is the single place to change how large a file a module accepts: edit a
 * line here and the picker's pre-flight check (and the "file too large" message
 * it shows) follow for that module, with nothing else to touch. `profilePicture`
 * is here too so every upload in the app is capped from one table.
 *
 * The Storage buckets also enforce a `file_size_limit` of their own in
 * schema.sql — that is the real backstop, since the picker is client code. Keep
 * the largest value a bucket can receive in step with its limit there: the
 * `documents` bucket must be at least the largest module below, and the
 * `avatars` bucket at least `profilePicture`.
 */
export const UPLOAD_MAX_BYTES = {
  governmentDocuments: 2 * MB,
  bankDocuments: 2 * MB,
  vehicles: 2 * MB,
  ornaments: 2 * MB,
  properties: 2 * MB,
  fixedDeposits: 2 * MB,
  profilePicture: 2 * MB,
} as const;

export type UploadModule = keyof typeof UPLOAD_MAX_BYTES;

/** Cap applied when a caller names no module. */
export const DEFAULT_UPLOAD_MAX_BYTES = 2 * MB;

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
