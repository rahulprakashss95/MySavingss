import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";
import { fromUnit, toUnit } from "../utils/assets";

type IDualUnitInput = {
  label: string;
  /** The stored value, in canonical units (grams, cents). */
  value: string;
  onChange: (canonical: string) => void;
  /** Suffix for the canonical field, e.g. "grams". */
  canonicalUnit: string;
  /** Suffix for the derived field, e.g. "pawn". */
  derivedUnit: string;
  /** How many canonical units make one derived unit. 8 g = 1 pawn. */
  perDerivedUnit: number;
};

/**
 * Two fields, one value. Only the canonical unit is stored; the derived one is
 * recomputed from it, so the two can never drift apart in the database.
 *
 * While the derived field has focus its text is left alone — otherwise typing
 * "1.5" would round-trip through the conversion after the "1." keystroke and
 * fight the cursor.
 */
const DualUnitInput = (props: IDualUnitInput) => {
  const { label, value, onChange, perDerivedUnit } = props;
  const [derivedText, setDerivedText] = useState(() =>
    toUnit(value, perDerivedUnit)
  );
  const [isEditingDerived, setIsEditingDerived] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const derivedValue = isEditingDerived
    ? derivedText
    : toUnit(value, perDerivedUnit);

  const handleCanonicalChange = (text: string) => {
    onChange(text);
  };

  const handleDerivedChange = (text: string) => {
    setDerivedText(text);
    onChange(fromUnit(text, perDerivedUnit));
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={[styles.field, styles.fieldSpacing]}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={handleCanonicalChange}
            placeholder="0"
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
          />
          <Text style={styles.unit}>{props.canonicalUnit}</Text>
        </View>

        <View style={styles.field}>
          <TextInput
            style={styles.input}
            value={derivedValue}
            onChangeText={handleDerivedChange}
            onFocus={() => {
              setDerivedText(toUnit(value, perDerivedUnit));
              setIsEditingDerived(true);
            }}
            onBlur={() => setIsEditingDerived(false)}
            placeholder="0"
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
          />
          <Text style={styles.unit}>{props.derivedUnit}</Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    row: {
      flexDirection: "row",
      marginBottom: 18,
    },
    field: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 12,
    },
    fieldSpacing: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    unit: {
      fontSize: 13,
      color: colors.textMuted,
      marginLeft: 6,
    },
  });

export default DualUnitInput;
