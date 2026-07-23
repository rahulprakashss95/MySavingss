import moment from "moment";
import { useMemo } from "react";

import { useAuth } from "../context/AuthContext";
import {
  EMPTY_METAL_RATES,
  OrnamentModel,
  PaymentEntry,
  PropertyModel,
} from "../models/AssetModel";
import { FeatureKey, hasFeature } from "../models/common";
import { AccountModel } from "../models/AccountModel";
import { BankModel } from "../models/BankModel";
import { ExpenseModel } from "../models/ExpenseModel";
import { EarningModel, SavingModel } from "../models/LedgerModel";
import { useCollectionState, useMetalRates } from "../query/hooks";
import { ornamentTotals, propertyPortfolio } from "../utils/assets";
import {
  accountInstitution,
  buildAccountTotals,
  parseMaturity,
} from "../utils/deposits";
import {
  MonthPoint,
  monthlyTotals,
  parseLedgerDate,
  sumAmount,
} from "../utils/ledger";

/** A slice of the family's total worth, e.g. Deposits or Gold. */
export type WorthSegment = {
  key: "deposits" | "savings" | "gold" | "property";
  label: string;
  value: number;
  /** Where tapping it lands. */
  href: string;
};

export type MaturityItem = {
  id: string;
  bankName: string;
  amount: number;
  date: string;
  /** Negative once matured. */
  daysUntil: number;
};

export type PaymentDueItem = {
  propertyId: string;
  propertyName: string;
  label: string;
  amount: number;
  date: string;
  overdue: boolean;
};

/**
 * One money flow — earnings or expenses — read as "this month against its own
 * recent past". Every figure is in rupees.
 */
export type MonthFlow = {
  /** The running month's total *so far*: it is compared against full months. */
  total: number;
  /** Last calendar month, complete. */
  previous: number;
  /**
   * Mean of the `HISTORY_MONTHS` completed months before this one. The running
   * month is excluded deliberately — including it compares a month against a
   * window containing itself, so the bar moves all month and settles nowhere.
   */
  average: number;
  /** Oldest first: the completed months, then the running one last. */
  series: MonthPoint[];
  /** Month-end total at the current rate, or null when projecting would mislead. */
  pace: number | null;
};

export type DashboardData = {
  ready: boolean;
  /** null when the member has no worth-bearing module (deposits/ledger/assets). */
  worth: {
    total: number;
    segments: WorthSegment[];
    /** Ornament grams, shown when metal rates are missing so value can't be priced. */
    unpricedGrams: number;
    needsRates: boolean;
  } | null;
  /** null when the member has neither deposits nor assets. */
  attention: {
    maturities: MaturityItem[];
    paymentsDue: PaymentDueItem[];
  } | null;
  /** null when the member holds neither the earnings nor the expenses tile. */
  month: {
    /** null without the expenses tile. */
    expenses: MonthFlow | null;
    /** null without the earnings tile. */
    earnings: MonthFlow | null;
    /** Earned so far this Indian financial year (Apr–Mar). null without earnings. */
    fy: { label: string; earned: number } | null;
  } | null;
};

const UPCOMING_DAYS = 60;

/** Completed months behind the running one that the average and chart cover. */
const HISTORY_MONTHS = 6;

/**
 * A month's flow against the six before it. The series carries one extra column
 * for the running month, so the average line is drawn across exactly the
 * completed months it was computed from.
 */
const buildFlow = <T extends { date: string; amount: string }>(
  entries: T[]
): MonthFlow => {
  // `monthlyTotals` always returns exactly the length asked for, so the running
  // month sits at a known index and the ones before it need no lookup.
  const series = monthlyTotals(entries, HISTORY_MONTHS + 1);
  const completed = series.slice(0, HISTORY_MONTHS);
  const running = series[HISTORY_MONTHS];

  const dayOfMonth = moment().date();
  const daysInMonth = moment().daysInMonth();
  // A projection off a single lump — a salary credit on the 1st — would read as
  // a month several times any real one, so it takes two entries to earn a pace.
  // It also stays hidden in the first days (too little to extrapolate from) and
  // the last (by then the total says it better).
  const pace =
    running.count >= 2 && dayOfMonth >= 5 && dayOfMonth <= daysInMonth - 3
      ? (running.total / dayOfMonth) * daysInMonth
      : null;

  return {
    total: running.total,
    previous: series[HISTORY_MONTHS - 1].total,
    average:
      completed.reduce((sum, point) => sum + point.total, 0) / HISTORY_MONTHS,
    series,
    pace,
  };
};

