import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
import { useAuth } from "../../../src/context/AuthContext";
import { useTheme } from "../../../src/context/ThemeContext";
import { canSeeModule, type ModuleKey } from "../../../src/models/common";

type TabDef = {
  /** Route folder under (tabs). */
  name: string;
  label: string;
  /** Outline when inactive, solid when active — the usual tab-bar idiom. */
  icon: React.ComponentProps<typeof Ionicons>["name"];
  activeIcon: React.ComponentProps<typeof Ionicons>["name"];
  /** Omitted for Home, which everyone reaches. */
  module?: ModuleKey;
};

// Mirrors the iOS NativeTabs list — same modules, order, and glyphs. Deposits
// now live inside Assets and Expenses inside Ledger, so both are gone as tabs.
const TABS: TabDef[] = [
  { name: "home", label: "Home", icon: "home-outline", activeIcon: "home" },
  { name: "ledger", label: "Ledger", icon: "book-outline", activeIcon: "book", module: "ledger" },
  { name: "assets", label: "Assets", icon: "cube-outline", activeIcon: "cube", module: "assets" },
  { name: "documents", label: "Documents", icon: "document-text-outline", activeIcon: "document-text", module: "documents" },
  { name: "settings", label: "Settings", icon: "settings-outline", activeIcon: "settings" },
];

/**
 * Bottom tab bar for web and Android — the base `_layout` fallback (only iOS
 * resolves to `_layout.ios.tsx`, the native UITabBar / Liquid Glass). Uses the
 * standard `expo-router/js-tabs` `Tabs`, which is `withLayoutContext` over
 * expo-router's vendored bottom-tabs — the same bridge `Stack` uses, so child
 * stacks get their navigation context on native (the headless `expo-router/ui`
 * Tabs did not, throwing "Couldn't find a navigation context" on Android).
 * Access rule as everywhere: admins see all, others see their granted modules;
 * hidden tabs use `href: null`. Each module's own `_layout` Stack draws the
 * header, so the tab level is headerless.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();
  // A tab shows when the member holds any tile inside its module (admins: all).
  const canSee = (module?: ModuleKey) => !module || canSeeModule(user, module);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            // `null` hides the tab entirely for members without the module.
            href: canSee(tab.module) ? undefined : null,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons
                name={focused ? tab.activeIcon : tab.icon}
                size={size ?? 22}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
