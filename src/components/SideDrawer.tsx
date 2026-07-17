import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { RootStackParamList } from "../../App";
import { APP_VERSION } from "../appVersion";
import { useAuth } from "../context/AuthContext";
import { useDrawer } from "../context/DrawerContext";
import { useTheme } from "../context/ThemeContext";
import { navigationRef } from "../navigation/navigationRef";
import { ModuleKey } from "../models/common";
import { ThemeColors, tint } from "../utils/Color";
import { confirmSignOut } from "./HeaderActions";

type ScreenName = keyof RootStackParamList;
type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Leaf = { label: string; icon: IconName; screen: ScreenName };
type Group = {
  label: string;
  icon: IconName;
  /** Module this group belongs to; only shown if the user can access it. */
  module: ModuleKey;
  children: Leaf[];
};
type Node = Leaf | Group;

// The drawer mirrors the app's screen hierarchy as a tree: top-level
// destinations plus one expandable group per module.
const TREE: Node[] = [
  { label: "Home", icon: "home-outline", screen: "Home" },
  {
    label: "Deposits",
    icon: "card-outline",
    module: "deposits",
    children: [
      { label: "Fixed Deposits", icon: "cash-outline", screen: "FixedDepositList" },
      { label: "Banks", icon: "business-outline", screen: "Banks" },
      { label: "Overview", icon: "pie-chart-outline", screen: "OverView" },
    ],
  },
  {
    label: "Documents",
    icon: "document-text-outline",
    module: "documents",
    children: [
      { label: "Government", icon: "shield-checkmark-outline", screen: "GovernmentDocumentList" },
      { label: "Bank", icon: "business-outline", screen: "BankDocumentList" },
    ],
  },
  {
    label: "Assets",
    icon: "cube-outline",
    module: "assets",
    children: [
      { label: "Ornaments", icon: "ribbon-outline", screen: "OrnamentList" },
      { label: "Properties", icon: "home-outline", screen: "PropertyList" },
      { label: "Overview", icon: "stats-chart-outline", screen: "AssetOverview" },
    ],
  },
  {
    label: "Ledger",
    icon: "book-outline",
    module: "ledger",
    children: [
      { label: "Earnings", icon: "trending-up-outline", screen: "EarningList" },
      { label: "Savings", icon: "wallet-outline", screen: "SavingList" },
      { label: "Clients", icon: "people-outline", screen: "LedgerClientList" },
      { label: "Overview", icon: "stats-chart-outline", screen: "LedgerOverview" },
    ],
  },
  {
    label: "Expenses",
    icon: "receipt-outline",
    module: "expenses",
    children: [
      { label: "Expenses", icon: "receipt-outline", screen: "ExpenseList" },
      { label: "Types", icon: "pricetags-outline", screen: "ExpenseTypeList" },
      { label: "Overview", icon: "stats-chart-outline", screen: "ExpenseOverview" },
    ],
  },
  { label: "Settings", icon: "settings-outline", screen: "Settings" },
];

const isGroup = (node: Node): node is Group => "children" in node;

