import { SessionUser } from "../context/AuthContext";
import { groupBy, Section } from "./grouping";

type OwnerOwned = { ownerId: string };

const UNASSIGNED = "Unassigned";

/**
 * One section per owning member, alphabetical — except the signed-in user, who
 * is hoisted to the top so their own records are the first thing they see. The
 * section title is the owner's name resolved from `ownerId` via `nameOf` (see
 * `useOwnerName`); there is no stored person field to group on.
 */
export const groupByOwner = <T extends OwnerOwned>(
  items: T[],
  user: SessionUser | null,
  nameOf: (ownerId: string) => string
): Section<T>[] =>
  groupBy(
    items,
    (item) => item.ownerId || "",
    (item) => nameOf(item.ownerId) || UNASSIGNED
  ).sort((a, b) => {
    if (user?.id) {
      if (a.key === user.id) return -1;
      if (b.key === user.id) return 1;
    }
    return a.title.localeCompare(b.title);
  });

/**
 * Government IDs and account numbers are the kind of thing people read aloud
 * off the screen, so group them for legibility: 1234 5678 9012.
 */
export const groupDigits = (value: string) =>
  value.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
