## Context

We currently have delta specs living only in `openspec/changes/*/specs/`, but `openspec/specs/` is empty. This makes it difficult to represent follow-up work as modifications to existing capabilities.

## Goals / Non-Goals

**Goals:**

- Create initial main specs under `openspec/specs/` for the capabilities already implemented so future changes can use MODIFIED requirements.

**Non-Goals:**

- Changing product behavior or requirements.
- Archiving completed changes (handled separately).

## Decisions

- Copy the current “ADDED Requirements” specs from completed changes into `openspec/specs/<capability>/spec.md` as the initial baseline.

## Risks / Trade-offs

- [Risk] Specs may drift if future PRs update delta specs but not main specs. → Mitigation: add a lightweight practice to sync main specs whenever a change is merged.
