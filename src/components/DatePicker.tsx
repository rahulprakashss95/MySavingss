import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useMemo, useState } from "react";
import moment from "moment";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";
import { DATE_FORMAT } from "../utils/deposits";
import { currentOS } from "../utils/Utils";

type IDatePicker = {
  label: string;
  dateValue: string;
  onDateChange: (date: any) => void;
};

/** The value format `<input type="date">` requires. */
const ISO_FORMAT = "YYYY-MM-DD";

/**
 * The exact stack react-native-web applies to Text, so the web date input's
 * value renders in the same font as the app's other inputs.
 */
const FONT_STACK =
  '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

const parseDisplayDate = (dateString: string) => {
  const parsed = moment(dateString, DATE_FORMAT, true);
  return parsed.isValid() ? parsed : null;
};

const DatePicker = (props: IDatePicker) => {
  const { label, dateValue, onDateChange } = props;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const parsed = parseDisplayDate(dateValue);

  const handleConfirm = (date: any) => {
    setShowDatePicker(false);
    onDateChange(moment(date).format(DATE_FORMAT));
  };

  // `@react-native-community/datetimepicker` has no web implementation — it
  // renders null and warns — so on web drive a real <input type="date">.
  if (currentOS === "web") {
    return (
      <View>
        <Text style={styles.label}>{label}</Text>
        <input
          type="date"
          aria-label={label}
          value={parsed ? parsed.format(ISO_FORMAT) : ""}
          onChange={(event) => {
            const value = event.target.value;
            const next = moment(value, ISO_FORMAT, true);
            onDateChange(next.isValid() ? next.format(DATE_FORMAT) : "");
          }}
          style={{
            width: "100%",
            // Mobile browsers give date inputs an intrinsic min width and native
            // chrome that overflow the card without these three.
            minWidth: 0,
            boxSizing: "border-box",
            WebkitAppearance: "none",
            MozAppearance: "none",
            appearance: "none",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: colors.border,
            backgroundColor: colors.inputBackground,
            color: colors.text,
            borderRadius: 10,
            paddingTop: 14,
            paddingBottom: 14,
            paddingLeft: 12,
            paddingRight: 12,
            marginBottom: 18,
            fontSize: 16,
            // iOS centers the value by default; keep it left like the other fields.
            textAlign: "left",
            // Form controls don't inherit page font — set the same system stack
            // react-native-web uses for Text so the value matches sibling inputs.
            fontFamily: FONT_STACK,
            // Without this the browser's calendar glyph stays black on dark.
            colorScheme: isDark ? "dark" : "light",
          }}
        />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.dateInput}
      >
        <Text style={parsed ? styles.dateText : styles.datePlaceholder}>
          {parsed ? parsed.format(DATE_FORMAT) : "Select a date"}
        </Text>
      </TouchableOpacity>
      <DateTimePickerModal
        date={parsed ? parsed.toDate() : new Date()}
        isVisible={showDatePicker}
        isDarkModeEnabled={isDark}
        mode="date"
        display={currentOS === "ios" ? "inline" : "spinner"}
        onConfirm={handleConfirm}
        onCancel={() => {
          // Deferred a tick: dismissing the native modal in the same frame as
          // the state update can leave it stuck. Kept from the original.
          setTimeout(() => setShowDatePicker(false), 0);
        }}
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    label: {
      // Matches the field labels on the deposit form.
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 8,
      color: colors.text,
    },
    dateInput: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      padding: 15,
      marginBottom: 18,
    },
    dateText: {
      fontSize: 16,
      color: colors.text,
      minHeight: 19,
    },
    datePlaceholder: {
      fontSize: 16,
      color: colors.placeholder,
      minHeight: 19,
    },
  });

export default DatePicker;
