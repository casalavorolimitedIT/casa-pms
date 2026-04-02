# Casa PMS: Media & Image Architecture

**Version:** 1.0  
**Status:** Active  
**Last Updated:** April 2, 2026  
**Owner:** Platform Team  

---

## 1. Overview

Images and media files are embedded throughout Casa PMS operations, from guest identification to room galleries to asset management. This document defines the unified media strategy: where images are needed, why, storage buckets, access controls, and retention policies.

**Problem Statement:** Images are implicitly required across multiple milestones (M01, M04, M05, M06, M08, M09) but not explicitly architected, leading to:
- Scattered ad-hoc implementations
- Inconsistent privacy controls
- Unclear retention/deletion policies
- No centralized metadata tracking
- Potential compliance violations (GDPR, data residency)

**Solution:** Unified Supabase Storage bucket strategy with standardized metadata schema, access controls via RLS, and per-bucket retention rules.

---

## 2. Image Requirements by Milestone & Feature

### M01: Core PMS – Guests & Profiles
| Feature | Image Type | Size | Purpose | Count/Property | Storage |
|---------|-----------|------|---------|-----------------|---------|
| **Guest ID Documents** | PDF/JPG/PNG | <10MB each | KYC, check-in verification, dispute resolution | 100–1000s annually | Encrypted, RLS restricted |
| **Guest Profile Photo** | JPG/PNG | <2MB | Optional profile picture, loyalty program, concierge context | Optional per guest | Standard with blur on anonymous |

**Retention:** ID documents for 7 years (compliance), profile photos 5 years or on delete.  
**Bucket:** `guest-documents` (encrypted), `guest-profiles` (standard).

---

### M04: Housekeeping – Room Condition & Lost & Found
| Feature | Image Type | Size | Purpose | Count/Property | Storage |
|---------|-----------|------|---------|-----------------|---------|
| **Room Condition Reports** | JPG/PNG | <5MB per image (3–10 images per room daily) | Before/after check-in, checkout condition proof, dispute resolution | ~100–200 per room/month | Time-limited (90 days) |
| **Lost & Found Photos** | JPG/PNG | <3MB | Item catalog, guest reunification, inventory audits | ~50–200 per month | 2-year retention (legal hold) or guest claim |
| **Cleaning Checklist Proof** | JPG | <2MB | Task verification (mirror clean, floors detailed) | Optional per task | 30-day retention |

**Retention:** Room condition after checkout completion (~90 days), lost & found 2 years or claim, checklist proof 30 days.  
**Bucket:** `housekeeping-condition`, `lost-and-found`, `cleaning-tasks` (all with access controls per property/staff).

---

### M05: Engineering & Maintenance – Assets & Work Orders
| Feature | Image Type | Size | Purpose | Count/Property | Storage |
|---------|-----------|------|---------|-----------------|---------|
| **Asset Registry Photos** | JPG/PNG | <5MB per image | Equipment/furniture identification, serial number visibility for warranty/insurance | 1–3 per asset (500–2000 assets property) | Permanent via reference |
| **Work Order Issue Photos** | JPG/PNG | <4MB per image (2–5 images per order) | Problem documentation, repair progress, completion proof | ~50–300 per month | 3-year retention (warranty/insurance) |
| **Maintenance Schedule Proof** | JPG | <2MB | Completed tasks (filter change, inspection) | Variable per task | 2-year retention (compliance) |

**Retention:** Assets permanent, work order photos 3 years, maintenance proof 2 years.  
**Bucket:** `asset-registry`, `work-order-photos`, `maintenance-proof` (all timestamped, versioned).

---

### M06: Dashboard – Planning & F&B Operations
| Feature | Image Type | Size | Purpose | Count/Property/Year | Storage |
|---------|-----------|------|---------|-----------------|---------|
| **F&B Menu Item Images** | JPG/PNG | <2MB per item | Menu display, ordering system UI, website/app gallery | ~50–500 per property | Permanent/seasonal |
| **Event/Banquet Setup Photos** | JPG/PNG | <5MB per image | Room setup reference, client gallery, event portfolio | ~10–50 per month | 2–5 year archive |
| **Department Photos** (Spa, pool, gym, lounge) | JPG/PNG | <3MB | Interior gallery, marketing collateral, maintenance reference | 5–20 per department | Permanent |

