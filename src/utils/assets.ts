import moment from "moment";
import {
  DEFAULT_GOLD_KARAT,
  KARAT_PURITY,
  LAND_PROPERTY_TYPES,
  MetalRates,
  ORNAMENT_TYPES,
  OrnamentModel,
  PaymentEntry,
  PropertyModel,
} from "../models/AssetModel";
import { DATE_FORMAT } from "./deposits";

/** The pavan / sovereign used across Kerala and Tamil Nadu. */
export const GRAMS_PER_PAWN = 8;
export const CENTS_PER_ACRE = 100;

/**
 * Trims float noise without lying about precision: 2.0000000000000004 -> 2,
 * but 0.3333333 keeps four decimals. Empty in, empty out.
 */
export const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) {
    return "";
  }
  return String(parseFloat(value.toFixed(4)));
};

/**
 * All of these take `string | undefined`: a row written before a
 * field existed comes back with it undefined, and `undefined.trim()` throws.
 */

/** Divides a canonical value into display units, e.g. grams -> pawn. */
export const toUnit = (canonical: string | undefined, perUnit: number) => {
  const text = canonical ?? "";
  const parsed = Number(text);
  if (!text.trim() || Number.isNaN(parsed)) {
    return "";
  }
  return formatNumber(parsed / perUnit);
};

/** Multiplies display units back into the canonical value, e.g. pawn -> grams. */
export const fromUnit = (unitValue: string | undefined, perUnit: number) => {
  const text = unitValue ?? "";
  const parsed = Number(text);
  if (!text.trim() || Number.isNaN(parsed)) {
    return "";
  }
  return formatNumber(parsed * perUnit);
};

export const gramsToPawn = (grams?: string) => toUnit(grams, GRAMS_PER_PAWN);
export const centsToAcres = (cents?: string) => toUnit(cents, CENTS_PER_ACRE);

/** "16 g · 2 pawn", or just "16 g" when the weight isn't a whole pawn count. */
export const weightSummary = (grams?: string) => {
  const text = (grams ?? "").trim();
  if (!text) {
    return "";
  }
  const pawn = gramsToPawn(text);
  return pawn ? `${text} g · ${pawn} pawn` : `${text} g`;
};

/** "150 cents · 1.5 acres". Blank for assets with no area. */
export const areaSummary = (cents?: string) => {
  const text = (cents ?? "").trim();
  if (!text) {
    return "";
  }
  const acres = centsToAcres(text);
  return acres ? `${text} cents · ${acres} acres` : `${text} cents`;
};

const sumOf = (entries: PaymentEntry[]) =>
  entries.reduce((total, entry) => total + (Number(entry.amount) || 0), 0);

export type PaymentTotals = {
  total: number;
  paid: number;
  /** Never negative: overpaying shows as zero left, not a refund. */
  remaining: number;
  paidCount: number;
  entryCount: number;
  /** 0–1, for the progress bar. Zero when there is no total to divide by. */
  progress: number;
};

export const paymentTotals = (property: {
  totalAmount: string;
  entries?: PaymentEntry[];
}): PaymentTotals => {
  const entries = property.entries ?? [];
  const total = Number(property.totalAmount) || 0;
  const paidEntries = entries.filter((entry) => entry.paid);
  const paid = sumOf(paidEntries);

  return {
    total,
    paid,
    remaining: Math.max(total - paid, 0),
    paidCount: paidEntries.length,
    entryCount: entries.length,
    progress: total > 0 ? Math.min(paid / total, 1) : 0,
  };
};

/**
 * Dates are stored as DD-MMM-YYYY display strings, so they have to be parsed
 * before comparing — "02-Apr-2026" sorts before "01-Dec-2025" as plain text.
 * Undated entries sink to the bottom of their group.
 */
const dateValue = (date: string) => {
  const parsed = moment(date, DATE_FORMAT, true);
  return parsed.isValid() ? parsed.valueOf() : Number.POSITIVE_INFINITY;
};

/** Unpaid installments first, then by date — what you owe next, at the top. */
export const sortEntries = (entries: PaymentEntry[]) =>
  [...entries].sort((a, b) => {
    if (a.paid !== b.paid) {
      return a.paid ? 1 : -1;
    }
    return dateValue(a.date) - dateValue(b.date);
  });

/** Entries live inside the property document, so ids are generated here. */
export const newEntryId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Cars and bikes have no area, so the form hides the cents field for them. */
export const hasArea = (propertyType: string) =>
  LAND_PROPERTY_TYPES.includes(propertyType);

/**
 * `paymentTotals` counts only what the entries say was paid, which reads a
 * "paid in full" property as entirely unpaid — it has no entries. Correct for
 * that here, where properties are summed into a portfolio.
 */
export const propertyTotals = (property: PropertyModel): PaymentTotals => {
  const total = Number(property.totalAmount) || 0;
  if (property.paymentMode === "full") {
    return {
      total,
      paid: total,
      remaining: 0,
      paidCount: 0,
      entryCount: 0,
      progress: total > 0 ? 1 : 0,
    };
  }
  return paymentTotals(property);
};

export type KaratTotal = { karat: string; grams: number; value: number };

