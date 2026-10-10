-- Run once in the Supabase SQL editor, or with supabase db push.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check (char_length(trim(name)) between 2 and 80),
 school text not null default '' check (char_length(school)<=120),
 city text not null default '' check (char_length(city)<=100),
 bio text not null default '' check (char_length(bio)<=1500),
 interests text not null default '' check (char_length(interests)<=500),
 relationship text not null default '' check (char_length(relationship)<=80),
 avatar text not null default '' check (avatar = '' or (avatar ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' and octet_length(avatar)<=250000)),
 created_at timestamptz not null default now()
);
create table public.friendships (
 id uuid primary key default gen_random_uuid(),
 sender uuid not null references public.profiles on delete cascade,
 recipient uuid not null references public.profiles on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted')),
 created_at timestamptz not null default now(),
 check(sender<>recipient)
);
create unique index friendship_pair on public.friendships (least(sender,recipient), greatest(sender,recipient));
create index friendship_recipient on public.friendships(recipient);
create index friendship_sender on public.friendships(sender);
create table public.posts (
 id uuid primary key default gen_random_uuid(),
 author uuid not null references public.profiles on delete cascade,
 wall_owner uuid not null references public.profiles on delete cascade,
 body text not null check(char_length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index posts_wall on public.posts(wall_owner,created_at desc);
create table public.messages (
 id uuid primary key default gen_random_uuid(),
 sender uuid not null references public.profiles on delete cascade,
 recipient uuid not null references public.profiles on delete cascade,
 body text not null check(char_length(trim(body)) between 1 and 4000),
 created_at timestamptz not null default now(), check(sender<>recipient)
);
create index messages_recipient on public.messages(recipient,created_at desc);
create index messages_sender on public.messages(sender,created_at desc);
create table public.pokes (
 sender uuid not null references public.profiles on delete cascade,
 recipient uuid not null references public.profiles on delete cascade,
 created_at timestamptz not null default now(),
 primary key(sender,recipient), check(sender<>recipient)
);
create function public.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,name) values(new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),'Nouveau membre'),80));
 return new;
end; $$;
create trigger on_user_created after insert on auth.users for each row execute function public.new_profile();
create function public.are_friends(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.friendships where status='accepted' and ((sender=a and recipient=b) or (sender=b and recipient=a)));
$$;
-- The caller must be the recipient. Identity and participants cannot be rewritten.
create function public.accept_friend(request_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.friendships set status='accepted' where id=request_id and recipient=auth.uid() and status='pending';
 if not found then raise exception 'Demande introuvable ou non autorisée'; end if;
end; $$;
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.posts enable row level security;
alter table public.messages enable row level security;
alter table public.pokes enable row level security;
create policy profile_read on public.profiles for select to authenticated using(true);
create policy profile_edit on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy friendship_read on public.friendships for select to authenticated using(sender=auth.uid() or recipient=auth.uid() or status='accepted');
create policy friendship_request on public.friendships for insert to authenticated with check(sender=auth.uid() and status='pending');
create policy friendship_remove on public.friendships for delete to authenticated using(sender=auth.uid() or recipient=auth.uid());
create policy posts_read on public.posts for select to authenticated using(wall_owner=auth.uid() or public.are_friends(auth.uid(),wall_owner));
create policy posts_write on public.posts for insert to authenticated with check(author=auth.uid() and (wall_owner=auth.uid() or public.are_friends(auth.uid(),wall_owner)));
create policy posts_remove on public.posts for delete to authenticated using(author=auth.uid() or wall_owner=auth.uid());
create policy messages_read on public.messages for select to authenticated using(sender=auth.uid() or recipient=auth.uid());
create policy messages_write on public.messages for insert to authenticated with check(sender=auth.uid() and public.are_friends(sender,recipient));
create policy pokes_read on public.pokes for select to authenticated using(sender=auth.uid() or recipient=auth.uid());
create policy pokes_write on public.pokes for insert to authenticated with check(sender=auth.uid() and public.are_friends(sender,recipient));
create policy pokes_remove on public.pokes for delete to authenticated using(recipient=auth.uid());
-- Explicit grants: no client can insert a profile, change participant IDs,
-- accept its own request, update messages or choose server timestamps.
revoke all on public.profiles,public.friendships,public.posts,public.messages,public.pokes from anon,authenticated;
grant select on public.profiles,public.friendships,public.posts,public.messages,public.pokes to authenticated;
grant update(name,school,city,bio,interests,relationship,avatar) on public.profiles to authenticated;
grant insert(sender,recipient) on public.friendships,public.pokes to authenticated;
grant insert(author,wall_owner,body) on public.posts to authenticated;
grant insert(sender,recipient,body) on public.messages to authenticated;
grant delete on public.friendships,public.posts,public.pokes to authenticated;
revoke all on function public.new_profile() from public;
revoke all on function public.are_friends(uuid,uuid),public.accept_friend(uuid) from public;
grant execute on function public.are_friends(uuid,uuid),public.accept_friend(uuid) to authenticated;
commit;
