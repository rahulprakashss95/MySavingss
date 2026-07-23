import React, { useMemo } from "react";
import GroupedList from "../components/GroupedList";
import { useCollectionState } from "../query/hooks";
import GroupedRow from "../components/GroupedRow";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { LedgerClientModel } from "../models/LedgerModel";
import { formatPhone } from "../utils/countryCodes";
import { byText } from "../utils/grouping";
import { useRouter } from "expo-router";

/** Phone and email on one line, whichever of them exists. */
const contactLine = (client: LedgerClientModel) =>
  [formatPhone(client.dialCode, client.phone), client.email]
    .filter(Boolean)
    .join(" · ");

const LedgerClientListScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items, ...list } =
    useCollectionState<LedgerClientModel>("ledgerClients");

  // Private to one login and usually short, so a flat alphabetical list reads
  // cleaner than letter headings — one section, headers hidden. Stay empty when
  // there are no clients so GroupedList's empty state shows (a SectionList only
  // renders ListEmptyComponent when there are zero sections).
  const sections = useMemo(
    () =>
      items.length
        ? [
            {
              key: "all",
              title: "",
              data: [...items].sort((a, b) => byText(a.name, b.name)),
            },
          ]
        : [],
    [items]
  );

  const navigateAddEdit = (data: LedgerClientModel | null) => {
    router.push(data ? `/ledger/clients/${data.id}` : "/ledger/clients/new");
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
