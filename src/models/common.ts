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
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

/** Human labels for the module keys, for the admin panel and gating UI. */
export const MODULE_LABELS: Record<ModuleKey, string> = {
  deposits: "Deposits",
  documents: "Documents",
  assets: "Assets",
  ledger: "Ledger",
};

/**
 * Private: only the creator sees it. Public: everyone in the family sees it.
 * New records default to private — the safe default for financial data.
 */
export type Visibility = "private" | "public";

export const DEFAULT_VISIBILITY: Visibility = "private";

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
