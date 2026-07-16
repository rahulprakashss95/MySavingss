import type { Creatable, Owned } from "./common";

export type ClientModel = Owned & {
  id: string;
  mobile: MobileModel[] | null;
  name: string;
};

export type MobileModel = {
  id: string;
  pref: boolean;
  type: string;
  value: string;
};

export type ClientInput = Creatable<ClientModel>;

/**
 * `mobile` has been stored inconsistently over time — an array of objects, a
 * bare string, a keyed map, or null. Flatten any of those into plain numbers.
 */
export const clientMobileNumbers = (mobile: any): string[] => {
  if (!mobile) {
    return [];
  }
  let entries: any[];
  if (typeof mobile === "string") {
    entries = [mobile];
  } else if (Array.isArray(mobile)) {
    entries = mobile;
  } else {
    entries = Object.values(mobile);
  }
  return entries
    .map((entry: any) => (typeof entry === "string" ? entry : entry?.value))
    .map((value: any) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value && value !== "null" && value !== "undefined");
};

/** Builds the stored `mobile` array from a list of typed-in numbers. */
export const toMobileList = (numbers: string[]): MobileModel[] =>
  numbers
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value, index) => ({
      id: `${Date.now()}-${index}`,
      pref: index === 0,
      type: "Mobile",
      value,
    }));
