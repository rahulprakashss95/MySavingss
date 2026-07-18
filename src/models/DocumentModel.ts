import type { Attachable, Creatable, Owned } from "./common";

/** The fixed set of government IDs the picker offers. */
export const GOVERNMENT_DOCUMENT_TYPES = [
  "Aadhaar",
  "PAN",
  "Licence",
  "Voter ID",
  "Passport",
  "UAN"
] as const;

export type GovernmentDocumentType = (typeof GOVERNMENT_DOCUMENT_TYPES)[number];

/**
 * Documents belong to a person, not to whoever typed them in — the whole family
 * shares one vault, so every signed-in user sees every document, grouped by the
 * person it belongs to. `personName` is denormalised from `loginUsers` so the
 * list can render section headers without a second read.
 */
type PersonOwned = {
  /** `loginUsers` doc id of the person this document belongs to. */
  personId: string;
  personName: string;
};

export type GovernmentDocumentModel = PersonOwned & Owned & Attachable & {
  id: string;
  /** One of GOVERNMENT_DOCUMENT_TYPES. Typed loosely so older rows still read. */
  documentType: string;
  documentNumber: string;
  description: string;
};

export type BankDocumentModel = PersonOwned & Owned & {
  id: string;
  bankName: string;
  /**
   * The name as the bank has it, which routinely differs from the person's
   * display name — initials, a maiden name, or a joint holder. Optional:
   * blank means "same as the person it belongs to".
   */
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  description: string;
};

export type GovernmentDocumentInput = Creatable<GovernmentDocumentModel>;
export type BankDocumentInput = Creatable<BankDocumentModel>;
