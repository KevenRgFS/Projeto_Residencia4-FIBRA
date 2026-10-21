create table if not exists public.envios (
  id               uuid primary key default gen_random_uuid(),
  nome             text        not null,
  tamanho_bytes    bigint      not null,
  detalhe          text,
  status           text        not null default 'na_fila'
                   check (status in ('na_fila', 'processando', 'indexado', 'erro')),
  progresso        integer     not null default 0 check (progresso between 0 and 100),
  caminho_arquivo  text        not null,   -- onde o arquivo está no Storage
  empresa_id       bigint references public.empresa ("Id_empresa") on delete set null,  -- liga o envio à empresa
  pilar            text,
  tipo_dado        text,
  periodo          text,
  observacoes      text,
  created_at       timestamptz not null default now()
);

alter table public.envios enable row level security;

create policy "envios_leitura"  on public.envios for select to anon using (true);
create policy "envios_insercao" on public.envios for insert to anon with check (true);
create policy "envios_edicao"   on public.envios for update to anon using (true) with check (true);
create policy "envios_exclusao" on public.envios for delete to anon using (true);

create policy "empresa_leitura" on public.empresa for select to anon using (true);

insert into storage.buckets (id, name, public)
values ('base-de-dados', 'base-de-dados', false)
on conflict (id) do nothing;

create policy "arquivos_leitura"  on storage.objects for select to anon using (bucket_id = 'base-de-dados');
create policy "arquivos_envio"    on storage.objects for insert to anon with check (bucket_id = 'base-de-dados');
create policy "arquivos_exclusao" on storage.objects for delete to anon using (bucket_id = 'base-de-dados');


