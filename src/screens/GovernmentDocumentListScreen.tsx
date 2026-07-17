import React, { useMemo } from "react";
import AttachmentSection from "../components/AttachmentSection";
import GroupedList from "../components/GroupedList";
import { useCollectionState } from "../redux/hooks";
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
  const { items, ...list } =
    useCollectionState<GovernmentDocumentModel>("governmentDocuments");

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
          footer={<AttachmentSection attachments={item.attachments} />}
          onPress={() => navigateAddEdit(item)}
          position={position}
        />
      )}
    />
  );
};

export default GovernmentDocumentListScreen;