const SideDrawer = () => {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const { isOpen, close } = useDrawer();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { width } = useWindowDimensions();
  const panelWidth = Math.min(320, width * 0.82);

  const translateX = useRef(new Animated.Value(-panelWidth)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const [activeRoute, setActiveRoute] = useState<string | undefined>();
  // Groups start expanded so their children are reachable in one tap.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Deposits: true,
    Documents: true,
    Assets: true,
    Ledger: true,
    Expenses: true,
  });

  // Animation can't use the native driver on web, and translateX/opacity are
  // both fine on the JS driver — keep it uniform across platforms.
  const useNative = Platform.OS !== "web";

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      if (navigationRef.isReady()) {
        setActiveRoute(navigationRef.getCurrentRoute()?.name);
      }
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: useNative,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 240,
          useNativeDriver: useNative,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -panelWidth,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: useNative,
        }),
        Animated.timing(backdrop, {
          toValue: 0,
          duration: 200,
          useNativeDriver: useNative,
        }),
      ]).start(({ finished }) => {
        // Only unmount if this close animation ran to completion — a rapid
        // re-open interrupts it and should keep the panel mounted.
        if (finished) {
          setMounted(false);
        }
      });
    }
  }, [isOpen, panelWidth]);

  if (!mounted) {
    return null;
  }

  const displayName = user?.name || user?.username || "Guest";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  const isAdmin = user?.role === "admin";
  const canAccess = (module: ModuleKey) =>
    isAdmin || !!user?.moduleAccess?.includes(module);
  // Hide module groups the member can't open; admins see everything, plus a
  // "Family Admin" destination.
  const visibleTree = TREE.filter((node) =>
    isGroup(node) ? canAccess(node.module) : true
  );
  const nodes: Node[] = isAdmin
    ? [
        ...visibleTree,
        { label: "Family Admin", icon: "shield-outline", screen: "Admin" },
      ]
    : visibleTree;

  const go = (screen: ScreenName) => {
    close();
    if (navigationRef.isReady()) {
      navigationRef.navigate(screen as any);
    }
  };

  const renderLeaf = (leaf: Leaf, nested: boolean) => {
    const active = activeRoute === leaf.screen;
    return (
      <Pressable
        key={leaf.label}
        onPress={() => go(leaf.screen)}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.row,
          nested && styles.rowNested,
          active && styles.rowActive,
          pressed && styles.rowPressed,
        ]}
      >
        <Ionicons
          name={leaf.icon}
          size={nested ? 18 : 20}
          color={active ? colors.primary : colors.textMuted}
          style={styles.rowIcon}
        />
        <Text
          style={[styles.rowLabel, active && styles.rowLabelActive]}
          numberOfLines={1}
        >
          {leaf.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, { opacity: backdrop }]}
        pointerEvents={isOpen ? "auto" : "none"}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        />
      </Animated.View>

      <Animated.View
        nativeID="homevault-drawer-panel"
        style={[
          styles.panel,
          { width: panelWidth, transform: [{ translateX }] },
        ]}
      >
        {/* The header already names the signed-in member, so it doubles as the
            way into their profile rather than the menu carrying a second row
            saying the same thing. */}
        <Pressable
          onPress={() => go("Profile")}
          accessibilityRole="button"
          accessibilityLabel="Open your profile"
          style={({ pressed }) => [
            styles.header,
            activeRoute === "Profile" && styles.headerActive,
            pressed && styles.rowPressed,
          ]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            {!!user?.username && (
              <Text style={styles.handle} numberOfLines={1}>
                @{user.username}
              </Text>
            )}
            {!!user?.familyName && (
              <Text style={styles.family} numberOfLines={1}>
                {user.familyName}
              </Text>
            )}
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textMuted}
          />
        </Pressable>

        <ScrollView
          style={styles.tree}
          contentContainerStyle={styles.treeContent}
          showsVerticalScrollIndicator={false}
        >
          {nodes.map((node) => {
            if (!isGroup(node)) {
              return renderLeaf(node, false);
            }
            const open = expanded[node.label];
            return (
              <View key={node.label}>
                <Pressable
                  onPress={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [node.label]: !prev[node.label],
                    }))
                  }
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <Ionicons
                    name={node.icon}
                    size={20}
                    color={colors.textMuted}
                    style={styles.rowIcon}
                  />
                  <Text style={styles.rowLabel}>{node.label}</Text>
                  <Ionicons
                    name={open ? "chevron-down" : "chevron-forward"}
                    size={16}
                    color={colors.textMuted}
                  />
                </Pressable>
                {open && node.children.map((child) => renderLeaf(child, true))}
              </View>
            );
          })}
        </ScrollView>

        <Text style={styles.version}>Version {APP_VERSION}</Text>

        <Pressable
          onPress={() => {
            close();
            confirmSignOut(signOut);
          }}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.logout,
            pressed && styles.rowPressed,
          ]}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={colors.negative}
            style={styles.rowIcon}
          />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
    panel: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      backgroundColor: colors.card,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.border,
      paddingTop: Platform.select({ ios: 54, android: 32, default: 24 }),
      shadowColor: colors.shadow,
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 16,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerActive: {
      backgroundColor: tint(colors.primary),
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(colors.primary),
    },
    avatarText: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.primary,
    },
    headerText: {
      flex: 1,
    },
    name: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      textTransform: "capitalize",
    },
    handle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    family: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
      marginTop: 4,
      textTransform: "capitalize",
    },
    tree: {
      flex: 1,
    },
    treeContent: {
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    rowNested: {
      paddingLeft: 30,
      paddingVertical: 10,
    },
    rowActive: {
      backgroundColor: tint(colors.primary),
    },
    rowPressed: {
      opacity: 0.6,
    },
    rowIcon: {
      marginRight: 14,
      width: 22,
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    rowLabelActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    version: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
      paddingHorizontal: 22,
      paddingTop: 12,
      paddingBottom: 12,
    },
    logout: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 22,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    logoutText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.negative,
    },
  });

export default SideDrawer;
