
create policy "vs read" on storage.objects for select to authenticated
  using (bucket_id = 'vs' and exists (select 1 from public.blocks b where b.vs_path = name and public.can_see_block(b.id)));
create policy "vs admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'vs' and public.is_admin());
create policy "vs admin update" on storage.objects for update to authenticated using (bucket_id = 'vs' and public.is_admin());
create policy "vs admin delete" on storage.objects for delete to authenticated using (bucket_id = 'vs' and public.is_admin());
