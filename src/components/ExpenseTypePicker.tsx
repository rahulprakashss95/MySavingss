import React from "react";
import { ExpenseTypeModel } from "../models/ExpenseModel";
import { useCollectionState } from "../query/hooks";
import ExpenseTypeForm from "./forms/ExpenseTypeForm";
import SearchableSelect from "./SearchableSelect";

type IExpenseTypePicker = {
  selectedId: string;
  /** Both id and name are lifted: the name is denormalised onto the expense. */
  onSelect: (typeId: string, typeName: string) => void;
  /** Stored name for `selectedId`, so the field stays filled on edit. */
  selectedName?: string;
};

/**
 * A searchable expense-type dropdown. Types are served from the cache;
 * "Add type" opens the full type form in a popup and selects the new record on
 * save — no leaving the expense form.
 */
const ExpenseTypePicker = ({
  selectedId,
  onSelect,
  selectedName,
}: IExpenseTypePicker) => {
  const { items } = useCollectionState<ExpenseTypeModel>("expenseTypes");

  return (
    <SearchableSelect
      label="Type"
      placeholder={items.length ? "Select a type" : "No types yet — add one"}
      selectedId={selectedId}
      selectedName={selectedName}
      options={items}
      onSelect={onSelect}
      addLabel="Add type"
      renderAddForm={({ onCreated }) => (
        <ExpenseTypeForm
          onSaved={(saved) => onCreated({ id: saved.id, name: saved.name })}
        />
      )}
    />
  );
};

export default ExpenseTypePicker;
