import React, { useMemo } from "react";
import AttachmentSection from "../components/AttachmentSection";
import GroupedList from "../components/GroupedList";
import { useCollectionState, useOwnerName } from "../query/hooks";
import GroupedRow from "../components/GroupedRow";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { GovernmentDocumentModel } from "../models/DocumentModel";
import { groupByOwner, groupDigits } from "../utils/documents";
import { useRouter } from "expo-router";

const GovernmentDocumentListScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items, ...list } =
    useCollectionState<GovernmentDocumentModel>("governmentDocuments");
  const nameOf = useOwnerName();

  const sections = useMemo(
    () => groupByOwner(items, user, nameOf),
    [items, user, nameOf]
  );

  const navigateAddEdit = (data: GovernmentDocumentModel | null) => {
    router.push(
      data ? `/documents/government/${data.id}` : "/documents/government/new"
    );
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