**Retention:** Menu items permanent (seasonal update), event photos 2–5 years, department photos permanent.  
**Bucket:** `fnb-menu-media`, `event-gallery`, `department-photos` (public-readable for web).

---

### M08: Distribution – Booking & Room Gallery
| Feature | Image Type | Size | Purpose | Count/Property | Storage |
|---------|-----------|------|---------|-----------------|---------|
| **Room Type Gallery** | JPG/PNG | <3MB per image (4–12 images per room type) | OTA/website display, guest preview, booking confidence | ~5–50 per room type | Public/CDN optimized |
| **Room Type 360° Tour (Optional)** | Video or WebM | <20MB | Immersive preview for guests | Optional per room type | Streaming optimized |
| **Property Hero Image & Amenity Icons** | JPG/PNG/SVG | <2MB | Marketing landing page, OTA integration, branding | 10–50 per property | Public/CDN |

**Retention:** Gallery permanent (updated seasonally), tours permanent, marketing permanent.  
**Bucket:** `room-gallery` (public), `property-branding` (public), `room-tours` (streaming-optimized, optional).

---

### M09: Guest Experience – Messaging & Concierge
| Feature | Image Type | Size | Purpose | Count/Property | Storage |
|---------|-----------|------|---------|-----------------|---------|
| **Guest Messaging Attachments** | JPG/PNG/PDF/video | <10MB per file | Room service orders, maintenance requests with photos, concierge service requests | ~50–500 per month | 1-year retention |
| **Concierge Service Catalog Photos** | JPG/PNG | <3MB per service | Local restaurant, attraction, activity previews | ~100–500 per property | Permanent |

**Retention:** Messaging attachments 1 year, service catalog permanent.  
**Bucket:** `guest-messages-media`, `concierge-catalog` (partial public/partial private).

---

### Optional/Future: Spa, Loyalty, Multi-Property
| Feature | Image Type | Size | Purpose | Storage |
|---------|-----------|------|---------|---------|
| **Spa Service Gallery** | JPG/PNG | <3MB per image | Treatment room, therapist photos, service previews | `spa-media` (public) |
| **Loyalty Program Member Cards** | JPG/PNG | <1MB | Card design, member tier badges | `loyalty-media` (private) |
| **Corporate Account Logos** | SVG/PNG | <500KB | B2B branding in invoices, contracts | `corporate-logos` (private) |

---

## 3. Storage Bucket Architecture

### Bucket Strategy

**Total Buckets: 11 core + 2 optional**

| Bucket Name | Type | Public | Versioning | Retention | RLS |
|-------------|------|--------|-----------|-----------|-----|
| `guest-documents` | Private | No | Yes (3 versions) | 7 years | Encrypted, property staff + compliance only |
| `guest-profiles` | Private/Blurred | Partial | Yes (2 versions) | 5 years or on delete | Owner + staff with guest consent |
| `housekeeping-condition` | Private | No | Yes (1 version) | 90 days auto-delete | Property housekeeping staff only |
| `lost-and-found` | Private | No | Yes (permanent) | 2 years or on claim | Property staff + guest (if identifier matched) |
| `cleaning-tasks` | Private | No | No | 30 days auto-delete | Property housekeeping staff only |
| `asset-registry` | Private | No | Yes (permanent) | Permanent | Engineering staff, read-only concierge |
| `work-order-photos` | Private | No | Yes (permanent) | 3 years kept, then archived | Engineering staff only |
| `maintenance-proof` | Private | No | Yes (2 years) | 2 years | Engineering staff + compliance audits |
| `fnb-menu-media` | Public | Yes | Yes (seasonal) | Permanent | Read-only public, write by staff |
| `event-gallery` | Public | Yes (property decides) | Yes (permanent) | 2–5 years kept | Read-only public/private toggle, write by event staff |
| `room-gallery` | Public | Yes | Yes (seasonal) | Permanent | Read-only public, write by distribution staff |
| `property-branding` | Public | Yes | Yes (permanent) | Permanent | Read-only public, write by property manager |
| `guest-messages-media` | Private | No | Yes (1 version) | 1 year auto-delete | Guest + property staff only |
| `concierge-catalog` | Public | Partial | Yes (permanent) | Permanent | Read-only public, write by concierge manager |

