-- Vocab Tracker — initial schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to run more than once: every statement is guarded, so re-running it
-- after a partial or failed attempt will not error.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- A word is known, unsure (recognized but couldn't recall in time), or unknown.
-- Untested words simply have no row in user_words.
do $$ begin
  create type public.word_status as enum ('known', 'unsure', 'unknown');
exception when duplicate_object then null;
end $$;

-- How a status was determined. Kept so weaker evidence can be re-tested later.
do $$ begin
  create type public.test_kind as enum (
    'translation_mc',  -- pick the English meaning
    'definition_mc',   -- pick the word matching a target-language definition
    'cloze',           -- fill the blank in a target-language sentence
    'image_mc',        -- pick the word matching an image
    'manual'           -- user edited the status directly
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Reference data (shared, read-only to users)
-- ---------------------------------------------------------------------------

create table if not exists public.languages (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,        -- ISO code, e.g. 'ko'
  name        text not null,               -- 'Korean'
  native_name text,                        -- '한국어'
  created_at  timestamptz not null default now()
);

-- One row per *sense*, not per surface form. 일 (work) and 일 (day) are two
-- rows at their own frequency ranks; 먹다 covers 먹어/먹어요/먹었어요.
create table if not exists public.words (
  id                uuid primary key default gen_random_uuid(),
  language_id       uuid not null references public.languages(id) on delete cascade,
  frequency_rank    integer not null,
  lemma             text not null,         -- dictionary form
  sense_index       smallint not null default 1,
  gloss             text not null,         -- English meaning of this sense
  part_of_speech    text,
  semantic_category text,                  -- 'food', 'emotions', 'animals', ...
  concreteness      text check (concreteness in ('concrete', 'abstract', 'function')),
  notes             jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  constraint words_rank_unique unique (language_id, frequency_rank),
  constraint words_sense_unique unique (language_id, lemma, sense_index)
);

create index if not exists words_lang_rank_idx
  on public.words (language_id, frequency_rank);

-- Definitions/cloze sentences generated ahead of time using only vocabulary
-- at or below max_rank_used, so a mode unlocks once the learner's frontier
-- covers every word it relies on.
create table if not exists public.word_definitions (
  id            uuid primary key default gen_random_uuid(),
  word_id       uuid not null references public.words(id) on delete cascade,
  kind          text not null check (kind in ('definition', 'cloze')),
  body          text not null,
  max_rank_used integer not null,
  created_at    timestamptz not null default now()
);

create index if not exists word_definitions_word_idx
  on public.word_definitions (word_id);

-- ---------------------------------------------------------------------------
-- Per-user data
-- ---------------------------------------------------------------------------

create table if not exists public.user_words (
  user_id        uuid not null references auth.users(id) on delete cascade,
  word_id        uuid not null references public.words(id) on delete cascade,
  status         public.word_status not null,
  determined_by  public.test_kind not null,
  updated_at     timestamptz not null default now(),
  primary key (user_id, word_id)
);

create index if not exists user_words_status_idx
  on public.user_words (user_id, status);

-- Append-only answer log. Powers retesting, stats, and undo without
-- needing schema changes later.
create table if not exists public.test_events (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  word_id     uuid not null references public.words(id) on delete cascade,
  test_kind   public.test_kind not null,
  outcome     public.word_status not null,
  response_ms integer,
  timed_out   boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists test_events_user_time_idx
  on public.test_events (user_id, created_at desc);

create table if not exists public.user_language_settings (
  user_id       uuid not null references auth.users(id) on delete cascade,
  language_id   uuid not null references public.languages(id) on delete cascade,
  frontier_rank integer not null default 0,   -- highest rank cleared so far
  timer_ms      integer not null default 3000,
  is_active     boolean not null default true,
  updated_at    timestamptz not null default now(),
  primary key (user_id, language_id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.languages              enable row level security;
alter table public.words                  enable row level security;
alter table public.word_definitions       enable row level security;
alter table public.user_words             enable row level security;
alter table public.test_events            enable row level security;
alter table public.user_language_settings enable row level security;

-- Reference data: any signed-in user may read; nobody may write via the API.
drop policy if exists "read languages" on public.languages;
create policy "read languages" on public.languages
  for select to authenticated using (true);

drop policy if exists "read words" on public.words;
create policy "read words" on public.words
  for select to authenticated using (true);

drop policy if exists "read definitions" on public.word_definitions;
create policy "read definitions" on public.word_definitions
  for select to authenticated using (true);

-- Per-user data: users touch only their own rows.
drop policy if exists "own user_words" on public.user_words;
create policy "own user_words" on public.user_words
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own test_events" on public.test_events;
create policy "own test_events" on public.test_events
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own settings" on public.user_language_settings;
create policy "own settings" on public.user_language_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Seed: languages
-- ---------------------------------------------------------------------------

insert into public.languages (code, name, native_name)
values ('ko', 'Korean', '한국어')
on conflict (code) do nothing;

-- Confirms it worked: should return one row, 'Korean'.
select code, name from public.languages;
