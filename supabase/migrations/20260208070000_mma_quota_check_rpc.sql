-- MindMaps AI (MMA) - Quota pre-check helper (P0-08)
--
-- Adds:
-- - `mma_check_quota`: check quota without incrementing `usage_counters`

begin;

create or replace function public.mma_check_quota(
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
security definer
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

  select c.used
  into v_used
  from public.usage_counters c
  where c.owner_id = v_owner_id
    and c.metric = p_metric
    and c.period = p_period
    and c.period_start = v_period_start;

  v_used := coalesce(v_used, 0);

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

grant execute on function public.mma_check_quota(text, text, text, integer) to authenticated;

commit;