---

## 4. Metadata Schema

Every image stored in Supabase Storage must include standardized metadata (via object tags or a companion `media_metadata` table in the database).

### Option A: Database-Backed Metadata (Recommended)

```sql
create table pms.media_metadata (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  bucket_name text not null,
  file_key text not null, -- Supabase bucket path
  file_name text not null,
  mime_type text,
  size_bytes int,
  width int,          -- pixel width (images)
  height int,         -- pixel height (images)
  duration_seconds int, -- video/audio duration
  owner_id uuid references auth.users(id),
  guest_id uuid references pms.guests(id),
  asset_id uuid,      -- links to asset registry
  work_order_id uuid,  -- links to work orders
  feature_type text not null, -- 'guest_id', 'room_condition', 'lost_found', 'menu', 'room_gallery', etc.
  created_at timestamptz not null default now(),
  expires_at timestamptz, -- auto-delete after this date
  metadata_json jsonb, -- { source: 'mobile', location: { rooms: '101' }, checksum: 'abc...' }
  constraint unique_file_per_property unique (property_id, bucket_name, file_key)
);

-- RLS: read/write scoped to property + role
alter table pms.media_metadata enable row level security;
```

### Option B: Supabase Storage Tags (Lightweight)

```
Supabase object tags (key-value pairs):
- property_id: <uuid>
- feature_type: 'guest_id' | 'room_condition' | 'menu' | etc.
- owner_id: <uuid>
- expires_at: <ISO-8601 timestamp>
- guest_id: <uuid> (if applicable)
- work_order_id: <uuid> (if applicable)
```

**Recommendation:** Use **Option A (database-backed)** for:
- Full search/indexing capability
- Automatic retention policy enforcement
- Guest/staff audit trails
- Compliance reporting

---

## 5. Access Control & Policies

### RLS Policies by Bucket

#### Private Buckets (housekeeping-condition, lost-and-found, asset-registry, etc.)

```sql
-- Property staff can only see media for their property
create policy "property_staff_read_own_property" on storage.objects
  for select using (
    bucket_id = 'housekeeping-condition'
    and exists (
      select 1 from pms.user_property_roles upr
      where upr.user_id = auth.uid()
      and upr.property_id = (metadata->>'property_id')::uuid
      and upr.role in ('property_manager', 'housekeeping', ...)
    )
  );
```

#### Public Buckets (room-gallery, fnb-menu-media, etc.)

```sql
-- Authenticated users can read; property staff can write
create policy "public_read_write_property_staff" on storage.objects
  for select using (
    bucket_id = 'room-gallery'
    -- publicly readable
  );

create policy "property_staff_upload" on storage.objects
  for insert with check (
    bucket_id = 'room-gallery'
    and exists (
      select 1 from pms.user_property_roles upr
      where upr.user_id = auth.uid()
      and upr.property_id = (metadata->>'property_id')::uuid
      and upr.role in ('distribution_manager', 'property_manager')
    )
  );
```

---

## 6. Retention & Auto-Deletion Policies

### Cron Job: Supabase Edge Function or Lambda

```typescript
// lib/cron/cleanup-expired-media.ts
export async function cleanupExpiredMedia() {
  const supabase = createServiceRoleClient();

  // Delete files where expires_at < now()
  const { data: expiredMedia } = await supabase
    .from('pms.media_metadata')
    .select('id, bucket_name, file_key')
    .lt('expires_at', new Date().toISOString());

  for (const media of expiredMedia || []) {
    await supabase.storage
      .from(media.bucket_name)
      .remove([media.file_key]);

    await supabase
      .from('pms.media_metadata')
      .delete()
      .eq('id', media.id);
  }
}
```

