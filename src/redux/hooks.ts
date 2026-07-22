import { useEffect, useMemo } from "react";
import {
  TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from "react-redux";
import {
  getBankDocuments,
  getBanks,
  getEarnings,
  getAccounts,
  getEarningTypes,
  getExpenses,
  getExpenseTypes,
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
import { showToast } from "../utils/Utils";
import {
  CollectionName,
  collectionsActions,
  Identified,
} from "./collectionsSlice";
import { metalRatesActions } from "./metalRatesSlice";
import type { AppDispatch, RootState } from "./store";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

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
  members: { fetch: getLoginUsers, errorTitle: "Unable to load members" },
};

/**
 * Loads a collection into the store. A no-op if it's already loaded or a fetch
 * is in flight, unless `force` (pull-to-refresh) is passed — that's what keeps
 * navigation between screens from re-reading the same data.
 */
export const fetchCollection =
  (name: CollectionName, options?: { force?: boolean }) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    const current = getState().collections[name];
    if (current.loading) {
      return;
    }
    if (current.loaded && !options?.force) {
      return;
    }
    dispatch(collectionsActions.startLoading({ name }));
    try {
      const items = await REGISTRY[name].fetch();
      dispatch(collectionsActions.setAll({ name, items: items ?? [] }));
    } catch (error) {
      console.log(error);
      dispatch(collectionsActions.stopLoading({ name }));
      showToast(
        "error",
        REGISTRY[name].errorTitle,
        "Check your connection and pull down to retry.",
        "bottom"
      );
    }
  };

/**
 * Drop-in replacement for the old `useCollection`: returns the cached items and
 * the same `{ hasLoaded, isRefreshing, onRefresh }` shape, but reads from the
 * store and only fetches when the data isn't already cached.
 */
export const useCollectionState = <T extends Identified>(
  name: CollectionName
) => {
  const dispatch = useAppDispatch();
  const state = useAppSelector((root) => root.collections[name]);

  useEffect(() => {
    dispatch(fetchCollection(name));
  }, [dispatch, name]);

  return {
    items: state.items as T[],
    hasLoaded: state.loaded,
    // Only show the pull-to-refresh spinner once we already have data on screen.
    isRefreshing: state.loaded && state.loading,
    onRefresh: () => dispatch(fetchCollection(name, { force: true })),
  };
};

/**
 * Resolves a record's `ownerId` to the owning member's display name, reading
 * from the cached family roster (fetched once per session like any collection).
 * This replaced the per-record "Belongs to" field: a record is attributed to
 * whoever created it, so the owner label is derived, never stored — renaming a
 * member updates every one of their records with no data migration. Unknown or
 * empty ids resolve to "" so callers can supply their own fallback.
 */
export const useOwnerName = (): ((ownerId: string | undefined) => string) => {
  const { items } = useCollectionState<LoginUserModel>("members");
  return useMemo(() => {
    const byId = new Map(items.map((member) => [member.id, displayNameOf(member)]));
    return (ownerId) => (ownerId && byId.get(ownerId)) || "";
  }, [items]);
};

/**
 * Persists a save (add or edit) and reflects it in the cache. The write
 * resolves to the full stored record (see `saveScoped`), which is upserted so
 * lists and overviews update without a refetch.
 */
export const commitSave =
  <T extends Identified>(name: CollectionName, write: Promise<T>) =>
  async (dispatch: AppDispatch) => {
    const saved = await write;
    dispatch(collectionsActions.upsertOne({ name, item: saved }));
    return saved;
  };

/** Deletes a record and drops it from the cache. */
export const commitDelete =
  (name: CollectionName, id: string, remove: (id: string) => Promise<unknown>) =>
  async (dispatch: AppDispatch) => {
    await remove(id);
    dispatch(collectionsActions.removeOne({ name, id }));
  };

/* ------------------------------------------------------------------ *
 * Metal rates (a single shared doc, not a list)
 * ------------------------------------------------------------------ */

export const fetchMetalRates =
  (options?: { force?: boolean }) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    const current = getState().metalRates;
    if (current.loading) {
      return;
    }
    if (current.loaded && !options?.force) {
      return;
    }
    dispatch(metalRatesActions.startLoading());
    try {
      dispatch(metalRatesActions.set(await getMetalRates()));
    } catch (error) {
      console.log(error);
      dispatch(metalRatesActions.stopLoading());
      showToast(
        "error",
        "Unable to load rates",
        "Check your connection and pull down to retry.",
        "bottom"
      );
    }
  };

/** Reads the cached metal rates, fetching them once on first use. */
export const useMetalRates = () => {
  const dispatch = useAppDispatch();
  const state = useAppSelector((root) => root.metalRates);

  useEffect(() => {
    dispatch(fetchMetalRates());
  }, [dispatch]);

  return {
    value: state.value,
    loaded: state.loaded,
    isRefreshing: state.loaded && state.loading,
    onRefresh: () => dispatch(fetchMetalRates({ force: true })),
  };
};
