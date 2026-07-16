import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { displayNameOf } from "../models/LoginUserModel";
import SearchableSelect from "./SearchableSelect";

type IPersonPicker = {
  selectedId: string;
  /** Both id and display name are lifted: the name is denormalised onto the row. */
  onSelect: (personId: string, personName: string) => void;
  /** On a new document, preselect whoever is signed in. */
  autoSelectSelf?: boolean;
  /** Stored name for `selectedId`, so a record owned by someone else still shows. */
  selectedName?: string;
};

/**
 * Whose document is this? Each member records only their own data, so the only
 * option offered is the signed-in user — other family members' names are never
 * listed, and a record can't be attributed to someone else. A record opened
 * read-only that belongs to someone else falls back to its stored name.
 */
const PersonPicker = ({
  selectedId,
  onSelect,
  autoSelectSelf,
  selectedName,
}: IPersonPicker) => {
  const { user } = useAuth();
  const selfName = user ? displayNameOf(user) : "";
  const options = user ? [{ id: user.id, name: selfName }] : [];

  useEffect(() => {
    if (!autoSelectSelf || selectedId || !user) {
      return;
    }
    onSelect(user.id, selfName);
  }, [user]);

  return (
    <SearchableSelect
      label="Belongs to"
      placeholder="Select a person"
      selectedId={selectedId}
      selectedName={selectedName ?? selfName}
      options={options}
      onSelect={onSelect}
    />
  );
};

export default PersonPicker;
