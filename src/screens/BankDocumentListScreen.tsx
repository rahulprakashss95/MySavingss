import React, { useMemo } from "react";
import { getBankDocuments } from "../../database/firebaseQuery";
import GroupedList, { useCollection } from "../components/GroupedList";
import GroupedRow from "../components/GroupedRow";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { BankDocumentModel } from "../models/DocumentModel";
import { groupByPerson, groupDigits } from "../utils/documents";
import { NavigationProp } from "../utils/Utils";

type Props = {
  navigation: NavigationProp;
};

const BankDocumentListScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items, ...list } = useCollection<BankDocumentModel>(
    getBankDocuments,
    navigation,
    "Unable to load bank accounts"
  );

  const sections = useMemo(() => groupByPerson(items, user), [items, user]);

  const navigateAddEdit = (data: BankDocumentModel | null) => {
    navigation.navigate("BankDocumentAddEdit", { documentData: data });
  };

  return (
    <GroupedList
      {...list}
      sections={sections}
      keyOf={(item) => item.id}
      noun="account"
      addLabel="Add bank account"
      onAdd={() => navigateAddEdit(null)}
      emptyIcon="business-outline"
      emptyTitle="No bank accounts yet"
      emptyBody="Tap the + button to save the family's first account."
      renderItem={(item, position) => (
        <GroupedRow
          icon="business-outline"
          accent={colors.accentViolet}
          title={item.bankName}
          value={groupDigits(item.accountNumber)}
          copyValue={item.accountNumber}
          valueLabel="Account number"
          subtitle={item.accountHolderName || undefined}
          meta={item.ifsc ? `IFSC ${item.ifsc}` : undefined}
          metaCopyValue={item.ifsc || undefined}
          metaLabel="IFSC"
          description={item.description}
          onPress={() => navigateAddEdit(item)}
          position={position}
        />
      )}
    />
  );
};

export default BankDocumentListScreen;
