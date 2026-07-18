import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../navigation/routeTypes";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import type { ModuleKey } from "../models/common";
import { navigationRef } from "../navigation/navigationRef";
import { ThemeColors } from "../utils/Color";

type ScreenName = keyof RootStackParamList;
type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Tab = {
  label: string;
  /** Outline when inactive, solid when active — the usual tab-bar idiom. */
  icon: IconName;
  activeIcon: IconName;
  /** Where the tab lands: the module's hub screen. */
  screen: ScreenName;
  /** Omitted for Home, which everyone can reach. */
  module?: ModuleKey;
  /**
   * Every screen that belongs under this tab, so the tab stays lit while you
   * are deep inside it. Listed rather than inferred: route names don't share a
   * prefix per module ("OverView" is a deposits screen, "Banks" is too), and a
   * guessy rule would light the wrong tab.
   */
  routes: ScreenName[];
};

const TABS: Tab[] = [
  {
    label: "Home",
    icon: "home-outline",
    activeIcon: "home",
    screen: "Home",
    routes: ["Home"],
  },
  {
    label: "Deposits",
    icon: "card-outline",
    activeIcon: "card",
    screen: "Deposit",
    module: "deposits",
    routes: [
      "Deposit",
      "FixedDepositList",
      "FixedDepositAddEdit",
      "Banks",
      "BankAddEdit",
      "OverView",
    ],
  },
  {
    label: "Documents",
    icon: "document-text-outline",
    activeIcon: "document-text",
    screen: "Documents",
    module: "documents",
    routes: [
      "Documents",
      "GovernmentDocumentList",
      "GovernmentDocumentAddEdit",
      "BankDocumentList",
      "BankDocumentAddEdit",
    ],
  },
  {
    label: "Assets",
    icon: "cube-outline",
    activeIcon: "cube",
    screen: "Assets",
    module: "assets",
    routes: [
      "Assets",
      "OrnamentList",
      "OrnamentAddEdit",
      "PropertyList",
      "PropertyAddEdit",
      "PropertyPayments",
      "AssetOverview",
    ],
  },
  {
    label: "Ledger",
    icon: "book-outline",
    activeIcon: "book",
    screen: "Ledger",
    module: "ledger",
    routes: [
      "Ledger",
      "LedgerClientList",
      "LedgerClientAddEdit",
      "EarningList",
      "EarningAddEdit",
      "SavingList",
      "SavingAddEdit",
      "LedgerOverview",
    ],
  },
  {
    label: "Expenses",
    icon: "receipt-outline",
    activeIcon: "receipt",
    screen: "Expenses",
    module: "expenses",
    routes: [
      "Expenses",
      "ExpenseList",
      "ExpenseAddEdit",
      "ExpenseTypeList",
      "ExpenseTypeAddEdit",
      "ExpenseOverview",
    ],
  },
];

/**
 * Add/edit screens end in a full-width save button and a delete link. A bar
 * across the bottom would crowd both and invite a mis-tap on the one screen
 * where a stray tap loses typing, so it stands down there.
 */
const hidesBar = (route: string) => route.endsWith("AddEdit");

/**
 * Persistent bottom navigation across the signed-in app.
 *
 * Deliberately not a `Tab.Navigator`: the app is one flat stack of ~35 screens,
 * and real tabs would mean splitting it into six nested stacks — a large change
 * that would also break every existing `navigate` between modules. This drives
 * the same stack through `navigationRef`, exactly as `SideDrawer` does, and the
 * drawer remains the way to reach sub-screens and Settings.
 *
 * Rendered as a sibling *below* the navigator rather than floating over it, so
 * it takes real layout space and no screen has to leave room for it.
 */
const BottomTabBar = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [route, setRoute] = useState<string | undefined>();

  // The bar lives outside NavigationContainer, so it can't use navigation
  // hooks — it subscribes to the ref instead. Without this it would never
  // notice the route changing and the highlight would stick on Home.
  useEffect(() => {
    const sync = () => {
      if (navigationRef.isReady()) {
        setRoute(navigationRef.getCurrentRoute()?.name);
      }
    };
    sync();
    return navigationRef.addListener("state", sync);
  }, []);

  const isAdmin = user?.role === "admin";
  // Same rule as the drawer: admins reach every module regardless of the list.
  const visible = TABS.filter(
    (tab) =>
      !tab.module || isAdmin || !!user?.moduleAccess?.includes(tab.module)
  );

  if (!route || hidesBar(route)) {
    return null;
  }

  const go = (tab: Tab) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(tab.screen as any);
    }
  };

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {visible.map((tab) => {
        // Settings, Profile and Admin belong to no tab, so nothing is lit there
        // — which is honest: the bar didn't take you to them.
        const active = tab.routes.includes(route as ScreenName);
        return (
          <Pressable
            key={tab.label}
            onPress={() => go(tab)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Ionicons
              name={active ? tab.activeIcon : tab.icon}
              size={22}
              color={active ? colors.primary : colors.textMuted}
            />
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      paddingTop: 8,
      paddingBottom: 8,
    },
    pressed: {
      opacity: 0.6,
    },
    label: {
      // Six tabs have to fit on a small phone, so this is deliberately small.
      fontSize: 10,
      fontWeight: "600",
      color: colors.textMuted,
    },
    labelActive: {
      color: colors.primary,
    },
  });

export default BottomTabBar;
