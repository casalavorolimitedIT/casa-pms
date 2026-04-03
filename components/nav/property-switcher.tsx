import { getPropertySwitcherData } from "@/app/dashboard/actions/property-switcher-data";
import { PropertySwitcherClient } from "./property-switcher-client";

export async function PropertySwitcher() {
  const { properties, selectedId } = await getPropertySwitcherData();

  return (
    <PropertySwitcherClient
      initialProperties={properties}
      initialSelectedId={selectedId}
    />
  );
}
