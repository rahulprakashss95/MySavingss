import moment from "moment";
import { DATE_FORMAT } from "./deposits";
import { groupBy, Section } from "./grouping";

type Dated = { date: string };
type Amounted = { amount: string };

/** Sorts after every real month, so undated rows sink to the bottom. */
const UNDATED_KEY = "0000-00";

export const parseLedgerDate = (date?: string) => {
  const parsed = moment(date ?? "", DATE_FORMAT, true);
  return parsed.isValid() ? parsed : null;
};

/** "2026-07" — sortable as text, unlike the DD-MMM-YYYY display format. */
export const monthKey = (date?: string) =>
  parseLedgerDate(date)?.format("YYYY-MM") ?? UNDATED_KEY;

export const monthLabel = (date?: string) =>
  parseLedgerDate(date)?.format("MMMM YYYY") ?? "No date";

/** Newest month first: a ledger is read from the present backwards. */
export const groupByMonth = <T extends Dated>(entries: T[]): Section<T>[] =>
  groupBy(
    [...entries].sort(
      (a, b) =>
        (parseLedgerDate(b.date)?.valueOf() ?? 0) -
        (parseLedgerDate(a.date)?.valueOf() ?? 0)
    ),
    (entry) => monthKey(entry.date),
    (entry) => monthLabel(entry.date)
  ).sort((a, b) => b.key.localeCompare(a.key));

export const sumAmount = (entries: Amounted[]) =>
  entries.reduce((total, entry) => total + (Number(entry.amount) || 0), 0);

export type MonthPoint = {
  /** "YYYY-MM". */
  key: string;
  /** "Jul", for an axis. */
  label: string;
  total: number;
  /** How many entries landed in the month — a total of ₹0 from no entries and
   *  one from a refund are different things. */
  count: number;
};

/**
 * Totals per calendar month for the `count` months ending with the current one,
 * oldest first. Quiet months come back as zeros rather than gaps, so the series
 * is always `count` long and lines up with a fixed set of columns. One pass over
 * the entries, unlike filtering the list once per month.
 */
export const monthlyTotals = <T extends Dated & Amounted>(
  entries: T[],
  count: number
): MonthPoint[] => {
  const totals = new Map<string, { total: number; count: number }>();
  entries.forEach((entry) => {
    const key = monthKey(entry.date);
    const bucket = totals.get(key) ?? { total: 0, count: 0 };
    bucket.total += Number(entry.amount) || 0;
    bucket.count += 1;
    totals.set(key, bucket);
  });

  return Array.from({ length: count }, (_, index) => {
    const month = moment().subtract(count - 1 - index, "months");
    const key = month.format("YYYY-MM");
    const bucket = totals.get(key);
    return {
      key,
      label: month.format("MMM"),
      total: bucket?.total ?? 0,
      count: bucket?.count ?? 0,
    };
  });
};

export type Bucket = { label: string; total: number; count: number };

/** Totals grouped by any label, largest first — the shape every chart wants. */
export const totalsBy = <T extends Amounted>(
  entries: T[],
  getLabel: (entry: T) => string
): Bucket[] => {
  const buckets = new Map<string, Bucket>();

  entries.forEach((entry) => {
    const label = getLabel(entry) || "Unlabelled";
    const existing = buckets.get(label) ?? { label, total: 0, count: 0 };
    existing.total += Number(entry.amount) || 0;
    existing.count += 1;
    buckets.set(label, existing);
  });

  return [...buckets.values()].sort((a, b) => b.total - a.total);
};

/** What share of what you earned you managed to keep. 0–1, or 0 if nothing earned. */
export const savingsRate = (earned: number, saved: number) =>
  earned > 0 ? Math.min(saved / earned, 1) : 0;

/** The catch-all slot when there are more types than the chart has colours. */
export const OTHER_TYPE = "Other";

export type MonthSegment = { type: string; amount: number };

export type MonthBreakdown = {
  key: string;
  /** "July 2026", for the selected-month readout. */
  label: string;
  /** "Jul", under the column. */
  shortLabel: string;
  total: number;
  /** One per type in `MonthlyTypeData.types`, same order, zeros included. */
  segments: MonthSegment[];
};

export type MonthlyTypeData = {
  /** Oldest first, so the columns read left-to-right as time moving forward. */
  months: MonthBreakdown[];
  /** The stack/legend order: kept types by all-time total, then "Other". */
  types: string[];
  /** Tallest column, for scaling every bar against one baseline. */
  maxTotal: number;
};

/**
 * Earnings bucketed into a stacked-column series: one column per month, split
 * by type. Types beyond `maxTypes` (ranked by all-time total) fold into a single
 * "Other" slot rather than minting colours a stacked bar can't keep distinct.
 * Undated rows are dropped — they have no column — but still count in the totals
 * shown elsewhere.
 */
export const monthlyByType = <E extends Dated & Amounted & { type: string }>(
  earnings: E[],
  monthCount = 12,
  maxTypes = 5
): MonthlyTypeData => {
  const allTime = totalsBy(earnings, (entry) => entry.type || "Unlabelled");
  const kept = allTime.slice(0, maxTypes).map((bucket) => bucket.label);
  const keptSet = new Set(kept);
  const types = allTime.length > maxTypes ? [...kept, OTHER_TYPE] : kept;

  const slotFor = (type: string) => {
    const label = type || "Unlabelled";
    return keptSet.has(label) ? label : OTHER_TYPE;
  };

  const monthsMap = new Map<string, MonthBreakdown>();
  const touch = (date: string) => {
    const key = monthKey(date);
    if (key === UNDATED_KEY) {
      return null;
    }
    const existing = monthsMap.get(key);
    if (existing) {
      return existing;
    }
    const created: MonthBreakdown = {
      key,
      label: monthLabel(date),
      shortLabel: parseLedgerDate(date)?.format("MMM") ?? "",
      total: 0,
      segments: types.map((type) => ({ type, amount: 0 })),
    };
    monthsMap.set(key, created);
    return created;
  };

  earnings.forEach((entry) => {
    const month = touch(entry.date);
    if (!month) {
      return;
    }
    const amount = Number(entry.amount) || 0;
    const slot = slotFor(entry.type);
    const segment = month.segments.find((candidate) => candidate.type === slot);
    if (segment) {
      segment.amount += amount;
    }
    month.total += amount;
  });

  const months = [...monthsMap.values()]
    .sort((a, b) => b.key.localeCompare(a.key))
    .slice(0, monthCount)
    .reverse();

  return {
    months,
    types,
    maxTotal: Math.max(...months.map((month) => month.total), 0),
  };
};
