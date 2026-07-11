import axios from "axios";

/** Precious metals are quoted per troy ounce, not the 28.35 g avoirdupois one. */
const TROY_OUNCE_GRAMS = 31.1034768;

const GOLD_URL = "https://api.gold-api.com/price/XAU";
const SILVER_URL = "https://api.gold-api.com/price/XAG";
const FX_URL = "https://open.er-api.com/v6/latest/USD";

const REQUEST_TIMEOUT_MS = 12000;

export type LiveRates = {
  goldPerGram: string;
  silverPerGram: string;
};

/**
 * Spot prices come in USD per troy ounce, so they need a currency hop before
 * they mean anything here. Both APIs are keyless and public, which is also why
 * this can fail at any time — every caller must have a manual-entry fallback.
 *
 * The result is the 24K spot price. Indian jewellery is usually 22K, so the
 * screen invites the user to adjust it rather than silently applying 0.916.
 */
export const fetchLiveMetalRates = async (): Promise<LiveRates> => {
  const [gold, silver, fx] = await Promise.all([
    axios.get(GOLD_URL, { timeout: REQUEST_TIMEOUT_MS }),
    axios.get(SILVER_URL, { timeout: REQUEST_TIMEOUT_MS }),
    axios.get(FX_URL, { timeout: REQUEST_TIMEOUT_MS }),
  ]);

  const goldPerOunce = Number(gold.data?.price);
  const silverPerOunce = Number(silver.data?.price);
  const usdToInr = Number(fx.data?.rates?.INR);

  if (!goldPerOunce || !silverPerOunce || !usdToInr) {
    throw new Error("Rate service returned an incomplete response");
  }

  const perGram = (usdPerOunce: number) =>
    (usdPerOunce * usdToInr) / TROY_OUNCE_GRAMS;

  return {
    goldPerGram: perGram(goldPerOunce).toFixed(0),
    silverPerGram: perGram(silverPerOunce).toFixed(2),
  };
};
