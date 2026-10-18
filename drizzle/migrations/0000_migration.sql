
create type public.app_role as enum ('admin','fixo','freela');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'fixo')
$$;

create policy "own roles or admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Músicos
create table public.musicians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  nome text not null,
  instrumento text not null default 'outro',
  whatsapp text,
  email text,
  tipo text not null default 'freela' check (tipo in ('fixo','freela')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index musicians_email_idx on public.musicians (lower(email)) where email is not null;

create or replace function public.my_musician_id() returns uuid language sql stable security definer set search_path = public as $$
  select id from public.musicians where user_id = auth.uid() limit 1
$$;

-- Repertório
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  artista text,
  tom text,
  bpm int,
  observacoes text,
  youtube_url text,
  created_at timestamptz not null default now()
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  vs_path text,
  duracao text,
  observacoes text,
  created_at timestamptz not null default now()
);

create table public.block_songs (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.blocks(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  position int not null default 0
);

create table public.live_videos (
  id uuid primary key default gen_random_uuid(),
  youtube_url text not null,
  titulo text not null,
  data_show date,
  created_at timestamptz not null default now()
);

create table public.video_marks (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.live_videos(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  segundos int not null default 0
);

create table public.shows (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data date not null,
  local text,
  endereco text,
  horario_saida time,
  horario_passagem time,
  horario_palco time,
  duracao text,
  traje text,
  observacoes text,
  created_at timestamptz not null default now()
);

create table public.setlist_items (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  block_id uuid references public.blocks(id) on delete cascade,
  song_id uuid references public.songs(id) on delete cascade,
  position int not null default 0,
  check ((block_id is null) <> (song_id is null))
);

create table public.show_lineup (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  musician_id uuid not null references public.musicians(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente','confirmado','recusado')),
  unique (show_id, musician_id)
);

create table public.rehearsals (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  data date not null,
  horario time,
  local text,
  observacoes text
);

create table public.rehearsal_attendance (
  id uuid primary key default gen_random_uuid(),
  rehearsal_id uuid not null references public.rehearsals(id) on delete cascade,
  musician_id uuid not null references public.musicians(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente','confirmado','recusado')),
  unique (rehearsal_id, musician_id)
);

-- Visibility helpers
create or replace function public.can_see_show(_show uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from public.show_lineup l join public.shows s on s.id = l.show_id
    where l.show_id = _show and l.musician_id = public.my_musician_id()
      and s.data + 3 >= current_date)
$$;
create or replace function public.can_see_block(_block uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from public.setlist_items i where i.block_id = _block and public.can_see_show(i.show_id))
$$;
create or replace function public.can_see_song(_song uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff()
    or exists (select 1 from public.setlist_items i where i.song_id = _song and public.can_see_show(i.show_id))
    or exists (select 1 from public.block_songs b where b.song_id = _song and public.can_see_block(b.block_id))
$$;
create or replace function public.can_see_musician(_m uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or _m = public.my_musician_id() or exists (
    select 1 from public.show_lineup l where l.musician_id = _m and public.can_see_show(l.show_id))
$$;

-- Grants + RLS
do $$
declare t text;
begin
  foreach t in array array['musicians','songs','blocks','block_songs','live_videos','video_marks','shows','setlist_items','show_lineup','rehearsals','rehearsal_attendance'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admin writes" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

create policy "read musicians" on public.musicians for select to authenticated using (public.can_see_musician(id));
create policy "read songs" on public.songs for select to authenticated using (public.can_see_song(id));
create policy "read blocks" on public.blocks for select to authenticated using (public.can_see_block(id));
create policy "read block_songs" on public.block_songs for select to authenticated using (public.can_see_block(block_id));
create policy "read videos" on public.live_videos for select to authenticated using (public.is_staff());
create policy "read marks" on public.video_marks for select to authenticated using (public.is_staff());
create policy "read shows" on public.shows for select to authenticated using (public.can_see_show(id));
create policy "read setlist" on public.setlist_items for select to authenticated using (public.can_see_show(show_id));
create policy "read lineup" on public.show_lineup for select to authenticated using (public.can_see_show(show_id));
create policy "read rehearsals" on public.rehearsals for select to authenticated using (public.can_see_show(show_id));
create policy "read attendance" on public.rehearsal_attendance for select to authenticated
  using (exists (select 1 from public.rehearsals r where r.id = rehearsal_id and public.can_see_show(r.show_id)));

-- Responder presença (somente o próprio músico)
create or replace function public.responder_show(_lineup uuid, _status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if _status not in ('confirmado','recusado','pendente') then raise exception 'status inválido'; end if;
  update public.show_lineup l set status = _status
   where l.id = _lineup and l.musician_id = public.my_musician_id() and public.can_see_show(l.show_id);
end $$;
create or replace function public.responder_ensaio(_att uuid, _status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if _status not in ('confirmado','recusado','pendente') then raise exception 'status inválido'; end if;
  update public.rehearsal_attendance a set status = _status
   where a.id = _att and a.musician_id = public.my_musician_id()
     and exists (select 1 from public.rehearsals r where r.id = a.rehearsal_id and public.can_see_show(r.show_id));
end $$;
grant execute on function public.responder_show(uuid,text), public.responder_ensaio(uuid,text) to authenticated;

-- Convite automático para ensaios
create or replace function public.tg_rehearsal_invite() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.rehearsal_attendance (rehearsal_id, musician_id)
  select new.id, l.musician_id from public.show_lineup l where l.show_id = new.show_id
  on conflict do nothing;
  return new;
end $$;
create trigger rehearsal_invite after insert on public.rehearsals for each row execute function public.tg_rehearsal_invite();

create or replace function public.tg_lineup_invite() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.rehearsal_attendance (rehearsal_id, musician_id)
    select r.id, new.musician_id from public.rehearsals r where r.show_id = new.show_id
    on conflict do nothing;
    return new;
  else
    delete from public.rehearsal_attendance a using public.rehearsals r
     where a.rehearsal_id = r.id and r.show_id = old.show_id and a.musician_id = old.musician_id;
    return old;
  end if;
end $$;
create trigger lineup_invite after insert or delete on public.show_lineup for each row execute function public.tg_lineup_invite();

-- Vincular usuário ↔ músico e papéis
create or replace function public.sync_musician_role(_m public.musicians) returns void language plpgsql security definer set search_path = public as $$
begin
  if _m.user_id is null then return; end if;
  delete from public.user_roles where user_id = _m.user_id and role in ('fixo','freela');
  if _m.ativo then
    insert into public.user_roles (user_id, role) values (_m.user_id, _m.tipo::app_role) on conflict do nothing;
  end if;
end $$;

create or replace function public.tg_musician_link() returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if new.user_id is null and new.email is not null then
    select id into new.user_id from auth.users where lower(email) = lower(new.email) limit 1;
  end if;
  return new;
end $$;
create trigger musician_link before insert or update on public.musicians for each row execute function public.tg_musician_link();

create or replace function public.tg_musician_role() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_musician_role(new);
  return new;
end $$;
create trigger musician_role after insert or update on public.musicians for each row execute function public.tg_musician_role();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  update public.musicians set user_id = new.id where user_id is null and lower(email) = lower(new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Pré-cadastro do repertório
insert into public.songs (titulo) values
('TEMPO DE ALEGRIA'),('DANÇANDO'),('LARGADINHO'),('ME CHAMA DE AMOR'),('AMOR PERFEITO'),('BAIANIDADE NAGÔ'),('PREFIXO DE VERÃO'),('VIXE MAINHA'),('EVA'),('ARAKETO BOM D+'),('COBERTOR'),('PRAIERO'),('BEIJAR NA BOCA'),('MULHER DE FASES'),('ARERE'),('PAIS TROPICAL'),('CHUPA TODA'),('DANCA VAMPIRO'),('100% VOCÊ'),('CHICLETE'),('HAJA AMOR'),('ENERGIA DE GOSTOSA'),('MACETANDO'),('CRIA DA IVETE'),('MEU ABRIGO'),('CORAÇÃO'),('BOLA DE SABAO'),('ME ABRAÇA'),('SEUS PROBLEMAS'),('ALÔ PAIXÃO'),('BELEZA RARA'),('FARAÓ'),('DOCE OBSESSÃO'),('BATE LATA'),('LEVA EU'),('TO NA RUA'),('EMPURRA EMP'),('LEVADA LOUCA'),('VERÃO NA PORTA'),('BASE DO BEIJO'),('EXTRAVASA'),('PARARA'),('MILLA'),('MUNDO VAI'),('WE ARE CARNAVAL'),('Ê SAUDADE'),('BOTA PRA FERVER'),('FESTA'),('POEIRA'),('LIRIRRIXA'),('VEM NENÉM'),('DESAFIO'),('DANÇA D BUMBUM'),('DANÇA D GARRAFA'),('DE LADINHO'),('QUERO SE FELIZ TB'),('LIBERAR GERAL'),('NÃO QRO DINHEIRO');
