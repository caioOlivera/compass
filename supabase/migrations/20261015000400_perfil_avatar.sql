-- Foto de perfil: caminho do arquivo no bucket público "avatars", sempre dentro da pasta do dono.

alter table public.profiles
  add column avatar_path text
  check (avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$' and split_part(avatar_path, '/', 1) = id::text);

grant update (avatar_path) on public.profiles to authenticated;

-- Bucket público (as fotos aparecem por URL), até 2 MB, só imagens.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada pessoa só mexe na própria pasta: avatars/<uid>/arquivo
create policy "avatars: dono lê a pasta"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: dono envia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: dono apaga"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
