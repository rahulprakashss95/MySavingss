import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MetalRates } from "../models/AssetModel";
import { resetAll } from "./resetAll";

/**
 * The family's shared gold/silver rates — a single Firestore doc, not a list,
 * so it gets its own slice rather than a spot in the collections map.
 */
type MetalRatesState = {
  value: MetalRates | null;
  loaded: boolean;
  loading: boolean;
};

const initialState: MetalRatesState = {
  value: null,
  loaded: false,
  loading: false,
};

const metalRatesSlice = createSlice({
  name: "metalRates",
  initialState,
  reducers: {
    startLoading(state) {
      state.loading = true;
    },
    stopLoading(state) {
      state.loading = false;
    },
    set(state, action: PayloadAction<MetalRates>) {
      state.value = action.payload;
      state.loaded = true;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetAll, () => ({
      value: null,
      loaded: false,
      loading: false,
    }));
  },
});

export const metalRatesActions = metalRatesSlice.actions;
export default metalRatesSlice.reducer;
