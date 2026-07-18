/**
 * A registered family — the tenant boundary of the whole app. `id` is the
 * internal, immutable row id that every record references as
 * `familyId`; `code` is the human-facing unique handle the admin can edit, and
 * `name` is the display name shown as "Welcome to HomeVault, <name>".
 *
 * Keeping `id` and `code` separate means renaming the family or changing its
 * handle never has to re-stamp every record.
 */
export type FamilyModel = {
  id: string;
  /** Editable, unique across all families. Lowercase slug, e.g. "rahul_family". */
  code: string;
  /** Editable display name, e.g. "Rahul's Family". */
  name: string;
  /** ISO timestamp. */
  createdAt: string;
};

export type FamilyInput = Omit<FamilyModel, "id">;

/** Family codes are lowercase, trimmed, spaces to underscores. */
export const normalizeFamilyCode = (raw: string) =>
  raw.trim().toLowerCase().replace(/\s+/g, "_");