/** Indian financial year: April 1 to March 31. */
const financialYear = () => {
  const now = moment();
  const startYear = now.month() >= 3 ? now.year() : now.year() - 1;
  return {
    start: moment({ year: startYear, month: 3, day: 1 }).startOf("day"),
    label: `FY ${String(startYear).slice(2)}-${String(startYear + 1).slice(2)}`,
  };
};

/**
 * The month card's figures. Earnings alone are enough to build it: gating the
 * whole card on the expenses tile used to hide every income figure from members
 * who track what they make but not what they spend.
 */
const buildMonth = (
  needExpenses: boolean,
  needEarnings: boolean,
  expenses: ExpenseModel[],
  earnings: EarningModel[]
): DashboardData["month"] => {
  if (!needExpenses && !needEarnings) return null;
  const fy = financialYear();

  return {
    expenses: needExpenses ? buildFlow(expenses) : null,
    earnings: needEarnings ? buildFlow(earnings) : null,
    fy: needEarnings
      ? {
          label: fy.label,
          earned: sumAmount(
            earnings.filter((entry) => {
              const date = parseLedgerDate(entry.date);
              return !!date && !date.isBefore(fy.start);
            })
          ),
        }
      : null,
  };
};

/**
 * Aggregates the family's holdings, upcoming events and this month's spending
 * for the Home dashboard. Everything is gated by module access — a member only
 * ever sees numbers for modules they can open, admins see all. All figures come
 * from the same RTK cache the module screens use, so nothing is re-fetched.
 */
