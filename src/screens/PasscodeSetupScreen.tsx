import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import PasscodePad from "../components/PasscodePad";
import { usePasscode } from "../context/PasscodeContext";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";
import { showToast } from "../utils/Utils";

type EnableStep = "create" | "confirm";

/**
 * Set-up flow reached from the Settings toggle. In `disable` mode it asks for
 * the current passcode before turning the feature off; otherwise it takes a new
 * code and a confirmation before enabling it.
 */
const PasscodeSetupScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { enablePasscode, disablePasscode, verify } = usePasscode();

  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isDisabling = mode === "disable";

  const [step, setStep] = useState<EnableStep>("create");
  const [firstCode, setFirstCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Forces the pad back to empty between steps / after an error.
  const [resetSignal, setResetSignal] = useState(0);
  const resetPad = () => setResetSignal((n) => n + 1);

  const finish = (message: string) => {
    showToast("success", message, "", "bottom");
    router.back();
  };

  const handleDisable = async (code: string) => {
    setBusy(true);
    setError(null);
    try {
      if (!(await verify(code))) {
        setError("Incorrect passcode. Try again.");
        return;
      }
      await disablePasscode();
      finish("Passcode turned off");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleEnable = async (code: string) => {
    if (step === "create") {
      setFirstCode(code);
      setStep("confirm");
      setError(null);
      resetPad();
      return;
    }
    // Confirm step.
    if (code !== firstCode) {
      setError("Passcodes don't match. Start again.");
      setStep("create");
      setFirstCode("");
      resetPad();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await enablePasscode(code);
      finish("Passcode turned on");
    } catch {
      setError("Couldn't save the passcode. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const padProps = isDisabling
    ? {
        title: "Enter current passcode",
        subtitle: "Confirm it to turn the passcode off",
        onComplete: handleDisable,
      }
    : {
        title: step === "create" ? "Create a passcode" : "Confirm passcode",
        subtitle:
          step === "create"
            ? "Choose a 4-digit code for opening the app"
            : "Enter the code again to confirm",
        onComplete: handleEnable,
      };

  return (
    <View style={styles.container}>
      <PasscodePad
        {...padProps}
        error={error}
        disabled={busy}
        resetSignal={resetSignal}
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
  });

export default PasscodeSetupScreen;
