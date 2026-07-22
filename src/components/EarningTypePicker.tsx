import React from "react";
import { EarningTypeModel } from "../models/LedgerModel";
import { useCollectionState } from "../redux/hooks";
import EarningTypeForm from "./forms/EarningTypeForm";
import SearchableSelect from "./SearchableSelect";

type Props = {
  /** The chosen type — stored by name on the earning, so id === name here. */
  selectedName: string;
  onSelect: (typeName: string) => void;
};

/**
 * A searchable earning-type dropdown, backed entirely by the family's own
 * `earning_types` (mirrors `ExpenseTypePicker`). "Add type" opens the type form
 * in a popup and selects the new name — no leaving the earning form.
 *
 * Earnings store the type *name*, not an id (see `EarningModel`), so options use
 * the name as their id throughout.
 */
const EarningTypePicker = ({ selectedName, onSelect }: Props) => {
  const { items } = useCollectionState<EarningTypeModel>("earningTypes");

  return (
    <SearchableSelect
      label="Type"
      placeholder={items.length ? "Select a type" : "No types yet — add one"}
      selectedId={selectedName}
      selectedName={selectedName}
      options={items.map((t) => ({ id: t.name, name: t.name }))}
      onSelect={(id) => onSelect(id)}
      addLabel="Add type"
      renderAddForm={({ onCreated }) => (
        <EarningTypeForm
          onSaved={(saved) => onCreated({ id: saved.name, name: saved.name })}
        />
      )}
    />
  );
};

export default EarningTypePicker;
