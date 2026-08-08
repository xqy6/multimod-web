-- 账号与项目
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  vibe_prompt text not null default '',
  style_params jsonb not null default '{}'::jsonb,
  modules text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'generating', 'preview', 'exported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = owner_id);

create policy "projects_select_own" on public.projects
  for select using (auth.uid() = owner_id);

create policy "projects_update_own" on public.projects
  for update using (auth.uid() = owner_id);

create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = owner_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- 项目素材
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('image', 'text')),
  name text not null,
  storage_path text,
  content text,
  created_at timestamptz not null default now()
);

alter table public.assets enable row level security;

create policy "assets_select_own" on public.assets
  for select using (auth.uid() = owner_id);

create policy "assets_insert_own" on public.assets
  for insert with check (auth.uid() = owner_id);

create policy "assets_update_own" on public.assets
  for update using (auth.uid() = owner_id);

create policy "assets_delete_own" on public.assets
  for delete using (auth.uid() = owner_id);

-- 聊天室
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  is_public boolean not null default true,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

create policy "rooms_select_authenticated" on public.rooms
  for select using (auth.role() = 'authenticated');

create policy "rooms_insert_own" on public.rooms
  for insert with check (auth.uid() = created_by);

create policy "rooms_update_creator" on public.rooms
  for update using (auth.uid() = created_by);

create policy "rooms_delete_creator" on public.rooms
  for delete using (auth.uid() = created_by);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.room_members enable row level security;

create policy "room_members_select_authenticated" on public.room_members
  for select using (auth.role() = 'authenticated');

create policy "room_members_insert_self" on public.room_members
  for insert with check (auth.uid() = user_id);

create policy "room_members_delete_self" on public.room_members
  for delete using (auth.uid() = user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages_select_authenticated" on public.messages
  for select using (auth.role() = 'authenticated');

create policy "messages_insert_in_room" on public.messages
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.room_members rm
      where rm.room_id = messages.room_id
        and rm.user_id = auth.uid()
    )
  );

create policy "messages_delete_author" on public.messages
  for delete using (auth.uid() = user_id);

-- 生成结果与排行榜
create table if not exists public.generated_sites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  version integer not null default 1,
  package_url text,
  deploy_url text,
  created_at timestamptz not null default now()
);

alter table public.generated_sites enable row level security;

create policy "generated_sites_select_own" on public.generated_sites
  for select using (auth.uid() = owner_id);

create policy "generated_sites_insert_own" on public.generated_sites
  for insert with check (auth.uid() = owner_id);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;

create policy "scores_select_authenticated" on public.scores
  for select using (auth.role() = 'authenticated');

create policy "scores_insert_own" on public.scores
  for insert with check (auth.uid() = user_id);

create policy "scores_update_own" on public.scores
  for update using (auth.uid() = user_id);

-- 存储桶
insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', false)
on conflict (id) do nothing;

create policy "project_assets_select" on storage.objects
  for select using (
    bucket_id = 'project-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "project_assets_insert" on storage.objects
  for insert with check (
    bucket_id = 'project-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "project_assets_update" on storage.objects
  for update using (
    bucket_id = 'project-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "project_assets_delete" on storage.objects
  for delete using (
    bucket_id = 'project-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 实时消息
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.room_members;
