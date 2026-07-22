import Ionicons from "@expo/vector-icons/Ionicons";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useAuth } from "../../../src/context/AuthContext";
import { canSeeModule, type ModuleKey } from "../../../src/models/common";

type TabDef = {
  /** Route folder under (tabs). */
  name: string;
  label: string;
  /** Ionicons glyph; also used as the SF Symbol-less cross-platform icon. */
  icon: React.ComponentProps<typeof Ionicons>["name"];
  /** Omitted for Home, which everyone reaches. */
  module?: ModuleKey;
};

// Mirrors the base _layout TABS list — same modules, order, and glyphs.
// Deposits now live inside Assets and Expenses inside Ledger.
const TABS: TabDef[] = [
  { name: "home", label: "Home", icon: "home" },
  { name: "ledger", label: "Ledger", icon: "book", module: "ledger" },
  { name: "assets", label: "Assets", icon: "cube", module: "assets" },
  { name: "documents", label: "Documents", icon: "document-text", module: "documents" },
  // No `module`: games are open to everyone, like Home — no tile-gating.
  { name: "games", label: "Games", icon: "game-controller" },
  { name: "settings", label: "Settings", icon: "settings" },
];

/**
 * iOS-only native bottom tabs — a real UITabBar (Liquid Glass on iOS 26). This
 * uses `react-native-screens`' experimental native tabs, which need the New
 * Architecture; Android and web use the headless `expo-router/ui` bar in the
 * base `_layout.tsx` instead (on Android without new-arch, NativeTabs' trigger
 * throws "Couldn't find a navigation context"). Same access rule as everywhere:
 * admins see everything, others see their granted modules.
 */
export default function TabsLayout() {
  const { user } = useAuth();
  // A tab shows when the member holds any tile inside its module (admins: all).
  const canSee = (module?: ModuleKey) => !module || canSeeModule(user, module);

  return (
    <NativeTabs>
      {TABS.filter((tab) => canSee(tab.module)).map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Icon
            src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name={tab.icon} />}
          />
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
