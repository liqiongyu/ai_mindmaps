-- MindMaps AI (MMA) - Minimal telemetry + daily funnel aggregation (P0-06)
--
-- Notes:
-- - Telemetry tables live in `private` schema to avoid default PostgREST exposure.
-- - Writes are done via SECURITY DEFINER RPC (anon + authenticated).
-- - Reads are served via aggregation RPC (authenticated).

begin;

create schema if not exists private;

create table if not exists private.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_name text not null,
  session_id text not null,
  user_id uuid,
  path text,
  properties jsonb not null default '{}'::jsonb
);

create index if not exists telemetry_events_created_at_idx
on private.telemetry_events (created_at);

create index if not exists telemetry_events_event_name_created_at_idx
on private.telemetry_events (event_name, created_at);

create index if not exists telemetry_events_session_id_created_at_idx
on private.telemetry_events (session_id, created_at);

create index if not exists telemetry_events_user_id_created_at_idx
on private.telemetry_events (user_id, created_at)
where user_id is not null;

create or replace function public.mma_log_events(
  p_session_id text,
  p_path text,
  p_events jsonb
)
returns void
language plpgsql
security definer
set search_path = private, public
as $$
declare
  allowed_names constant text[] := array[
    'landing_cta_click',
    'try_opened',
    'editor_opened',
    'node_added',
    'ai_request_sent',
    'ai_ops_applied',
    'mindmap_saved',
    'export_succeeded',
    'share_link_generated',
    'try_draft_detected_after_auth',
    'try_draft_imported'
  ];
begin
  if p_session_id is null or length(trim(p_session_id)) < 8 or length(p_session_id) > 128 then
    raise exception 'Invalid sessionId';
  end if;

  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'Invalid events payload';
  end if;

  if jsonb_array_length(p_events) > 20 then
    raise exception 'Too many events';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_events) as e(value)
    where (e.value->>'name') is null
      or not ((e.value->>'name') = any(allowed_names))
  ) then
    raise exception 'Invalid event name';
  end if;

  insert into private.telemetry_events (event_name, session_id, user_id, path, properties, created_at)
  select
    e.name,
    p_session_id,
    auth.uid(),
    nullif(trim(p_path), ''),
    e.properties,
    e.created_at
  from (
    select
      (value->>'name') as name,
      case
        when jsonb_typeof(value->'properties') = 'object' then (value->'properties')
        else '{}'::jsonb
      end as properties,
      case
        when value ? 'createdAt' and (value->>'createdAt') is not null then (value->>'createdAt')::timestamptz
        else now()
      end as created_at
    from jsonb_array_elements(p_events) as e(value)
  ) e;
end;
$$;

grant execute on function public.mma_log_events(text, text, jsonb) to anon, authenticated;

create or replace function public.mma_get_daily_funnel(p_days int)
returns table (
  day date,
  sessions bigint,
  landing_cta_click bigint,
  try_opened bigint,
  editor_opened bigint,
  ai_request_sent bigint,
  ai_ops_applied bigint,
  mindmap_saved bigint,
  export_succeeded bigint,
  share_link_generated bigint
)
language sql
security definer
set search_path = private, public
as $$
  with session_rollup as (
    select
      session_id,
      date_trunc('day', min(created_at))::date as day,
      bool_or(event_name = 'landing_cta_click') as landing_cta_click,
      bool_or(event_name = 'try_opened') as try_opened,
      bool_or(event_name = 'editor_opened') as editor_opened,
      bool_or(event_name = 'ai_request_sent') as ai_request_sent,
      bool_or(event_name = 'ai_ops_applied') as ai_ops_applied,
      bool_or(event_name = 'mindmap_saved') as mindmap_saved,
      bool_or(event_name = 'export_succeeded') as export_succeeded,
      bool_or(event_name = 'share_link_generated') as share_link_generated
    from private.telemetry_events
    where created_at >= now() - make_interval(days => greatest(coalesce(p_days, 14), 1))
    group by session_id
  )
  select
    day,
    count(*) as sessions,
    count(*) filter (where landing_cta_click) as landing_cta_click,
    count(*) filter (where try_opened) as try_opened,
    count(*) filter (where editor_opened) as editor_opened,
    count(*) filter (where ai_request_sent) as ai_request_sent,
    count(*) filter (where ai_ops_applied) as ai_ops_applied,
    count(*) filter (where mindmap_saved) as mindmap_saved,
    count(*) filter (where export_succeeded) as export_succeeded,
    count(*) filter (where share_link_generated) as share_link_generated
  from session_rollup
  group by day
  order by day desc;
$$;

grant execute on function public.mma_get_daily_funnel(int) to authenticated;

commit;

