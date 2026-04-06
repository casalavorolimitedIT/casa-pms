begin;

-- Prevent duplicate outlets created by repeat submits.
-- Keep the earliest row for each property + normalized name and remove newer duplicates.
with ranked as (
  select
    id,
    row_number() over (
      partition by property_id, lower(btrim(name))
      order by created_at asc, id asc
    ) as rn
  from pms.outlets
)
delete from pms.outlets o
using ranked r
where o.id = r.id
  and r.rn > 1;

create unique index if not exists uq_outlets_property_normalized_name
  on pms.outlets (property_id, lower(btrim(name)));

commit;
