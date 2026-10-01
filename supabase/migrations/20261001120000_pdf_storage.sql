-- Fase 2: bucket privado para PDFs enviados para geração de cards.
-- O browser envia o PDF diretamente para aqui (sem passar pelo limite de
-- 4,5 MB da Vercel); o servidor lê-o, envia ao Gemini e apaga-o a seguir.
-- Cada utilizador só mexe na própria pasta: pdfs/<user_id>/...

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 15728640, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "pdfs: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "pdfs: dono lê" on storage.objects for select to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "pdfs: dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
