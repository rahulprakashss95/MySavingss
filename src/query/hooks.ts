import { useCallback } from "react";
import {
  QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getBankDocuments,
  getBanks,
  getEarnings,
  getAccounts,
  getEarningTypes,
  getExpenses,
  getExpenseTypes,
  getGameScores,
  getGovernmentDocuments,
  getLedgerClients,
  getLoginUsers,
  getMetalRates,
  getOrnaments,
  getProperties,
  getSavings,
  getVehicles,
} from "../../database/query";
import { displayNameOf, LoginUserModel } from "../models/LoginUserModel";
import { MetalRates } from "../models/AssetModel";

/**
 * The domain collections we cache. Each maps 1:1 to a database table and to a
 * `getX` fetcher in `database/query.ts` (see `REGISTRY`). `metalRates` is a
 * single row, not a list, so it has its own query below.
 */
export type CollectionName =
  | "banks"
  | "accounts"
  | "ornaments"
  | "properties"
  | "vehicles"
  | "bankDocuments"
  | "governmentDocuments"
  | "ledgerClients"
  | "earnings"
  | "earningTypes"
  | "savings"
  | "expenses"
  | "expenseTypes"
  // The family leaderboard: one best-score row per (member, game).
  | "gameScores"
  // The family roster. Not a domain record type, but cached the same way so
  // lists/overviews can resolve a record's owner name from its `ownerId`.
  | "members";

/** Every cached record is keyed by its row id. */
export type Identified = { id: string };

/** Namespaced query keys, so `queryClient.clear()` (sign-out) drops them all. */
const collectionKey = (name: CollectionName) => ["collections", name] as const;
const METAL_RATES_KEY = ["metalRates"] as const;

/** Maps each cached collection to its fetcher and its error copy. */
const REGISTRY: Record<
  CollectionName,
  { fetch: () => Promise<Identified[]>; errorTitle: string }
> = {
  banks: { fetch: getBanks, errorTitle: "Unable to load banks" },
  accounts: { fetch: getAccounts, errorTitle: "Unable to load accounts" },
  ornaments: { fetch: getOrnaments, errorTitle: "Unable to load ornaments" },
  properties: { fetch: getProperties, errorTitle: "Unable to load properties" },
  vehicles: { fetch: getVehicles, errorTitle: "Unable to load vehicles" },
  bankDocuments: { fetch: getBankDocuments, errorTitle: "Unable to load accounts" },
  governmentDocuments: {
    fetch: getGovernmentDocuments,
    errorTitle: "Unable to load documents",
  },
  ledgerClients: { fetch: getLedgerClients, errorTitle: "Unable to load clients" },
  earnings: { fetch: getEarnings, errorTitle: "Unable to load earnings" },
  earningTypes: {
    fetch: getEarningTypes,
    errorTitle: "Unable to load earning types",
  },
  savings: { fetch: getSavings, errorTitle: "Unable to load savings" },
  expenses: { fetch: getExpenses, errorTitle: "Unable to load expenses" },
  expenseTypes: {
    fetch: getExpenseTypes,
    errorTitle: "Unable to load expense types",
  },
  gameScores: { fetch: getGameScores, errorTitle: "Unable to load leaderboard" },
  members: { fetch: getLoginUsers, errorTitle: "Unable to load members" },
};

/**
 * Reads a cached collection, fetching it once on first use. Returns the same
 * `{ items, hasLoaded, isRefreshing, onRefresh }` shape the old Redux-backed
 * hook did, so screens didn't have to change. React Query dedupes the fetch
 * across every screen sharing the key and keeps it cached for the session.
 */
export const useCollectionState = <T extends Identified>(
  name: CollectionName
) => {
  const query = useQuery({
    queryKey: collectionKey(name),
    queryFn: REGISTRY[name].fetch,
    meta: { errorTitle: REGISTRY[name].errorTitle },
  });

  return {
    items: (query.data ?? []) as T[],
    hasLoaded: query.isSuccess,
    // Only show the pull-to-refresh spinner once we already have data on screen.
    isRefreshing: query.isSuccess && query.isFetching,
    onRefresh: () => query.refetch(),
  };
};

/**
 * Resolves a record's `ownerId` to the owning member's display name, reading
 * from the cached family roster (fetched once per session like any collection).
 * A record is attributed to whoever created it, so the owner label is derived,
 * never stored. Unknown or empty ids resolve to "" so callers can supply their
 * own fallback.
 */
export const useOwnerName = (): ((ownerId: string | undefined) => string) => {
  const { items } = useCollectionState<LoginUserModel>("members");
  const byId = new Map(items.map((member) => [member.id, displayNameOf(member)]));
  return (ownerId) => (ownerId && byId.get(ownerId)) || "";
};

/**
 * Runs a "commit thunk" — a function that receives the query client and mutates
 * the cache. Preserves the old `dispatch(commitSave(...))` call shape so save
 * and delete handlers across the app didn't have to change: `dispatch` now just
 * hands the thunk the query client instead of the Redux store.
 */
export const useAppDispatch = () => {
  const qc = useQueryClient();
  return useCallback(
    <R,>(thunk: (client: QueryClient) => R): R => thunk(qc),
    [qc]
  );
};

const upsert = (items: Identified[], saved: Identified): Identified[] => {
  const index = items.findIndex((item) => item.id === saved.id);
  if (index < 0) {
    return [...items, saved];
  }
  const next = items.slice();
  next[index] = saved;
  return next;
};

/**
 * Persists a save (add or edit) and reflects it in the cache. The write
 * resolves to the full stored record, which is upserted so lists and overviews
 * update without a refetch. Returns the saved record.
 */
export const commitSave =
  <T extends Identified>(name: CollectionName, write: Promise<T>) =>
  async (qc: QueryClient): Promise<T> => {
    const saved = await write;
    qc.setQueryData<Identified[]>(collectionKey(name), (prev = []) =>
      upsert(prev, saved)
    );
    return saved;
  };

/** Deletes a record and drops it from the cache. */
export const commitDelete =
  (name: CollectionName, id: string, remove: (id: string) => Promise<unknown>) =>
  async (qc: QueryClient): Promise<void> => {
    await remove(id);
    qc.setQueryData<Identified[]>(collectionKey(name), (prev = []) =>
      prev.filter((item) => item.id !== id)
    );
  };

/* ------------------------------------------------------------------ *
 * Metal rates (a single shared row, not a list)
 * ------------------------------------------------------------------ */

/** Reads the cached metal rates, fetching them once on first use. */
export const useMetalRates = () => {
  const query = useQuery({
    queryKey: METAL_RATES_KEY,
    queryFn: getMetalRates,
    meta: { errorTitle: "Unable to load rates" },
  });

  return {
    value: query.data ?? null,
    loaded: query.isSuccess,
    isRefreshing: query.isSuccess && query.isFetching,
    onRefresh: () => query.refetch(),
  };
};

/**
 * Reflects a just-saved metal-rates row into the cache so every screen updates
 * without a refetch. A commit thunk like `commitSave`, run through `dispatch`.
 */
export const commitMetalRates =
  (rates: MetalRates) => (qc: QueryClient) => {
    qc.setQueryData(METAL_RATES_KEY, rates);
  };
