import { SessionUser } from "../context/AuthContext";
import { groupBy, Section } from "./grouping";

type PersonOwned = { personId: string; personName: string };

const UNASSIGNED = "Unassigned";

/**
 * One section per person, alphabetical — except the signed-in user, who is
 * hoisted to the top so their own documents are the first thing they see.
 */
export const groupByPerson = <T extends PersonOwned>(
  documents: T[],
  user: SessionUser | null
): Section<T>[] =>
  groupBy(
    documents,
    (document) => document.personId || "",
    (document) => document.personName || UNASSIGNED
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
