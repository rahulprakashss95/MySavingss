import React, { PropsWithChildren } from "react";
import { View } from "react-native";

type Props = PropsWithChildren<{ active: boolean }>;

/**
 * Blocks all touch interaction with its children when `active`, so someone
 * viewing another member's public record can read every field but not tap,
 * type, or open a picker. The dimming signals the form is locked; the
 * surrounding ScrollView still scrolls because the block sits on the children,
 * not the scroll container.
 */
const ReadOnlyGuard = ({ active, children }: Props) => (
  <View
    pointerEvents={active ? "none" : "auto"}
    style={active ? { opacity: 0.55 } : undefined}
  >
    {children}
  </View>
);

export default ReadOnlyGuard;
