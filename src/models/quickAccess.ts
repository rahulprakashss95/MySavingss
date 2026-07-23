import { Ionicons } from "@expo/vector-icons";

import { ThemeColors } from "../utils/Color";
import {
  AccessScope,
  FeatureKey,
  ModuleKey,
  canSeeModule,
  hasFeature,
} from "./common";

/**
 * The catalogue of shortcuts the Home dashboard's Quick access row can show.
 *
 * The unit here is an *action*, not a module: "Add earning" is worth a chip in a
 * way that "Ledger" — already a bottom tab — is not. Every add form in the app
 * is reachable at `<list route>/new` with no parameters (the forms default any
 * preset they accept, e.g. the account type falls back to `ACCOUNT_TYPES[0]`),
 * so a shortcut is just an href and the tile that gates it.
 *
 * Adding an entry here is all a new shortcut needs — Home and the picker in
 * Settings both read this list.
 */

type IconName = keyof typeof Ionicons.glyphMap;

/** What a member must hold for a shortcut to be usable. */
type Gate =
  | { kind: "feature"; feature: FeatureKey }
  | { kind: "module"; module: ModuleKey }
  | { kind: "admin" };

export type QuickAccessItem = {
  /** Stable across releases: it is what gets persisted. Never reuse an id. */
  id: string;
  label: string;
  icon: IconName;
  accent: keyof ThemeColors;
  href: string;
  gate: Gate;
  /** Heading it sits under in the picker. */
  group: string;
};

export const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  // ---- Modules: the coarse chips, and what a fresh install still shows -----
  {
    id: "documents",
    label: "Documents",
    icon: "document-text-outline",
    accent: "accentViolet",
    href: "/documents",
    gate: { kind: "module", module: "documents" },
    group: "Modules",
  },
  {
    id: "assets",
    label: "Assets",
    icon: "cube-outline",
    accent: "accentAmber",
    href: "/assets",
    gate: { kind: "module", module: "assets" },
    group: "Modules",
  },
  {
    id: "ledger",
    label: "Ledger",
    icon: "book-outline",
    accent: "accentBlue",
    href: "/ledger",
    gate: { kind: "module", module: "ledger" },
    group: "Modules",
  },
  {
    id: "admin",
    label: "Admin",
    icon: "shield-outline",
    accent: "accentViolet",
    href: "/admin",
    gate: { kind: "admin" },
    group: "Modules",
  },

  // ---- Documents ----------------------------------------------------------
  {
    id: "add-government-id",
    label: "Add ID",
    icon: "id-card-outline",
    accent: "accentViolet",
    href: "/documents/government/new",
    gate: { kind: "feature", feature: "governmentDocuments" },
    group: "Documents",
  },
  {
    id: "add-bank-document",
    label: "Add bank",
    icon: "business-outline",
    accent: "accentViolet",
    href: "/documents/bank-accounts/new",
    gate: { kind: "feature", feature: "bankDocuments" },
    group: "Documents",
  },

  // ---- Assets -------------------------------------------------------------
  {
    id: "open-accounts",
    label: "Cash & Deposits",
    icon: "card-outline",
    accent: "accentBlue",
    href: "/assets/accounts",
    gate: { kind: "feature", feature: "accounts" },
    group: "Assets",
  },
  {
    id: "add-account",
    label: "Add holding",
    icon: "add-circle-outline",
    accent: "accentBlue",
    href: "/assets/accounts/new",
    gate: { kind: "feature", feature: "accounts" },
    group: "Assets",
  },
  {
    id: "add-ornament",
    label: "Add ornament",
    icon: "diamond-outline",
    accent: "accentAmber",
    href: "/assets/ornaments/new",
    gate: { kind: "feature", feature: "ornaments" },
    group: "Assets",
  },
  {
    id: "add-property",
    label: "Add property",
    icon: "home-outline",
    accent: "accentViolet",
    href: "/assets/properties/new",
    gate: { kind: "feature", feature: "properties" },
    group: "Assets",
  },
  {
    id: "add-vehicle",
    label: "Add vehicle",
    icon: "car-outline",
    accent: "accentBlue",
    href: "/assets/vehicles/new",
    gate: { kind: "feature", feature: "vehicles" },
    group: "Assets",
  },

  // ---- Ledger -------------------------------------------------------------
  {
    id: "add-earning",
    label: "Add earning",
    icon: "trending-up-outline",
    accent: "positive",
    href: "/ledger/earnings/new",
    gate: { kind: "feature", feature: "earnings" },
    group: "Ledger",
  },
  {
    id: "add-expense",
    label: "Add expense",
    icon: "trending-down-outline",
    accent: "negative",
    href: "/ledger/expenses/new",
    gate: { kind: "feature", feature: "expenses" },
    group: "Ledger",
  },
  {
    id: "add-saving",
    label: "Add saving",
    icon: "wallet-outline",
    accent: "positive",
    href: "/ledger/savings/new",
    gate: { kind: "feature", feature: "savings" },
    group: "Ledger",
  },
  {
    id: "open-earnings",
    label: "Earnings",
    icon: "list-outline",
    accent: "positive",
    href: "/ledger/earnings",
    gate: { kind: "feature", feature: "earnings" },
    group: "Ledger",
  },
  {
    id: "open-expenses",
    label: "Expenses",
    icon: "receipt-outline",
    accent: "negative",
    href: "/ledger/expenses",
    gate: { kind: "feature", feature: "expenses" },
    group: "Ledger",
  },
  {
    id: "add-client",
    label: "Add client",
    icon: "person-add-outline",
    accent: "accentBlue",
    href: "/ledger/clients/new",
    gate: { kind: "feature", feature: "setup" },
    group: "Ledger",
  },
];

