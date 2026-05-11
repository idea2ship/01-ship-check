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

-- Migration 1: concept image (idempotent — safe to re-run)
alter table ship_check_ideas
  add column if not exists concept_image_url text,
  add column if not exists concept_image_prompt text;

-- Migration 2: ship-type result shape (MBTI-style classification)
-- The original wide-row columns above are preserved for backwards
-- compatibility with the very first saved rows. New rows only populate the
-- columns below.
alter table ship_check_ideas
  add column if not exists ship_type_key text,
  add column if not exists ship_type_name text,
  add column if not exists ship_type_name_en text,
  add column if not exists ship_type_blurb text,
  add column if not exists can_ship_in_week boolean,
  add column if not exists confidence_score int,
  add column if not exists clarity int,
  add column if not exists mvp_scope int,
  add column if not exists feasibility int,
  add column if not exists mvp_keep text[],
  add column if not exists mvp_cut text[];
