-- Tahfyz schema for Supabase (phase 2 migration from local JSON store)
-- Run in Supabase SQL editor when ready to move off data/store.json

create type public.user_role as enum ('admin', 'teacher', 'student', 'parent');
create type public.booking_status as enum (
  'pending_payment',
  'confirmed',
  'cancelled',
  'expired'
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  name text not null,
  role public.user_role not null,
  phone text,
  whatsapp text,
  teacher_id text,
  must_set_password boolean default false,
  created_at timestamptz default now()
);

create table public.teachers (
  id text primary key,
  name text not null,
  name_ar text,
  photo_url text,
  bio text,
  bio_ar text,
  subjects text[] default '{}',
  active boolean default true,
  user_id uuid references public.profiles(id)
);

create table public.teacher_availability (
  id text primary key,
  teacher_id text references public.teachers(id) on delete cascade,
  day_of_week int check (day_of_week between 0 and 6),
  start_hour int check (start_hour between 0 and 23),
  end_hour int check (end_hour between 1 and 24)
);

create table public.bookings (
  id text primary key,
  teacher_id text references public.teachers(id),
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  guest_name text not null,
  guest_email text not null,
  phone text not null,
  whatsapp text not null,
  timezone text not null,
  notes text,
  status public.booking_status not null default 'pending_payment',
  hold_expires_at timestamptz not null,
  student_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  confirmed_at timestamptz
);

create index bookings_teacher_slot on public.bookings (teacher_id, slot_start, slot_end);

create table public.notifications (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read boolean default false,
  booking_id text references public.bookings(id),
  created_at timestamptz default now()
);

create table public.parent_student_links (
  id text primary key,
  parent_id uuid references public.profiles(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  unique (parent_id, student_id)
);

alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.bookings enable row level security;
alter table public.notifications enable row level security;
