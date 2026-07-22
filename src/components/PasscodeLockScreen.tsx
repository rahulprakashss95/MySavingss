import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { usePasscode } from "../context/PasscodeContext";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors, tint } from "../utils/Color";
import PasscodePad from "./PasscodePad";

/**
 * Full-screen gate shown over the whole app at launch when a passcode is set and
 * a session was restored. Mounted by the root navigator; it never routes, it
 * simply covers everything until the code is entered (or the user logs out).
 */
const PasscodeLockScreen = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { verify, unlock } = usePasscode();
  const { signOut } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleComplete = async (code: string) => {
    setChecking(true);
    setError(null);
    try {
      if (await verify(code)) {
        unlock();
      } else {
        setError("Incorrect passcode. Try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <View style={styles.body}>
        <View style={styles.logo}>
          <Ionicons name="lock-closed" size={30} color={colors.primary} />
        </View>
        <PasscodePad
          title="Enter passcode"
          subtitle="HomeVault is locked"
          error={error}
          disabled={checking}
          onComplete={handleComplete}
        />
      </View>

      <Pressable
        onPress={signOut}
        accessibilityRole="button"
        hitSlop={8}
        style={styles.logout}
      >
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      // Sit above the side drawer and everything else in the tree.
      zIndex: 100,
      elevation: 100,
    },
    body: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    logo: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(colors.primary),
      marginBottom: 24,
    },
    logout: {
      paddingVertical: 12,
    },
    logoutText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.primary,
    },
  });

export default PasscodeLockScreen;