### Retention Rules by Bucket

| Bucket | Retention | Auto-Delete | Exception |
|--------|-----------|---------|-----------|
| guest-documents | 7 years | Day 2557 | Manual hold for disputes |
| housekeeping-condition | 90 days | Day 91 | Keep if disputed |
| lost-and-found | 2 years | Day 731 or on claim | Manual "keep" flag |
| work-order-photos | 3 years | Day 1096 | Archive or export to cold storage |
| cleaning-tasks | 30 days | Day 31 | Keep if flagged for audit |
| guest-messages-media | 1 year | Day 366 | Extend if guest requests |

---

## 7. Privacy & Compliance

### GDPR Compliance
- **Data Subject Rights:** Guest-related images (profiles, ID docs, messages) must be deletable on guest request.
- **Right to be Forgotten:** Delete cascade: guest deletion → delete all guest_id-linked media in media_metadata, then from storage.
- **Retention Justification:** All buckets have explicit retention periods tied to legal/business requirement (KYC, insurance, audit).

### Data Residency
- Store all images in Supabase's EU region if property is EU-based.
- Use `LOCATED IN` bucket configuration if available.

### Encryption
- Sensitive buckets (guest-documents, work-order-photos): Enable server-side encryption (Supabase default is TLS in transit; enable at-rest if available).
- Guest ID documents: Consider additional application-level encryption (AES-256) if handling highly sensitive markets.

### Audit Trail
- Every upload/download/delete tracked in media_metadata via `created_at`, `expires_at`, and a companion `media_audit_log` table for compliance audits.

```sql
create table pms.media_audit_log (
  id uuid primary key default gen_random_uuid(),
  media_metadata_id uuid references pms.media_metadata(id),
  action text not null, -- 'upload', 'download', 'delete', 'share'
  actor_id uuid references auth.users(id),
  reason text,
  ip_address inet,
  created_at timestamptz not null default now()
);
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (M01 – Concurrent with Core PMS)
- [ ] Create media_metadata table + audit_log table.
- [ ] Set up 4 core buckets: `guest-documents`, `guest-profiles`, `asset-registry`, `work-order-photos`.
- [ ] Implement RLS policies for all 4 buckets.
- [ ] Add media_metadata insert trigger on every Supabase Storage upload.
- [ ] Create utility: `uploadMedia(bucket, file, metadata)` in lib/media/index.ts.

### Phase 2: Housekeeping + F&B (M04–M06)
- [ ] Create 6 additional buckets: `housekeeping-condition`, `lost-and-found`, `cleaning-tasks`, `fnb-menu-media`, `event-gallery`, `property-branding`.
- [ ] Implement 30-day and 90-day auto-delete policies (Supabase Edge Function or external cron).
- [ ] Add media upload UI to housekeeping module (room condition form, task checklist).
- [ ] Add F&B menu item image upload & gallery display.

### Phase 3: Distribution + Messaging (M08–M09)
- [ ] Create public buckets: `room-gallery`, `concierge-catalog`.
- [ ] Build room gallery admin UI (upload, reorder, crop).
- [ ] Enable guest message attachments (file upload in chat UI).
- [ ] Implement CDN caching for public room gallery (Cloudflare or Supabase edge).

### Phase 4: Retention & Compliance (M12)
- [ ] Implement automated retention/deletion cron job.
- [ ] Add media audit log UI (compliance dashboard).
- [ ] Test GDPR right-to-delete cascade (guest deletion → media purge).
- [ ] Document retention exceptions and override process.

---

## 9. Storage Cost Estimates

### Assumptions per Property (100 rooms, 40 daily arrivals, 2-year history)

| Bucket | Daily Growth | Monthly | Yearly | 2-Year Total |
|--------|-------------|---------|--------|---------|
| guest-documents | 120 MB | 3.6 GB | 43.2 GB | 86.4 GB |
| guest-profiles | 40 MB | 1.2 GB | 14.4 GB | 28.8 GB |
| housekeeping-condition | 200 MB (5/room × 40 arrivals × 3 images) | 6 GB | 72 GB | 144 GB |
| room-gallery | 10 MB (uploaded yearly) | 0.1 GB | 1.2 GB | 2.4 GB |
| fnb-menu-media | 5 MB (updated seasonally) | 0.05 GB | 0.6 GB | 1.2 GB |
| **Total Small Property** | **375 MB/day** | **11 GB/month** | **131 GB/year** | **262 GB** |
| **Supabase Cost @ $5/GB** | — | **$55** | **$655** | — |

**For 50-property chain:** 262 GB × 50 = 13.1 TB = **$65,500/2 years** (manageable).

---

## 10. Example Implementation Flow

### Guest Document Upload (M01)

```typescript
// app/dashboard/guests/[guestId]/upload-document/page.tsx
'use client';