/**
 * What a member sees before they customise anything: the three entries they
 * make over and over. The module chips are deliberately not here — they
 * duplicate the bottom tabs, which is what made the row worth replacing.
 * Everything else is one tap away in Settings → Customise dashboard.
 */
export const DEFAULT_QUICK_ACCESS: string[] = [
  "add-expense",
  "add-earning",
  "add-saving",
];

/**
 * Shown instead when a member holds none of the tiles the defaults need — a
 * documents-only member would otherwise land on an empty Quick access row. Only
 * ever consulted for an untouched selection: someone who empties the row on
 * purpose gets the empty row they asked for.
 */
const FALLBACK_QUICK_ACCESS: string[] = [
  "documents",
  "assets",
  "ledger",
  "admin",
];

/**
 * The chips wrap at four to a row on a phone. Past two rows the section stops
 * being a glance and becomes a menu, which the modules already are.
 */
export const MAX_QUICK_ACCESS = 8;

const BY_ID = new Map(QUICK_ACCESS_ITEMS.map((item) => [item.id, item]));

export const quickAccessItem = (id: string): QuickAccessItem | undefined =>
  BY_ID.get(id);

/** True if `user` may open the shortcut's destination. */
export const canUseQuickAccess = (
  user: AccessScope,
  item: QuickAccessItem
): boolean => {
  switch (item.gate.kind) {
    case "admin":
      return user?.role === "admin";
    case "module":
      return canSeeModule(user, item.gate.module);
    case "feature":
      return hasFeature(user, item.gate.feature);
  }
};

/**
 * Makes a stored selection safe to render: unknown ids (a shortcut retired in a
 * later release) are dropped, duplicates collapse, and the cap is enforced.
 *
 * Unlike the section order, a customised selection is never topped up with new
 * catalogue entries. A section missing from the dashboard is a bug; a shortcut
 * the member didn't pick is just a shortcut they didn't pick, and silently
 * adding chips to a row someone curated would undo their choice on every
 * release. `null` — nothing stored — is what means "show the defaults".
 */
export const normalizeQuickAccess = (stored: unknown): string[] | null => {
  if (!Array.isArray(stored)) return null;
  const ids: string[] = [];
  stored.forEach((id) => {
    if (typeof id === "string" && BY_ID.has(id) && !ids.includes(id)) {
      ids.push(id);
    }
  });
  return ids.slice(0, MAX_QUICK_ACCESS);
};

/**
 * The shortcuts to actually draw: the member's selection (or the defaults),
 * resolved to items and filtered by access.
 *
 * Access is applied here rather than when the selection is saved, so a tile
 * that is revoked and granted again brings its shortcut back instead of having
 * quietly deleted it.
 */
export const resolveQuickAccess = (
  selection: string[] | null,
  user: AccessScope
): QuickAccessItem[] => {
  const usable = (ids: string[]) =>
    ids
      .map((id) => BY_ID.get(id))
      .filter((item): item is QuickAccessItem => !!item)
      .filter((item) => canUseQuickAccess(user, item));

  if (selection) return usable(selection);
  const defaults = usable(DEFAULT_QUICK_ACCESS);
  return defaults.length > 0 ? defaults : usable(FALLBACK_QUICK_ACCESS);
};
