-- MindMaps AI (MMA) - Mindmap templates (catalog + seed)
--
-- Adds `mindmap_templates` for scenario-based mindmap creation.

begin;

create table if not exists public.mindmap_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  category text,
  state jsonb not null,
  ui jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_mindmap_templates_updated_at on public.mindmap_templates;
create trigger set_mindmap_templates_updated_at
before update on public.mindmap_templates
for each row execute function public.set_updated_at();

alter table public.mindmap_templates enable row level security;

drop policy if exists "Mindmap templates: authenticated can read" on public.mindmap_templates;
create policy "Mindmap templates: authenticated can read"
on public.mindmap_templates
for select
to authenticated
using (true);

-- Seed templates (small, built-in set).
insert into public.mindmap_templates (slug, title, description, category, state, ui)
select
  'study-plan',
  '学习计划',
  '适用于学习/考试/技能提升的学习规划模板。',
  '学习',
  jsonb_build_object(
    'rootNodeId',
    ids.root,
    'nodesById',
    jsonb_build_object(
      ids.root::text,
      jsonb_build_object('id', ids.root, 'parentId', null, 'text', '学习计划', 'notes', null, 'orderIndex', 0),
      ids.goal::text,
      jsonb_build_object('id', ids.goal, 'parentId', ids.root, 'text', '目标', 'notes', null, 'orderIndex', 0),
      ids.materials::text,
      jsonb_build_object('id', ids.materials, 'parentId', ids.root, 'text', '资料', 'notes', null, 'orderIndex', 1),
      ids.plan::text,
      jsonb_build_object('id', ids.plan, 'parentId', ids.root, 'text', '计划', 'notes', null, 'orderIndex', 2),
      ids.output::text,
      jsonb_build_object('id', ids.output, 'parentId', ids.root, 'text', '输出', 'notes', null, 'orderIndex', 3),
      ids.week1::text,
      jsonb_build_object('id', ids.week1, 'parentId', ids.plan, 'text', '第 1 周', 'notes', null, 'orderIndex', 0),
      ids.week2::text,
      jsonb_build_object('id', ids.week2, 'parentId', ids.plan, 'text', '第 2 周', 'notes', null, 'orderIndex', 1)
    )
  ),
  null
from (
  select
    gen_random_uuid() as root,
    gen_random_uuid() as goal,
    gen_random_uuid() as materials,
    gen_random_uuid() as plan,
    gen_random_uuid() as output,
    gen_random_uuid() as week1,
    gen_random_uuid() as week2
) as ids
on conflict (slug) do nothing;

insert into public.mindmap_templates (slug, title, description, category, state, ui)
select
  'meeting-notes',
  '会议纪要',
  '记录议题、结论与行动项，适用于周会/评审/对齐会议。',
  '会议',
  jsonb_build_object(
    'rootNodeId',
    ids.root,
    'nodesById',
    jsonb_build_object(
      ids.root::text,
      jsonb_build_object('id', ids.root, 'parentId', null, 'text', '会议纪要', 'notes', null, 'orderIndex', 0),
      ids.agenda::text,
      jsonb_build_object('id', ids.agenda, 'parentId', ids.root, 'text', '议题', 'notes', null, 'orderIndex', 0),
      ids.decisions::text,
      jsonb_build_object('id', ids.decisions, 'parentId', ids.root, 'text', '结论', 'notes', null, 'orderIndex', 1),
      ids.actions::text,
      jsonb_build_object('id', ids.actions, 'parentId', ids.root, 'text', '行动项', 'notes', null, 'orderIndex', 2),
      ids.action1::text,
      jsonb_build_object('id', ids.action1, 'parentId', ids.actions, 'text', '任务 1', 'notes', null, 'orderIndex', 0),
      ids.action2::text,
      jsonb_build_object('id', ids.action2, 'parentId', ids.actions, 'text', '任务 2', 'notes', null, 'orderIndex', 1)
    )
  ),
  null
from (
  select
    gen_random_uuid() as root,
    gen_random_uuid() as agenda,
    gen_random_uuid() as decisions,
    gen_random_uuid() as actions,
    gen_random_uuid() as action1,
    gen_random_uuid() as action2
) as ids
on conflict (slug) do nothing;

insert into public.mindmap_templates (slug, title, description, category, state, ui)
select
  'project-plan',
  '项目计划',
  '适用于项目启动与推进：目标、里程碑、风险与资源。',
  '项目',
  jsonb_build_object(
    'rootNodeId',
    ids.root,
    'nodesById',
    jsonb_build_object(
      ids.root::text,
      jsonb_build_object('id', ids.root, 'parentId', null, 'text', '项目计划', 'notes', null, 'orderIndex', 0),
      ids.goal::text,
      jsonb_build_object('id', ids.goal, 'parentId', ids.root, 'text', '目标', 'notes', null, 'orderIndex', 0),
      ids.milestones::text,
      jsonb_build_object('id', ids.milestones, 'parentId', ids.root, 'text', '里程碑', 'notes', null, 'orderIndex', 1),
      ids.risks::text,
      jsonb_build_object('id', ids.risks, 'parentId', ids.root, 'text', '风险', 'notes', null, 'orderIndex', 2),
      ids.resources::text,
      jsonb_build_object('id', ids.resources, 'parentId', ids.root, 'text', '资源', 'notes', null, 'orderIndex', 3)
    )
  ),
  null
from (
  select
    gen_random_uuid() as root,
    gen_random_uuid() as goal,
    gen_random_uuid() as milestones,
    gen_random_uuid() as risks,
    gen_random_uuid() as resources
) as ids
on conflict (slug) do nothing;

insert into public.mindmap_templates (slug, title, description, category, state, ui)
select
  'retrospective',
  '复盘',
  '从事实到行动：记录经验与改进点，形成下一步计划。',
  '复盘',
  jsonb_build_object(
    'rootNodeId',
    ids.root,
    'nodesById',
    jsonb_build_object(
      ids.root::text,
      jsonb_build_object('id', ids.root, 'parentId', null, 'text', '复盘', 'notes', null, 'orderIndex', 0),
      ids.what::text,
      jsonb_build_object('id', ids.what, 'parentId', ids.root, 'text', '发生了什么', 'notes', null, 'orderIndex', 0),
      ids.good::text,
      jsonb_build_object('id', ids.good, 'parentId', ids.root, 'text', '做得好的', 'notes', null, 'orderIndex', 1),
      ids.improve::text,
      jsonb_build_object('id', ids.improve, 'parentId', ids.root, 'text', '可改进的', 'notes', null, 'orderIndex', 2),
      ids.next::text,
      jsonb_build_object('id', ids.next, 'parentId', ids.root, 'text', '下一步行动', 'notes', null, 'orderIndex', 3)
    )
  ),
  null
from (
  select
    gen_random_uuid() as root,
    gen_random_uuid() as what,
    gen_random_uuid() as good,
    gen_random_uuid() as improve,
    gen_random_uuid() as next
) as ids
on conflict (slug) do nothing;

commit;

