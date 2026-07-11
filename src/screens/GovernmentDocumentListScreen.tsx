import React, { useMemo } from "react";
import { getGovernmentDocuments } from "../../database/firebaseQuery";
import GroupedList, { useCollection } from "../components/GroupedList";
import GroupedRow from "../components/GroupedRow";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { GovernmentDocumentModel } from "../models/DocumentModel";
import { groupByPerson, groupDigits } from "../utils/documents";
import { NavigationProp } from "../utils/Utils";

type Props = {
  navigation: NavigationProp;
};

const GovernmentDocumentListScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items, ...list } = useCollection<GovernmentDocumentModel>(
    getGovernmentDocuments,
    navigation,
    "Unable to load documents"
  );

  const sections = useMemo(() => groupByPerson(items, user), [items, user]);

  const navigateAddEdit = (data: GovernmentDocumentModel | null) => {
    navigation.navigate("GovernmentDocumentAddEdit", { documentData: data });
  };

  return (
    <GroupedList
      {...list}
      sections={sections}
      keyOf={(item) => item.id}
      noun="document"
      addLabel="Add document"
      onAdd={() => navigateAddEdit(null)}
      emptyIcon="shield-checkmark-outline"
      emptyTitle="No documents yet"
      emptyBody="Tap the + button to save the family's first government ID."
      renderItem={(item, position) => (
        <GroupedRow
          icon="shield-checkmark-outline"
          accent={colors.accentBlue}
          title={item.documentType}
          value={groupDigits(item.documentNumber)}
          copyValue={item.documentNumber}
          valueLabel={`${item.documentType} number`}
          description={item.description}
          onPress={() => navigateAddEdit(item)}
          position={position}
        />
      )}
    />
  );
};

export default GovernmentDocumentListScreen;
