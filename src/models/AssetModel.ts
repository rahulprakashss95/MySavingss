/** Precious metals, in the order the list groups them. */
export const ORNAMENT_TYPES = ["Gold", "Silver", "Diamond", "Platinum"] as const;

/** Spelled out under the weight field, so the conversion isn't a mystery. */
export const GRAMS_PER_PAWN_LABEL = "1 pawn = 8 grams";
export const CENTS_PER_ACRE_LABEL = "1 acre = 100 cents";

/** Gold purity. Only gold is karated — silver and stones are not. */
export const GOLD_KARATS = ["24K", "22K", "18K"] as const;

export type GoldKarat = (typeof GOLD_KARATS)[number];

/**
 * Fraction of pure gold, used to scale the 24K spot rate. 22K is 22/24 and 18K
 * is 18/24, which is where the familiar 0.916 and 0.75 come from.
 */
export const KARAT_PURITY: Record<string, number> = {
  "24K": 1,
  "22K": 22 / 24,
  "18K": 18 / 24,
};

/**
 * Rows written before karat existed carry none. Indian jewellery is
 * overwhelmingly 22K, so that is the least-wrong assumption — and the overview
 * says so rather than valuing those rows as pure gold.
 */
export const DEFAULT_GOLD_KARAT: GoldKarat = "22K";

export const PROPERTY_TYPES = [
  "Home",
  "Land",
  "Farm Land",
  "Car",
  "Bike",
] as const;

/** Only these hold an area. A car has no cents. */
export const LAND_PROPERTY_TYPES: readonly string[] = ["Home", "Land", "Farm Land"];

export type OrnamentType = (typeof ORNAMENT_TYPES)[number];
export type PropertyType = (typeof PROPERTY_TYPES)[number];

/** Whose asset this is. Mirrors how documents are owned. */
type PersonOwned = {
  /** `loginUsers` doc id of the holder. */
  personId: string;
  personName: string;
};

export type OrnamentModel = PersonOwned & {
  id: string;
  /** One of ORNAMENT_TYPES. Typed loosely so older rows still read. */
  ornamentType: string;
  /** What the piece is, e.g. "Necklace". */
  name: string;
  /** One of GOLD_KARATS. Empty for anything that isn't gold. */
  karat: string;
  /** How many identical pieces this row stands for. */
  count: string;
  /** The canonical weight. Pawn is derived from it, never stored. */
  grams: string;
  description: string;
};

/**
 * How a property was paid for. `full` needs no schedule; the other two are the
 * same list of entries, differing only in whether an entry is a plan (an
 * installment you will pay) or a record (a loan payment you did pay).
 */
export type PaymentMode = "full" | "installments" | "loan";

export type PaymentEntry = {
  /** Client-generated: these live inside the property document, not their own. */
  id: string;
  /** Free label, e.g. "Registration" or "EMI 4". Optional. */
  label: string;
  /** Due date for an installment; payment date for a loan entry. DATE_FORMAT. */
  date: string;
  amount: string;
  paid: boolean;
};

export type PropertyModel = PersonOwned & {
  id: string;
  /** One of PROPERTY_TYPES. */
  propertyType: string;
  /** What to call it, e.g. "Chennai flat". */
  name: string;
  /** The canonical area. Acres are derived from it. Blank for cars and bikes. */
  cents: string;
  description: string;

  paymentMode: PaymentMode;
  /** Agreed price, or the loan's principal. */
  totalAmount: string;
  /** Loan only. */
  lender: string;
  interestRate: string;
  entries: PaymentEntry[];
};

export type OrnamentInput = Omit<OrnamentModel, "id">;
export type PropertyInput = Omit<PropertyModel, "id">;

/**
 * Shared across the family: one rate, stored once, so everyone's overview
 * agrees. Rates are per gram in rupees. Diamond and platinum aren't valued —
 * a stone's worth is a valuation, not a spot price.
 */
export type MetalRates = {
  goldPerGram: string;
  silverPerGram: string;
  /** ISO timestamp of the last fetch or manual save. */
  updatedAt: string;
};

export const EMPTY_METAL_RATES: MetalRates = {
  goldPerGram: "",
  silverPerGram: "",
  updatedAt: "",
};
