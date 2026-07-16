import React, { useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";
import BankForm from "../components/forms/BankForm";
import { useTheme } from "../context/ThemeContext";
import { BankModel } from "../models/BankModel";
import { ThemeColors } from "../utils/Color";
import { NavigationProp, RouteProps } from "../utils/Utils";

type Props = {
  route: RouteProps;
  navigation: NavigationProp;
};

/** Thin wrapper: the fields, save, and delete all live in the shared BankForm. */
const BankAddEditScreen = ({ route, navigation }: Props) => {
  const { bankData } = (route.params as any) || {};
  const bank: BankModel | null = bankData || null;

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <BankForm
        initial={bank}
        onSaved={() => navigation.goBack()}
        onDeleted={() => navigation.goBack()}
      />
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
  });

export default BankAddEditScreen;
