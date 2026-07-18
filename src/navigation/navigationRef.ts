import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./routeTypes";

/**
 * A global navigation handle so components rendered *outside* the navigator
 * tree — like the app-wide SideDrawer overlay — can still route without a
 * screen's `navigation` prop.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const navigate = (name: keyof RootStackParamList) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any);
  }
};
