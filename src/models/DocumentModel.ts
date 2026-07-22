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
 * The whole family shares one vault: every signed-in member sees every public
 * document, grouped by the member who owns it. Ownership is `ownerId` (from
 * `Owned`) — a document is attributed to whoever created it, and the list
 * resolves that member's name at render time (see `useOwnerName`), so there is
 * no denormalised person field to keep in sync.
 */
export type GovernmentDocumentModel = Owned & Attachable & {
  id: string;
  /** One of GOVERNMENT_DOCUMENT_TYPES. Typed loosely so older rows still read. */
  documentType: string;
  documentNumber: string;
  description: string;
};

export type BankDocumentModel = Owned & {
  id: string;
  bankName: string;
  /**
   * The name as the bank has it, which routinely differs from the owner's
   * display name — initials, a maiden name, or a joint holder. Optional:
   * blank means "same as the member it belongs to".
   */
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  description: string;
};

export type GovernmentDocumentInput = Creatable<GovernmentDocumentModel>;
export type BankDocumentInput = Creatable<BankDocumentModel>;
