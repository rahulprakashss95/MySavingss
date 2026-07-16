import React, { useMemo } from "react";
import GroupedList from "../components/GroupedList";
import { useCollectionState } from "../redux/hooks";
import GroupedRow from "../components/GroupedRow";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { LedgerClientModel } from "../models/LedgerModel";
import { byText } from "../utils/grouping";
import { NavigationProp } from "../utils/Utils";

type Props = {
  navigation: NavigationProp;
};

/** Phone and email on one line, whichever of them exists. */
const contactLine = (client: LedgerClientModel) =>
  [client.phone, client.email].filter(Boolean).join(" · ");

const LedgerClientListScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items, ...list } =
    useCollectionState<LedgerClientModel>("ledgerClients");

  // Private to one login and usually short, so a flat alphabetical list reads
  // cleaner than letter headings — one section, headers hidden.
  const sections = useMemo(
    () => [
      {
        key: "all",
        title: "",
        data: [...items].sort((a, b) => byText(a.name, b.name)),
      },
    ],
    [items]
  );

  const navigateAddEdit = (data: LedgerClientModel | null) => {
    navigation.navigate("LedgerClientAddEdit", { clientData: data });
  };

  return (
    <GroupedList
      {...list}
      sections={sections}
      hideSectionHeaders
      keyOf={(item) => item.id}
      noun="client"
      addLabel="Add client"
      onAdd={() => navigateAddEdit(null)}
      emptyIcon="people-outline"
      emptyTitle="No clients yet"
      emptyBody="Tap the + button to add whoever pays you."
      renderItem={(item, position) => (
        <GroupedRow
          icon="person-outline"
          accent={colors.accentViolet}
          value={item.name}
          // In subtitle, not title: title renders uppercase and would mangle
          // an email address.
          subtitle={contactLine(item) || undefined}
          description={item.description}
          onPress={() => navigateAddEdit(item)}
          position={position}
        />
      )}
    />
  );
};

export default LedgerClientListScreen;
