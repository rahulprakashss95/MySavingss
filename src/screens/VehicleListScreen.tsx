import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import AttachmentSection from "../components/AttachmentSection";
import GroupedList from "../components/GroupedList";
import GroupedRow from "../components/GroupedRow";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { VehicleModel } from "../models/AssetModel";
import { useCollectionState, useOwnerName } from "../query/hooks";
import { groupByOwner } from "../utils/documents";
import { useRouter } from "expo-router";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/** A recognisable glyph per kind, so a car and a bike read apart at a glance. */
const iconFor = (vehicleType: string): IconName => {
  switch (vehicleType) {
    case "Bike":
    case "Scooter":
      return "bicycle-outline";
    case "Car":
      return "car-outline";
    default:
      return "car-sport-outline";
  }
};

/** "Car · Insured till 12-Jan-2027" — whichever half actually applies. */
const rowMeta = (vehicle: VehicleModel) =>
  [
    vehicle.vehicleType,
    vehicle.insuranceExpiry ? `Insured till ${vehicle.insuranceExpiry}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

const VehicleListScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items, ...list } = useCollectionState<VehicleModel>("vehicles");
  const nameOf = useOwnerName();

  // Grouped by owning member, so one person's vehicles stay together.
  const sections = useMemo(
    () => groupByOwner(items, user, nameOf),
    [items, user, nameOf]
  );

  const navigateAddEdit = (data: VehicleModel | null) => {
    router.push(data ? `/assets/vehicles/${data.id}` : "/assets/vehicles/new");
  };

  return (
    <GroupedList
      {...list}
      sections={sections}
      keyOf={(item) => item.id}
      noun="vehicle"
      addLabel="Add vehicle"
      onAdd={() => navigateAddEdit(null)}
      emptyIcon="car-outline"
      emptyTitle="No vehicles yet"
      emptyBody="Tap the + button to record the family's first vehicle."
      renderItem={(item, position) => (
        <GroupedRow
          icon={iconFor(item.vehicleType)}
          accent={colors.accentBlue}
          title={item.name}
          value={item.number || "—"}
          copyValue={item.number || undefined}
          valueLabel={item.number ? "Registration number" : undefined}
          meta={rowMeta(item) || undefined}
          description={item.description}
          footer={<AttachmentSection attachments={item.attachments} />}
          onPress={() => navigateAddEdit(item)}
          position={position}
        />
      )}
    />
  );
};

export default VehicleListScreen;
