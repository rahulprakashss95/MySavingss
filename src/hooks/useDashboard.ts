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
import { monthKey, parseLedgerDate, sumAmount } from "../utils/ledger";

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
  /** null when the member has no expenses module. */
  month: {
    expenses: number;
    earnings: number | null;
    lastMonthExpenses: number;
    sparkline: { label: string; value: number }[];
  } | null;
};

const UPCOMING_DAYS = 60;

/**
 * Aggregates the family's holdings, upcoming events and this month's spending
 * for the Home dashboard. Everything is gated by module access â€” a member only
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
  };

  // Served from the shared store â€” fetched once per session, not on every focus.
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
    // Property "equity" â€” what's actually paid, not the sticker value still owed.
    const propertyEquity = portfolio?.paid ?? 0;

    const segments: WorthSegment[] = [];
    if (need.deposits)
      segments.push({
        key: "deposits",
        label: "Accounts",
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
                institution !== "â€”"
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
    const thisKey = moment().format("YYYY-MM");
    const lastKey = moment().subtract(1, "month").format("YYYY-MM");

    const month = need.expenses
      ? {
          expenses: sumAmount(
            expenses.items.filter((e) => monthKey(e.date) === thisKey)
          ),
          earnings: need.ledger
            ? sumAmount(
                earnings.items.filter((e) => monthKey(e.date) === thisKey)
              )
            : null,
          lastMonthExpenses: sumAmount(
            expenses.items.filter((e) => monthKey(e.date) === lastKey)
          ),
          sparkline: Array.from({ length: 6 }, (_, i) => {
            const m = moment().subtract(5 - i, "months");
            const key = m.format("YYYY-MM");
            return {
              label: m.format("MMM"),
              value: sumAmount(
                expenses.items.filter((e) => monthKey(e.date) === key)
              ),
            };
          }),
        }
      : null;

    return { ready, worth, attention, month };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    need.deposits,
    need.ledger,
    need.assets,
    need.expenses,
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
