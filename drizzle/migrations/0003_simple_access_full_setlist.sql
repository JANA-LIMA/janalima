create or replace function public.is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.musicians m where m.user_id = auth.uid() and m.ativo)
$$;

create or replace function public.tg_show_full_setlist() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.setlist_items (show_id, block_id, position)
  select new.id, b.id, (row_number() over (order by b.nome))::int - 1 from public.blocks b;
  return new;
end $$;

drop trigger if exists show_full_setlist on public.shows;
create trigger show_full_setlist after insert on public.shows for each row execute function public.tg_show_full_setlist();