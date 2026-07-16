import { configureStore } from "@reduxjs/toolkit";
import collections from "./collectionsSlice";
import metalRates from "./metalRatesSlice";

/**
 * In-memory session cache for the family's data. Populated lazily on first
 * visit to each collection, mutated in place on save/delete, and cleared on
 * sign-out (see `resetAll`). Nothing here is persisted to disk.
 */
export const store = configureStore({
  reducer: {
    collections,
    metalRates,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
