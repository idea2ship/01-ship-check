-- /1> Ship Check — Supabase schema
-- Run this in the Supabase SQL editor (or via the CLI) once.

create table if not exists ship_check_ideas (
  id uuid primary key default gen_random_uuid(),
  idea_text text not null,
  success_criteria text not null,
  ai_summary text,
  clarity_score int,
  clarity_comment text,
  mvp_score int,
  mvp_comment text,
  should_cut text[],
  first_feature_title text,
  first_feature_description text,
  improved_success_metric text,
  risks text[],
  next_actions text[],
  allow_anonymous_storage boolean not null default false,
  allow_content_use boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable RLS. We do NOT add any policy for anon/authenticated, so the table is
-- effectively unreachable from client-side keys. Inserts and selects only work
-- via the service role key (server-only).
alter table ship_check_ideas enable row level security;

create index if not exists ship_check_ideas_created_at_idx
  on ship_check_ideas (created_at desc);

-- Migration: concept image (idempotent — safe to re-run)
alter table ship_check_ideas
  add column if not exists concept_image_url text,
  add column if not exists concept_image_prompt text;
