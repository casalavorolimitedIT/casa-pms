import { createClient } from "@/lib/supabase/server";

function normalizeLinkPair(guestA: string, guestB: string) {
  if (guestA === guestB) {
    throw new Error("Cannot link a guest to itself");
  }

  return guestA < guestB
    ? { sourceGuestId: guestA, linkedGuestId: guestB }
    : { sourceGuestId: guestB, linkedGuestId: guestA };
}

export async function linkGuestsAcrossProperties(input: {
  sourceGuestId: string;
  linkedGuestId: string;
  organizationId: string;
}) {
  const supabase = await createClient();
  const pair = normalizeLinkPair(input.sourceGuestId, input.linkedGuestId);

  const { error } = await supabase
    .from("cross_property_guest_links")
    .upsert(
      {
        organization_id: input.organizationId,
        source_guest_id: pair.sourceGuestId,
        linked_guest_id: pair.linkedGuestId,
      },
      { onConflict: "source_guest_id,linked_guest_id" },
    );

  if (error) return { error: error.message };
  return { success: true };
}

export async function getLinkedGuestsForGuest(guestId: string) {
  const supabase = await createClient();

  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .select("id, organization_id")
    .eq("id", guestId)
    .maybeSingle();

  if (guestError) return { links: [], error: guestError.message };
  if (!guest?.organization_id) return { links: [] };

  const { data: links, error } = await supabase
    .from("cross_property_guest_links")
    .select("id, source_guest_id, linked_guest_id, created_at")
    .eq("organization_id", guest.organization_id)
    .or(`source_guest_id.eq.${guestId},linked_guest_id.eq.${guestId}`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { links: [], error: error.message };

  const normalizedByPair = new Map<string, (typeof links)[number]>();
  for (const row of links ?? []) {
    const pair = normalizeLinkPair(row.source_guest_id, row.linked_guest_id);
    const key = `${pair.sourceGuestId}:${pair.linkedGuestId}`;
    if (!normalizedByPair.has(key)) normalizedByPair.set(key, row);
  }

  const uniqueLinks = Array.from(normalizedByPair.values());

  const relatedGuestIds = Array.from(
    new Set(
      uniqueLinks.flatMap((row) => [row.source_guest_id, row.linked_guest_id]).filter((id) => id !== guestId),
    ),
  );

  if (relatedGuestIds.length === 0) return { links: [], guests: [] };

  const { data: relatedGuests } = await supabase
    .from("guests")
    .select("id, first_name, last_name, email, phone, created_at")
    .in("id", relatedGuestIds);

  return {
    links: uniqueLinks,
    guests: relatedGuests ?? [],
  };
}
