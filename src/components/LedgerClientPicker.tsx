import React from "react";
import { LedgerClientModel } from "../models/LedgerModel";
import { useCollectionState } from "../query/hooks";
import LedgerClientForm from "./forms/LedgerClientForm";
import SearchableSelect from "./SearchableSelect";

type ILedgerClientPicker = {
  selectedId: string;
  /** Both id and name are lifted: the name is denormalised onto the entry. */
  onSelect: (clientId: string, clientName: string) => void;
  /** The stored name for `selectedId`, so the field stays filled on edit. */
  selectedName?: string;
};

/**
 * A searchable client dropdown for the ledger. The signed-in user's clients are
 * served from the cache; "Add client" opens the full client form in a popup and
 * selects the new record on save — no leaving the earning/saving form.
 */
const LedgerClientPicker = ({
  selectedId,
  onSelect,
  selectedName,
}: ILedgerClientPicker) => {
  const { items } = useCollectionState<LedgerClientModel>("ledgerClients");

  return (
    <SearchableSelect
      label="Client"
      placeholder={items.length ? "Select a client" : "No clients yet — add one"}
      selectedId={selectedId}
      selectedName={selectedName}
      options={items}
      onSelect={onSelect}
      addLabel="Add client"
      renderAddForm={({ onCreated }) => (
        <LedgerClientForm
          onSaved={(saved) => onCreated({ id: saved.id, name: saved.name })}
        />
      )}
    />
  );
};

export default LedgerClientPicker;
