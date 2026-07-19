import axios from "axios";

/** Precious metals are quoted per troy ounce, not the 28.35 g avoirdupois one. */
const TROY_OUNCE_GRAMS = 31.1034768;

const GOLD_URL = "https://api.gold-api.com/price/XAU";
const SILVER_URL = "https://api.gold-api.com/price/XAG";
const FX_URL = "https://open.er-api.com/v6/latest/USD";

const REQUEST_TIMEOUT_MS = 12000;

/**
 * International spot converted to INR sits well below the actual Indian bullion
 * price: India adds import duty plus a persistent local premium, so the same
 * metal is dearer here than a straight FX hop suggests. These factors lift the
 * converted spot onto the IBJA 999 benchmark — the ex-GST, ex-making-charge rate
 * every Indian jeweller quotes, which is also the honest liquidation value for
 * valuing holdings.
 *
 * Calibrated 2026-07-18 against IBJA (ibjarates.com): converted spot was
 * ₹12,459/g gold and ₹173.8/g silver against IBJA's ₹14,116/g and ₹216.6/g.
 * The gap drifts as duty and premiums change — recheck against ibjarates.com and
 * nudge these if the fetched rate strays from the benchmark.
 */
const GOLD_INDIA_FACTOR = 1.133;
const SILVER_INDIA_FACTOR = 1.246;

export type LiveRates = {
  goldPerGram: string;
  silverPerGram: string;
};

/**
 * Spot prices come in USD per troy ounce, so they need a currency hop before
 * they mean anything here. Both APIs are keyless and public, which is also why
 * this can fail at any time — every caller must have a manual-entry fallback.
 *
 * The result is the 24K Indian benchmark (spot → INR → India-adjusted). Indian
 * jewellery is usually 22K, so the screen invites the user to adjust it rather
 * than silently applying 0.916.
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

  const perGram = (usdPerOunce: number, indiaFactor: number) =>
    ((usdPerOunce * usdToInr) / TROY_OUNCE_GRAMS) * indiaFactor;

  return {
    goldPerGram: perGram(goldPerOunce, GOLD_INDIA_FACTOR).toFixed(0),
    silverPerGram: perGram(silverPerOunce, SILVER_INDIA_FACTOR).toFixed(2),
  };
};
