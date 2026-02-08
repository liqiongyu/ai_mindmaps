-- MindMaps AI (MMA) - Mindmaps list paging index (P1-04)

begin;

create index if not exists mindmaps_owner_updated_at_id_idx
on public.mindmaps (owner_id, updated_at desc, id desc);

commit;

