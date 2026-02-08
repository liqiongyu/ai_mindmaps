-- MindMaps AI (MMA) - Usage quotas + plan limits (P2-04)
--
-- Adds:
-- - `plan_limits`: plan-level quotas (configurable by ops)
-- - `usage_counters`: per-user usage tracking by period
-- - `mma_consume_quota`: atomic check + increment helper

begin;

create table if not exists public.plan_limits (
  id uuid primary key default gen_random_uuid(),
  plan text not null,
  metric text not null,
  period text not null,
  "limit" integer check ("limit" is null or "limit" >= 0),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists plan_limits_plan_metric_period_idx
on public.plan_limits (plan, metric, period);

drop trigger if exists set_plan_limits_updated_at on public.plan_limits;
create trigger set_plan_limits_updated_at
before update on public.plan_limits
for each row execute function public.set_updated_at();

alter table public.plan_limits enable row level security;

drop policy if exists "Plan limits: authenticated can read" on public.plan_limits;
create policy "Plan limits: authenticated can read"
on public.plan_limits
for select
to authenticated
using (true);

create table if not exists public.usage_counters (
  owner_id uuid not null references auth.users (id) on delete cascade,
  metric text not null,
  period text not null,
  period_start date not null,
  used integer not null default 0 check (used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, metric, period, period_start)
);

create index if not exists usage_counters_owner_period_idx
on public.usage_counters (owner_id, period, period_start);

drop trigger if exists set_usage_counters_updated_at on public.usage_counters;
create trigger set_usage_counters_updated_at
before update on public.usage_counters
for each row execute function public.set_updated_at();

alter table public.usage_counters enable row level security;

drop policy if exists "Usage counters: owner can read" on public.usage_counters;
create policy "Usage counters: owner can read"
on public.usage_counters
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Usage counters: owner can insert" on public.usage_counters;
create policy "Usage counters: owner can insert"
on public.usage_counters
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Usage counters: owner can update" on public.usage_counters;
create policy "Usage counters: owner can update"
on public.usage_counters
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create or replace function public.mma_consume_quota(
  p_metric text,
  p_plan text default 'free',
  p_period text default 'day',
  p_amount integer default 1
)
returns table (
  ok boolean,
  metric text,
  plan text,
  period text,
  period_start date,
  used integer,
  "limit" integer,
  reset_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_limit integer;
  v_period_start date;
  v_reset_at timestamptz;
  v_used integer;
begin
  if v_owner_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;

  if p_period = 'day' then
    v_period_start := date_trunc('day', now())::date;
    v_reset_at := date_trunc('day', now()) + interval '1 day';
  elsif p_period = 'month' then
    v_period_start := date_trunc('month', now())::date;
    v_reset_at := date_trunc('month', now()) + interval '1 month';
  else
    raise exception 'Invalid period';
  end if;

  select l."limit"
  into v_limit
  from public.plan_limits l
  where l.plan = p_plan
    and l.metric = p_metric
    and l.period = p_period
    and l.is_enabled = true
  limit 1;

  insert into public.usage_counters (owner_id, metric, period, period_start, used)
  values (v_owner_id, p_metric, p_period, v_period_start, 0)
  on conflict (owner_id, metric, period, period_start) do nothing;

  select c.used
  into v_used
  from public.usage_counters c
  where c.owner_id = v_owner_id
    and c.metric = p_metric
    and c.period = p_period
    and c.period_start = v_period_start
  for update;

  if v_limit is not null and v_used + p_amount > v_limit then
    return query
    select
      false as ok,
      p_metric as metric,
      p_plan as plan,
      p_period as period,
      v_period_start as period_start,
      v_used as used,
      v_limit as "limit",
      v_reset_at as reset_at;
    return;
  end if;

  update public.usage_counters
  set used = used + p_amount
  where owner_id = v_owner_id
    and metric = p_metric
    and period = p_period
    and period_start = v_period_start
  returning used into v_used;

  return query
  select
    true as ok,
    p_metric as metric,
    p_plan as plan,
    p_period as period,
    v_period_start as period_start,
    v_used as used,
    v_limit as "limit",
    v_reset_at as reset_at;
end;
$$;

grant execute on function public.mma_consume_quota(text, text, text, integer) to authenticated;

insert into public.plan_limits (plan, metric, period, "limit", is_enabled)
values
  ('free', 'ai_chat', 'day', 100, true),
  ('free', 'audit_export', 'day', 50, true),
  ('free', 'public_shares', 'active', 10, true)
on conflict (plan, metric, period)
do update set
  "limit" = excluded."limit",
  is_enabled = excluded.is_enabled;

commit;