import { useCallback } from 'react';
import { uploadMedia } from '@/lib/media';
import { Button } from '@/components/ui/button';

export default function UploadGuestDocumentPage() {
  const handleUpload = useCallback(async (file: File) => {
    const result = await uploadMedia({
      bucket: 'guest-documents',
      file,
      metadata: {
        property_id: params.propertyId,
        guest_id: params.guestId,
        feature_type: 'guest_id',
        expires_at: new Date(Date.now() + 7 * 365.25 * 24 * 60 * 60 * 1000), // 7 years
      },
    });
    console.log('Document uploaded:', result.url);
  }, []);

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      <Button onClick={() => {}}>Upload</Button>
    </div>
  );
}
```

### Room Condition Report (M04)

```typescript
// app/dashboard/housekeeping/room-condition/[roomId]/page.tsx
const handleUploadConditionPhotos = useCallback(async (photos: File[]) => {
  for (const photo of photos) {
    await uploadMedia({
      bucket: 'housekeeping-condition',
      file: photo,
      metadata: {
        property_id: params.propertyId,
        room_id: params.roomId,
        feature_type: 'room_condition',
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    });
  }
}, []);
```

---

## 11. Integration with Milestones

| Milestone | Buckets Added | Features | Acceptance Criteria |
|-----------|---------------|----------|-------------------|
| **M01** | guest-documents, guest-profiles, asset-registry, work-order-photos | Media metadata schema, RLS policies, utility lib | ✅ uploadMedia() works, RLS tested |
| **M04** | housekeeping-condition, lost-and-found, cleaning-tasks | 90-day auto-delete, room condition form UI | ✅ Photos upload & delete on schedule |
| **M06** | fnb-menu-media, event-gallery, property-branding, department-photos | Menu item upload, gallery display | ✅ Menu images shown on dashboard |
| **M08** | room-gallery (public), room-tours (optional) | Public gallery admin, CDN caching | ✅ Room gallery displays on booking site |
| **M09** | guest-messages-media, concierge-catalog | Message attachments, service photos | ✅ Guest can attach to messages |
| **M12** | (All) | Retention cron, audit dashboard, compliance testing | ✅ GDPR delete tested, audit log complete |

---

## 12. Next Steps

1. **Approve storage bucket strategy** (11 core + 2 optional).
2. **Confirm retention periods** per bucket (align with legal/compliance requirements).
3. **Assign ownership:**
   - M01: media_metadata schema + RLS (Foundation team).
   - M04: housekeeping upload UI (Housekeeping team).
   - M06: F&B gallery (Operations team).
   - M08: public room gallery (Distribution team).
   - M12: retention cron + compliance (DevOps/Security team).
4. **Start Phase 1** concurrent with M01 execution.

---

## References

- Supabase Storage Docs: https://supabase.com/docs/guides/storage
- GDPR Data Retention: https://gdpr-info.eu/
- Hotel Industry Standards: AHLA, AH&LA property management practices
- This document is the source of truth for media architecture decisions.
