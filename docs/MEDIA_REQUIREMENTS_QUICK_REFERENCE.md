# Casa PMS: Image/Media Requirements Map

## Quick Reference: Where Images Are Used

```
M01: Core PMS (Guests & Profiles)
└── 🔐 guest-documents           → KYC document uploads (ID, passport)
└── 👤 guest-profiles            → Optional guest profile photos
└── 🏢 asset-registry            → Asset equipment/furniture photos
└── 🔧 work-order-photos        → Issue documentation & progress photos

M04: Housekeeping (Cleaning & Lost & Found)
└── 📸 housekeeping-condition    → Room before/after condition reports (90-day auto-delete)
└── 📦 lost-and-found            → Lost item catalog photos (2-year retention)
└── ✓ cleaning-tasks             → Task verification photos (30-day auto-delete)

M05: Engineering (Maintenance & Assets)
└── 🔧 work-order-photos        → Issue & repair documentation (3-year retention)
└── 📋 maintenance-proof         → Task completion proof (2-year retention)
└── 🏢 asset-registry (shared)   → Equipment/furniture registry photos

M06: F&B & Operations (Dashboard)
└── 🍽️ fnb-menu-media            → Menu item photos for ordering (permanent)
└── 🎉 event-gallery             → Banquet/event setup photos (2–5 year archive)
└── 📍 department-photos         → Spa, pool, gym, lounge photos (permanent)
└── 🏨 property-branding         → Hero images & amenities (permanent)

M07: Guest Experience (Messaging)
└── 💬 guest-messages-media      → Attachment to messages/requests (1-year retention)
└── 🛎️ concierge-catalog         → Local service/attraction previews (permanent)

M08: Distribution (Booking Website)
└── 🏠 room-gallery (PUBLIC)     → Room type gallery (4–12 images per type, permanent)
└── 🎬 room-tours (optional)     → 360° room tours or video previews
└── 🏨 property-branding (shared)→ Hero images for website

M09: Spa/Loyalty (Future Optional)
└── 💆 spa-media (optional)      → Treatment room & service photos
└── 🎫 loyalty-media (optional)  → Member tier badges, card designs
└── 🏢 corporate-logos (optional)→ B2B client branding

M12: Hardening & Release (Compliance)
└── ✓ Retention/deletion cron jobs
└── ✓ GDPR compliance testing
└── ✓ Audit trail verification
```

## Implementation Timeline

| Phase | Milestones | Scope | Team |
|-------|----------|-------|------|
| **Phase 1: Foundation** | M01 (concurrent) | Media metadata schema, 4 core buckets, RLS policies, upload utility | M00/M01 team |
| **Phase 2: Operations** | M04–M06 | 6 additional buckets, 30/90/2-yr retention, upload UIs | Housekeeping + F&B teams |
| **Phase 3: Distribution** | M08–M09 | Public galleries, CDN caching, guest attachments | Distribution + UX teams |
| **Phase 4: Compliance** | M12 | Cron jobs, GDPR testing, audit dashboard | DevOps + Security teams |

## Storage Buckets: Role-Based Access

| Bucket | Public? | Viewers | Uploaders | Auto-Delete |
|--------|---------|---------|-----------|-------------|
| **guest-documents** | 🔒 No | Property staff + compliance | Staff (verified) | 7 years |
| **housekeeping-condition** | 🔒 No | Housekeeping staff | Housekeeping staff | 90 days |
| **lost-and-found** | 🔒 No | Staff + matching guest | Staff | On claim / 2 years |
| **asset-registry** | 🔒 No | Engineering staff, read-only concierge | Engineering staff | Permanent |
| **work-order-photos** | 🔒 No | Engineering staff | Engineering staff | 3 years |
| **fnb-menu-media** | 🌐 Yes | All | F&B staff | Permanent (seasonal) |
| **event-gallery** | 🌐 Mixed | Public/private per event | Event staff | 2–5 years |
| **room-gallery** | 🌐 Yes | All | Distribution staff | Permanent (seasonal) |
| **property-branding** | 🌐 Yes | All | Admin/marketing | Permanent |
| **guest-messages-media** | 🔒 No | Guest + staff | Guest | 1 year |
| **concierge-catalog** | 🌐 Partial | Public (with filtering) | Concierge staff | Permanent |

## Cost Estimate (per 100-room property, 2 years)

- **Total storage:** ~262 GB (guest docs, room photos, housekeeping reports, etc.)
- **Monthly:** ~$11 @ $5/GB
- **Yearly:** ~$655
- **50-property chain:** ~$65,500 for 2 years (manageable)

## Acceptance Criteria Checklist

### M01 Integration
- [ ] `media_metadata` table created with RLS
- [ ] `media_audit_log` table created for compliance  
- [ ] 4 buckets configured: guest-documents, guest-profiles, asset-registry, work-order-photos
- [ ] RLS policies implemented and tested
- [ ] `uploadMedia()` utility works, handles metadata
- [ ] Guest document upload in profile page functional
- [ ] Unit tests for RLS policies pass

### M04 Integration
- [ ] 3 buckets created: housekeeping-condition, lost-and-found, cleaning-tasks
- [ ] 90-day auto-delete cron job for housekeeping-condition
- [ ] Room condition form UI has photo upload/gallery
- [ ] Lost & found module has item catalog + photos
- [ ] Photos auto-delete successfully after retention period

### M06 Integration
- [ ] 4 buckets created: fnb-menu-media, event-gallery, property-branding, department-photos
- [ ] F&B menu item upload allows image before/after save
- [ ] Menu items display photos in dashboard + ordering
- [ ] Event gallery admin panel (upload, reorder, delete)
- [ ] Department photos displayed on dashboard

### M08 Integration
- [ ] `room-gallery` bucket (public) configured
- [ ] Admin upload UI for room photos (per room type)
- [ ] Gallery displays on booking page sorted by room type
- [ ] CDN caching enabled for public room photos
- [ ] SEO metadata (alt text, structured data) included

### M12 Integration
- [ ] Retention cron job runs nightly, deletes expired media
- [ ] `media_audit_log` populated on upload/download/delete
- [ ] GDPR delete cascade tested (guest deletion → media purge)
- [ ] Audit dashboard shows retention history
- [ ] Compliance report includes media storage breakdown

## Current Status

✅ **Complete:**
- [x] Media architecture document created (docs/media-architecture.md)
- [x] Cross-cutting concern documented in roadmap
- [x] Bucket strategy, RLS policies, and retention rules defined
- [x] Team responsibilities clarified

⏳ **Pending:**
- [ ] Phase 1 (M01): Implement media_metadata schema + 4 buckets
- [ ] Phase 2 (M04–M06): Add operational buckets + upload UIs
- [ ] Phase 3 (M08–M09): Deploy public galleries
- [ ] Phase 4 (M12): Retention cron + compliance testing

---

**Next Step:** Approve this media strategy and integrate Phase 1 into M01 Core PMS execution plan.
