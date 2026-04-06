# Multi-Property Data Dictionary

## pms.cross_property_guest_links

Purpose: Links guest identities that represent the same person across properties in an organization.

Columns:
- id (uuid, pk)
- organization_id (uuid, fk -> pms.organizations.id)
- source_guest_id (uuid, fk -> pms.guests.id)
- linked_guest_id (uuid, fk -> pms.guests.id)
- created_at (timestamptz)

Constraints and indexes:
- unique(source_guest_id, linked_guest_id)
- check source_guest_id <> linked_guest_id (migration 066)
- unique canonical pair index via least/greatest (migration 066)

RLS:
- Organization-scoped rw policy requiring current profile organization match.

## pms.chain_rate_plans

Purpose: Chain-level rate templates for an organization.

Columns:
- id (uuid, pk)
- organization_id (uuid, fk -> pms.organizations.id)
- name (text)
- description (text, nullable)
- is_active (boolean)
- created_by (uuid, fk -> pms.profiles.id, nullable)
- created_at (timestamptz)

RLS:
- Organization-scoped rw policy requiring current profile organization match.

## pms.chain_rate_plan_assignments

Purpose: Maps a chain plan to a concrete property rate plan.

Columns:
- id (uuid, pk)
- chain_rate_plan_id (uuid, fk -> pms.chain_rate_plans.id)
- property_id (uuid, fk -> pms.properties.id)
- property_rate_plan_id (uuid, fk -> pms.rate_plans.id, nullable)
- override_allowed (boolean)
- created_at (timestamptz)

Constraints and indexes:
- unique(chain_rate_plan_id, property_id)
- idx_chain_rate_plan_assignments_property(property_id, created_at desc)

RLS:
- Property/organization-scoped rw policy through pms.properties join.

## pms.chain_rate_plan_overrides

Purpose: Date-ranged property-level override rates tied to a chain assignment.

Columns:
- id (uuid, pk)
- assignment_id (uuid, fk -> pms.chain_rate_plan_assignments.id)
- room_type_id (uuid, fk -> pms.room_types.id)
- date_from (date)
- date_to (date)
- rate_minor (integer)
- created_at (timestamptz)

Constraints and indexes:
- check date_to >= date_from
- check rate_minor >= 0
- idx_chain_rate_plan_overrides_assignment_date(assignment_id, date_from, date_to)

RLS:
- Assignment/property/organization-scoped rw policy via assignment -> property join.

## Scoping Model Summary

- Active property scope is user-scoped and role-aware.
- Chain pages operate across the scoped property set, with module-specific permission filtering.
- Organization-level tables must still be filtered by scoped property IDs in page/action contexts.
