import React, { useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";
import ExpenseTypeForm from "../components/forms/ExpenseTypeForm";
import { useTheme } from "../context/ThemeContext";
import { ExpenseTypeModel } from "../models/ExpenseModel";
import { ThemeColors } from "../utils/Color";
import { NavigationProp, RouteProps } from "../utils/Utils";

type Props = {
  route: RouteProps;
  navigation: NavigationProp;
};

/** Thin wrapper: fields, save, and delete all live in the shared ExpenseTypeForm. */
const ExpenseTypeAddEditScreen = ({ route, navigation }: Props) => {
  const { expenseTypeData } = (route.params as any) || {};
  const type: ExpenseTypeModel | null = expenseTypeData || null;

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ExpenseTypeForm
        initial={type}
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

export default ExpenseTypeAddEditScreen;
