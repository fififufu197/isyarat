-- ============================================================
-- Isyarat · skema Supabase (opsional)
-- Jalankan di Supabase SQL Editor. Aman dijalankan berulang.
-- ============================================================

create extension if not exists "pgcrypto";

-- Profil isyarat: kumpulan template huruf (k-NN) + kata (DTW).
create table if not exists public.sign_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Profil saya',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists sign_profiles_user_idx
  on public.sign_profiles (user_id, updated_at desc);

-- Transkrip yang sengaja disimpan pengguna.
create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null default 'manual'
    check (source in ('kamera', 'video', 'manual')),
  text text not null check (char_length(text) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists transcripts_user_idx
  on public.transcripts (user_id, created_at desc);

-- ------------------------------------------------------------
-- Row Level Security: setiap akun hanya melihat datanya sendiri.
-- ------------------------------------------------------------
alter table public.sign_profiles enable row level security;
alter table public.transcripts enable row level security;

drop policy if exists "sign_profiles select own" on public.sign_profiles;
create policy "sign_profiles select own"
  on public.sign_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "sign_profiles insert own" on public.sign_profiles;
create policy "sign_profiles insert own"
  on public.sign_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "sign_profiles update own" on public.sign_profiles;
create policy "sign_profiles update own"
  on public.sign_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "sign_profiles delete own" on public.sign_profiles;
create policy "sign_profiles delete own"
  on public.sign_profiles for delete
  using (auth.uid() = user_id);

drop policy if exists "transcripts select own" on public.transcripts;
create policy "transcripts select own"
  on public.transcripts for select
  using (auth.uid() = user_id);

drop policy if exists "transcripts insert own" on public.transcripts;
create policy "transcripts insert own"
  on public.transcripts for insert
  with check (auth.uid() = user_id);

drop policy if exists "transcripts delete own" on public.transcripts;
create policy "transcripts delete own"
  on public.transcripts for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Catatan:
-- 1. Login memakai Supabase Auth magic link (email).
-- 2. Di Authentication → URL Configuration, tambahkan domain
--    produksi dan http://localhost:3000 ke Redirect URLs.
-- 3. Tabel menyimpan JSON profil, BUKAN video. Video tidak pernah
--    diunggah oleh aplikasi ini.
-- ------------------------------------------------------------
