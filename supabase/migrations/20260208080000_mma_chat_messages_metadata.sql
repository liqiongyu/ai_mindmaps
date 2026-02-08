-- MindMaps AI (MMA) - Chat message metadata for audit completeness (P0-10)
--
-- Adds:
-- - `chat_messages.metadata` jsonb for extensible audit fields (constraints/summary/impact)

begin;

alter table public.chat_messages
add column if not exists metadata jsonb not null default '{}'::jsonb;

commit;

