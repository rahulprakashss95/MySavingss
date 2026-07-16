import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { resetAll } from "./resetAll";

/**
 * The domain collections we cache. Each maps 1:1 to a Firestore collection and
 * to a `getX` fetcher in `database/firebaseQuery.tsx` (see the registry in
 * `hooks.ts`). `metalRates` is a single doc, not a list, so it lives in its own
 * slice.
 */
export type CollectionName =
  | "clients"
  | "fixedDeposits"
  | "ornaments"
  | "properties"
  | "bankDocuments"
  | "governmentDocuments"
  | "ledgerClients"
  | "earnings"
  | "savings";

export const COLLECTION_NAMES: CollectionName[] = [
  "clients",
  "fixedDeposits",
  "ornaments",
  "properties",
  "bankDocuments",
  "governmentDocuments",
  "ledgerClients",
  "earnings",
  "savings",
];

/** Every cached record is keyed by its Firestore doc id. */
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
