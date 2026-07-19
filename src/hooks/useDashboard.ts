import moment from "moment";
import { useMemo } from "react";

import { useAuth } from "../context/AuthContext";
import { BankModel } from "../models/BankModel";
import {
  EMPTY_METAL_RATES,
  OrnamentModel,
  PaymentEntry,
  PropertyModel,
} from "../models/AssetModel";
import { ModuleKey } from "../models/common";
import { ExpenseModel } from "../models/ExpenseModel";
import { FixedDepositModel } from "../models/FixedDepositModel";
import { EarningModel, SavingModel } from "../models/LedgerModel";
import { useCollectionState, useMetalRates } from "../redux/hooks";
import { ornamentTotals, propertyPortfolio } from "../utils/assets";
import { buildTotals, mergeBankNames, parseMaturity } from "../utils/deposits";
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
 * for the Home dashboard. Everything is gated by module access — a member only
 * ever sees numbers for modules they can open, admins see all. All figures come
 * from the same RTK cache the module screens use, so nothing is re-fetched.
 */
export const useDashboard = (): DashboardData => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canSee = (module: ModuleKey) =>
    isAdmin || !!user?.moduleAccess?.includes(module);

  const need = {
    deposits: canSee("deposits"),
    ledger: canSee("ledger"),
    assets: canSee("assets"),
    expenses: canSee("expenses"),
  };

  // Served from the shared store — fetched once per session, not on every focus.
  const fds = useCollectionState<FixedDepositModel>("fixedDeposits");
  const banks = useCollectionState<BankModel>("banks");
  const savings = useCollectionState<SavingModel>("savings");
  const earnings = useCollectionState<EarningModel>("earnings");
  const expenses = useCollectionState<ExpenseModel>("expenses");
  const ornaments = useCollectionState<OrnamentModel>("ornaments");
  const properties = useCollectionState<PropertyModel>("properties");
  const rates = useMetalRates();

  return useMemo(() => {
    const ready =
      (!need.deposits || (fds.hasLoaded && banks.hasLoaded)) &&
      (!need.ledger || (savings.hasLoaded && earnings.hasLoaded)) &&
      (!need.assets ||
        (ornaments.hasLoaded && properties.hasLoaded && rates.loaded)) &&
      (!need.expenses || expenses.hasLoaded);

    // ---- Worth -------------------------------------------------------------
    const ratesValue = rates.value ?? EMPTY_METAL_RATES;
    const depositsValue = need.deposits
      ? buildTotals(mergeBankNames(fds.items, banks.items)).amount
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
        label: "Deposits",
        value: depositsValue,
        href: "/deposits/overview",
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
      ? fds.items
          .map((deposit): MaturityItem | null => {
            const maturity = parseMaturity(deposit.maturityDate);
            if (!maturity) return null;
            const daysUntil = maturity.startOf("day").diff(today, "days");
            if (daysUntil > UPCOMING_DAYS) return null;
            return {
              id: deposit.id,
              bankName: deposit.name || "Deposit",
              amount: Number(deposit.amount) || 0,
              date: deposit.maturityDate,
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
    fds.items,
    fds.hasLoaded,
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