export const useDashboard = (): DashboardData => {
  const { user } = useAuth();
  const has = (feature: FeatureKey) => hasFeature(user, feature);

  // The dashboard's four worth/attention buckets now map onto feature tiles:
  // "deposits" is the Accounts tile, "assets" any of ornaments/properties,
  // "ledger" the earnings/savings tiles, "expenses" its own tile.
  const need = {
    deposits: has("accounts"),
    ledger: has("earnings") || has("savings"),
    assets: has("ornaments") || has("properties"),
    expenses: has("expenses"),
    // Separate from `ledger` (which also covers savings): the month card's
    // earnings half needs the earnings tile specifically.
    earnings: has("earnings"),
  };

  // Served from the shared store — fetched once per session, not on every focus.
  const accounts = useCollectionState<AccountModel>("accounts");
  // Feeds the FD maturity label ("FD at <bank>"); accounts store only a bankId.
  const banks = useCollectionState<BankModel>("banks");
  const savings = useCollectionState<SavingModel>("savings");
  const earnings = useCollectionState<EarningModel>("earnings");
  const expenses = useCollectionState<ExpenseModel>("expenses");
  const ornaments = useCollectionState<OrnamentModel>("ornaments");
  const properties = useCollectionState<PropertyModel>("properties");
  const rates = useMetalRates();

  return useMemo(() => {
    const ready =
      (!need.deposits || (accounts.hasLoaded && banks.hasLoaded)) &&
      (!need.ledger || (savings.hasLoaded && earnings.hasLoaded)) &&
      (!need.assets ||
        (ornaments.hasLoaded && properties.hasLoaded && rates.loaded)) &&
      (!need.expenses || expenses.hasLoaded);

    // ---- Worth -------------------------------------------------------------
    const ratesValue = rates.value ?? EMPTY_METAL_RATES;
    const depositsValue = need.deposits
      ? buildAccountTotals(accounts.items).balance
      : 0;
    const savingsValue = need.ledger ? sumAmount(savings.items) : 0;
    const orn = need.assets ? ornamentTotals(ornaments.items, ratesValue) : null;
    const portfolio = need.assets ? propertyPortfolio(properties.items) : null;
    const goldValue = orn?.totalValue ?? 0;
    // Property "equity" — what's actually paid, not the sticker value still owed.
    const propertyEquity = portfolio?.paid ?? 0;

    const segments: WorthSegment[] = [];
    if (need.deposits)
      segments.push({
        key: "deposits",
        label: "Cash & Deposits",
        value: depositsValue,
        href: "/assets/accounts",
      });
    if (need.ledger)
      segments.push({
        key: "savings",
        label: "Savings",
        value: savingsValue,
        href: "/ledger/overview",
      });
    if (need.assets) {
      segments.push({
        key: "gold",
        label: "Gold",
        value: goldValue,
        href: "/assets/overview",
      });
      segments.push({
        key: "property",
        label: "Property",
        value: propertyEquity,
        href: "/assets/overview",
      });
    }

    const hasRates =
      !!ratesValue.goldPerGram || !!ratesValue.silverPerGram;
    const worth =
      need.deposits || need.ledger || need.assets
        ? {
            total: depositsValue + savingsValue + goldValue + propertyEquity,
            segments,
            unpricedGrams:
              need.assets && !hasRates ? orn?.totalGrams ?? 0 : 0,
            needsRates:
              !!need.assets &&
              ornaments.items.length > 0 &&
              (!hasRates || !!orn?.hasUnvalued),
          }
        : null;

    // ---- Needs attention ---------------------------------------------------
    const today = moment().startOf("day");

    const maturities: MaturityItem[] = need.deposits
      ? accounts.items
          .map((account): MaturityItem | null => {
            const maturity = parseMaturity(account.maturityDate);
            if (!maturity) return null;
            const daysUntil = maturity.startOf("day").diff(today, "days");
            if (daysUntil > UPCOMING_DAYS) return null;
            // FDs are identified by their institution, not a name; resolve the
            // bank from the cache and fall back to any name/label we do have.
            const institution = accountInstitution(account, banks.items);
            return {
              id: account.id,
              bankName:
                institution !== "—"
                  ? institution
                  : account.name || "your bank",
              amount: Number(account.balance) || 0,
              date: account.maturityDate,
              daysUntil,
            };
          })
          .filter((item): item is MaturityItem => item !== null)
          .sort((a, b) => a.daysUntil - b.daysUntil)
      : [];

    const paymentsDue: PaymentDueItem[] = need.assets
      ? properties.items
          .flatMap((property) =>
            (property.entries ?? [])
              .filter((entry: PaymentEntry) => !entry.paid)
              .map((entry: PaymentEntry) => {
                const due = parseLedgerDate(entry.date);
                if (!due) return null;
                const daysUntil = due.startOf("day").diff(today, "days");
                if (daysUntil > UPCOMING_DAYS) return null;
                return {
                  propertyId: property.id,
                  propertyName: property.name || "Property",
                  label: entry.label || "Payment",
                  amount: Number(entry.amount) || 0,
                  date: entry.date,
                  overdue: daysUntil < 0,
                  daysUntil,
                };
              })
          )
          .filter(
            (item): item is PaymentDueItem & { daysUntil: number } =>
              item !== null
          )
          .sort((a, b) => a.daysUntil - b.daysUntil)
          .map(({ daysUntil, ...item }) => item)
      : [];

    const attention =
      need.deposits || need.assets ? { maturities, paymentsDue } : null;

    // ---- This month --------------------------------------------------------
    const month = buildMonth(
      need.expenses,
      need.earnings,
      expenses.items,
      earnings.items
    );

    return { ready, worth, attention, month };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    need.deposits,
    need.ledger,
    need.assets,
    need.expenses,
    need.earnings,
    accounts.items,
    accounts.hasLoaded,
    banks.items,
    banks.hasLoaded,
    savings.items,
    savings.hasLoaded,
    earnings.items,
    earnings.hasLoaded,
    expenses.items,
    expenses.hasLoaded,
    ornaments.items,
    ornaments.hasLoaded,
    properties.items,
    properties.hasLoaded,
    rates.value,
    rates.loaded,
  ]);
};
