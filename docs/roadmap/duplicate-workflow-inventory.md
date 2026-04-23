# Duplicate Workflow Inventory (Phase 0)

## Objective
Track overlapping operational workflows and progressively consolidate each into one canonical module aligned with SPHEMS familiarity.

## Status Key
- keep: canonical route to keep as source of truth
- merge: move capabilities into canonical route
- retire: remove direct user entry; keep redirect alias only

## Inventory

1. Live operations board
- canonical: /dashboard/stay-view (keep)
- overlaps: /dashboard/front-desk (merge), /dashboard/room-board (merge), /dashboard/arrivals-departures (retire)
- decision: keep one board for arrivals, departures, in-house, and room assignment

2. Room assignment controls
- canonical: /dashboard/stay-view (keep)
- overlaps: room movement touches in /dashboard/room-board and /dashboard/front-desk/room-move (merge)
- decision: keep drag-drop in stay-view, preserve guided room-move flow as advanced path

3. Reservation action entry points
- canonical: /dashboard/stay-view (for live check-in/out actions), /dashboard/reservations (for planning/details)
- overlaps: check-in/out actions discoverable from multiple pages
- decision: standardize live operation actions in stay-view, keep reservation details in reservations module

4. Front-desk quick links
- canonical: /dashboard/stay-view (keep)
- overlaps: dashboard header shortcuts pointing to front-desk/arrivals pages
- decision: all top-level quick actions should point to stay-view

## Implemented In This Pass
- Added canonical page: /dashboard/stay-view
- Redirected: /dashboard/front-desk -> /dashboard/stay-view
- Redirected: /dashboard/room-board -> /dashboard/stay-view
- Redirected: /dashboard/arrivals-departures -> /dashboard/stay-view
- Updated sidebar and dashboard header links to stay-view
- Updated revalidation paths to refresh stay-view after relevant mutations

## Next Consolidation Pass
1. Update remaining UI copy from "Front Desk" to "Stay View" where it is top-level navigation language.
2. Update check-in/check-out back links to prefer /dashboard/stay-view.
3. Convert legacy route pages into explicit alias pages with a migration notice and redirect timer (optional).
4. Add telemetry counters to legacy aliases to determine safe retirement timing.
