import { cookies } from "next/headers";

export const ACTIVE_PROPERTY_COOKIE = "active_property_id";

export async function getActivePropertyId() {
  const cookieStore = await cookies();
  const cookiePropertyId = cookieStore.get(ACTIVE_PROPERTY_COOKIE)?.value?.trim() ?? "";

  if (cookiePropertyId) {
    return cookiePropertyId;
  }

  return process.env.DEMO_PROPERTY_ID?.trim() ?? "";
}