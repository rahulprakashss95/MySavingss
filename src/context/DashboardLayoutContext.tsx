import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { normalizeQuickAccess } from "../models/quickAccess";

/** Every rearrangeable block on the Home dashboard. */
export const DASHBOARD_SECTIONS = [
  "attention",
  "month",
  "worth",
  "quick",
] as const;

export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number];

/**
 * What a new install sees: what needs doing first, then how the month is going,
 * then the slower-moving worth total, then the shortcuts.
 */
export const DEFAULT_DASHBOARD_ORDER: DashboardSection[] = [
  "attention",
  "month",
  "worth",
  "quick",
];

const STORAGE_KEY = "@homevault/dashboard-order";
const QUICK_STORAGE_KEY = "@homevault/dashboard-quick";

const isSection = (value: unknown): value is DashboardSection =>
  DASHBOARD_SECTIONS.includes(value as DashboardSection);

/**
 * Makes a stored order safe to use as the section list changes between
 * releases: anything unrecognised is dropped, duplicates collapse, and sections
 * the stored order predates are appended rather than silently missing. A
 * released build must never render a dashboard with a section it can't show, or
 * lose one it can.
 */
export const normalizeOrder = (stored: unknown): DashboardSection[] => {
  const order: DashboardSection[] = [];
  if (Array.isArray(stored)) {
    stored.forEach((key) => {
      if (isSection(key) && !order.includes(key)) order.push(key);
    });
  }
  // New sections join at the end, so a customised order survives the upgrade
  // intact instead of being reshuffled around the newcomer.
  DEFAULT_DASHBOARD_ORDER.forEach((key) => {
    if (!order.includes(key)) order.push(key);
  });
  return order;
};

const persist = (order: DashboardSection[]) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(order)).catch((error) => {
    console.log("Unable to persist dashboard order", error);
  });
};

/** `null` clears the selection, putting the row back on the defaults. */
const persistQuick = (quick: string[] | null) => {
  const write =
    quick === null
      ? AsyncStorage.removeItem(QUICK_STORAGE_KEY)
      : AsyncStorage.setItem(QUICK_STORAGE_KEY, JSON.stringify(quick));
  write.catch((error) => {
    console.log("Unable to persist quick access shortcuts", error);
  });
};

type DashboardLayoutStore = {
  order: DashboardSection[];
  /**
   * The chosen Quick access shortcut ids, in the order they are drawn. `null`
   * means the member has never touched the row, so it follows
   * `DEFAULT_QUICK_ACCESS` — including any shortcut a later release adds to the
   * defaults. Once they customise it, it is theirs and stops being topped up.
   */
  quick: string[] | null;
  /** True until the stored layout has been read from storage. */
  isRestoring: boolean;
  /** Swaps a section with its neighbour. A no-op at the ends. */
  move: (key: DashboardSection, direction: -1 | 1) => void;
  reset: () => void;
  /**
   * Replaces the whole selection. Callers pass the list as the member sees it,
   * because what "the current shortcuts" are depends on their access — an
   * untouched selection resolves through defaults and a fallback — and only
   * `resolveQuickAccess` knows that. The store would have to guess.
   *
   * A consequence worth stating: a shortcut whose tile was revoked isn't in the
   * list the member sees, so an explicit edit drops it. That's intended:
   * render-time filtering already protects the passive case — nothing is lost
   * unless the member actually edits — and committing what they were looking at
   * beats silently preserving a chip they had no way to know was there.
   */
  setQuick: (ids: string[]) => void;
  /** Back to the default shortcuts. */
  resetQuick: () => void;
  /** Rehydrate the persisted layout once at cold start. */
  restore: () => Promise<void>;
};

/**
 * The order of the Home dashboard's sections, persisted to AsyncStorage.
 * Follows the same shape as the theme store: written through immediately so the
 * UI never waits on storage, and rehydrated once from `bootstrapApp`.
 */
export const useDashboardLayoutStore = create<DashboardLayoutStore>(
  (set, get) => ({
    order: [...DEFAULT_DASHBOARD_ORDER],
    quick: null,
    isRestoring: true,
    move: (key, direction) => {
      const order = [...get().order];
      const from = order.indexOf(key);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= order.length) return;
      [order[from], order[to]] = [order[to], order[from]];
      set({ order });
      persist(order);
    },
    reset: () => {
      const order = [...DEFAULT_DASHBOARD_ORDER];
      set({ order });
      persist(order);
    },
    setQuick: (ids) => {
      // The screen builds this list, so the same hardening that guards a value
      // read back from storage applies: unknown ids out, duplicates collapsed,
      // cap enforced.
      const quick = normalizeQuickAccess(ids) ?? [];
      set({ quick });
      persistQuick(quick);
    },
    resetQuick: () => {
      set({ quick: null });
      persistQuick(null);
    },
    restore: async () => {
      try {
        // The splash waits on this, so a wedged storage read must not blank the
        // screen forever — fall back to the defaults after 3s.
        const [stored, storedQuick] = await Promise.race([
          Promise.all([
            AsyncStorage.getItem(STORAGE_KEY),
            AsyncStorage.getItem(QUICK_STORAGE_KEY),
          ]),
          new Promise<[null, null]>((resolve) =>
            setTimeout(() => resolve([null, null]), 3000)
          ),
        ]);
        if (stored) set({ order: normalizeOrder(JSON.parse(stored)) });
        if (storedQuick)
          set({ quick: normalizeQuickAccess(JSON.parse(storedQuick)) });
      } catch (error) {
        console.log("Unable to restore dashboard layout", error);
      } finally {
        set({ isRestoring: false });
      }
    },
  })
);