export type MetalTotal = {
  metal: string;
  grams: number;
  pieces: number;
  value: number;
  /** False for diamond and platinum: weight is known, worth is not. */
  valued: boolean;
  /** Gold only. One entry per karat present, purest first. */
  karats: KaratTotal[];
};

/** The 24K spot rate for the metal, before purity is applied. */
const spotRateFor = (metal: string, rates: MetalRates) => {
  if (metal === "Gold") return Number(rates.goldPerGram) || 0;
  if (metal === "Silver") return Number(rates.silverPerGram) || 0;
  return 0;
};

/** The karat a gold row is valued at. Blank means the pre-karat default. */
export const karatOf = (ornament: { ornamentType: string; karat?: string }) => {
  if (ornament.ornamentType !== "Gold") {
    return "";
  }
  return ornament.karat || DEFAULT_GOLD_KARAT;
};

/**
 * What one gram of this ornament is worth. Gold is quoted at 24K, so an 18K
 * piece is worth three quarters of the spot rate per gram.
 */
export const ratePerGram = (
  ornament: { ornamentType: string; karat?: string },
  rates: MetalRates
) => {
  const spot = spotRateFor(ornament.ornamentType, rates);
  if (!spot) {
    return 0;
  }
  if (ornament.ornamentType !== "Gold") {
    return spot;
  }
  return spot * (KARAT_PURITY[karatOf(ornament)] ?? KARAT_PURITY[DEFAULT_GOLD_KARAT]);
};

/** Purest first, so 24K heads the list regardless of insertion order. */
const byPurity = (a: KaratTotal, b: KaratTotal) =>
  (KARAT_PURITY[b.karat] ?? 0) - (KARAT_PURITY[a.karat] ?? 0);

/** Ornaments rolled up per metal, in the order the metals are declared. */
export const ornamentTotals = (
  ornaments: OrnamentModel[],
  rates: MetalRates
) => {
  const byMetal = new Map<string, MetalTotal>();

  ornaments.forEach((ornament) => {
    const metal = ornament.ornamentType || "Other";
    const grams = Number(ornament.grams) || 0;
    const pieces = Math.max(Number(ornament.count) || 1, 1);
    const spot = spotRateFor(metal, rates);
    const value = grams * ratePerGram(ornament, rates);

    const existing = byMetal.get(metal) ?? {
      metal,
      grams: 0,
      pieces: 0,
      value: 0,
      valued: spot > 0,
      karats: [] as KaratTotal[],
    };

    existing.grams += grams;
    existing.pieces += pieces;
    existing.value += value;
    existing.valued = spot > 0;

    if (metal === "Gold") {
      const karat = karatOf(ornament);
      const bucket = existing.karats.find((entry) => entry.karat === karat);
      if (bucket) {
        bucket.grams += grams;
        bucket.value += value;
      } else {
        existing.karats.push({ karat, grams, value });
      }
    }

    byMetal.set(metal, existing);
  });

  const rows = [...byMetal.values()]
    .map((row) => ({ ...row, karats: [...row.karats].sort(byPurity) }))
    .sort(
      (a, b) =>
        ORNAMENT_TYPES.indexOf(a.metal as any) -
        ORNAMENT_TYPES.indexOf(b.metal as any)
    );

  return {
    rows,
    totalValue: rows.reduce((sum, row) => sum + row.value, 0),
    totalGrams: rows.reduce((sum, row) => sum + row.grams, 0),
    /** True when at least one metal has no rate, so the total understates. */
    hasUnvalued: rows.some((row) => !row.valued && row.grams > 0),
    /** True when a gold row predates the karat field and was assumed 22K. */
    hasAssumedKarat: ornaments.some(
      (ornament) => ornament.ornamentType === "Gold" && !ornament.karat
    ),
  };
};

export type HolderTotal = { personName: string; grams: number; value: number };

/** Who holds what, by value — the second question after "how much do we have". */
export const ornamentsByHolder = (
  ornaments: OrnamentModel[],
  rates: MetalRates
): HolderTotal[] => {
  const byPerson = new Map<string, HolderTotal>();

  ornaments.forEach((ornament) => {
    const personName = ornament.personName || "Unassigned";
    const grams = Number(ornament.grams) || 0;
    const value = grams * ratePerGram(ornament, rates);

    const existing = byPerson.get(personName) ?? { personName, grams: 0, value: 0 };
    existing.grams += grams;
    existing.value += value;
    byPerson.set(personName, existing);
  });

  return [...byPerson.values()].sort((a, b) => b.value - a.value || b.grams - a.grams);
};

export type PropertyPortfolio = {
  count: number;
  total: number;
  paid: number;
  remaining: number;
  progress: number;
  /** Properties still carrying a balance. */
  outstandingCount: number;
};

export const propertyPortfolio = (
  properties: PropertyModel[]
): PropertyPortfolio => {
  let total = 0;
  let paid = 0;
  let outstandingCount = 0;

  properties.forEach((property) => {
    const totals = propertyTotals(property);
    total += totals.total;
    paid += totals.paid;
    if (totals.remaining > 0) {
      outstandingCount += 1;
    }
  });

  return {
    count: properties.length,
    total,
    paid,
    remaining: Math.max(total - paid, 0),
    progress: total > 0 ? Math.min(paid / total, 1) : 0,
    outstandingCount,
  };
};
