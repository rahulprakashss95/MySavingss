import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { resetAll } from "./resetAll";

/**
 * The domain collections we cache. Each maps 1:1 to a database table and
 * to a `getX` fetcher in `database/query.ts` (see the registry in
 * `hooks.ts`). `metalRates` is a single doc, not a list, so it lives in its own
 * slice.
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
  // lists/overviews can resolve a record's owner name from its `ownerId`
  // without a per-screen fetch.
  | "members";

export const COLLECTION_NAMES: CollectionName[] = [
  "banks",
  "accounts",
  "ornaments",
  "properties",
  "vehicles",
  "bankDocuments",
  "governmentDocuments",
  "ledgerClients",
  "earnings",
  "earningTypes",
  "savings",
  "expenses",
  "expenseTypes",
  "gameScores",
  "members",
];

/** Every cached record is keyed by its row id. */
export type Identified = { id: string };

export type CollectionState = {
  items: Identified[];
  /** True once the first fetch has resolved — drives skeleton vs empty. */
  loaded: boolean;
  /** True while a fetch is in flight (initial or a forced refresh). */
  loading: boolean;
};

type CollectionsState = Record<CollectionName, CollectionState>;

const makeInitialState = (): CollectionsState =>
  COLLECTION_NAMES.reduce((acc, name) => {
    acc[name] = { items: [], loaded: false, loading: false };
    return acc;
  }, {} as CollectionsState);

const collectionsSlice = createSlice({
  name: "collections",
  initialState: makeInitialState,
  reducers: {
    startLoading(state, action: PayloadAction<{ name: CollectionName }>) {
      state[action.payload.name].loading = true;
    },
    stopLoading(state, action: PayloadAction<{ name: CollectionName }>) {
      state[action.payload.name].loading = false;
    },
    setAll(
      state,
      action: PayloadAction<{ name: CollectionName; items: Identified[] }>
    ) {
      const collection = state[action.payload.name];
      collection.items = action.payload.items;
      collection.loaded = true;
      collection.loading = false;
    },
    upsertOne(
      state,
      action: PayloadAction<{ name: CollectionName; item: Identified }>
    ) {
      const collection = state[action.payload.name];
      const index = collection.items.findIndex(
        (item) => item.id === action.payload.item.id
      );
      if (index >= 0) {
        collection.items[index] = action.payload.item;
      } else {
        collection.items.push(action.payload.item);
      }
    },
    removeOne(
      state,
      action: PayloadAction<{ name: CollectionName; id: string }>
    ) {
      const collection = state[action.payload.name];
      collection.items = collection.items.filter(
        (item) => item.id !== action.payload.id
      );
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetAll, () => makeInitialState());
  },
});

export const collectionsActions = collectionsSlice.actions;
export default collectionsSlice.reducer;
