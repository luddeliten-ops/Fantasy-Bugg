-- Each published Vote4Dance class is saved independently until the admin publishes the full competition.
create table if not exists public.vote4dance_result_classes (
  competition_id text not null references public.competitions(id) on delete cascade,
  class_id text not null,
  source_competition_id text not null,
  class_label text not null,
  source_url text not null,
  rows jsonb not null check (jsonb_typeof(rows) = 'array'),
  imported_at timestamptz not null default now(),
  published_at timestamptz,
  primary key (competition_id, class_id)
);

alter table public.vote4dance_result_classes enable row level security;
grant select, insert, update, delete on public.vote4dance_result_classes to authenticated;

create policy "admin reads Vote4Dance classes" on public.vote4dance_result_classes
  for select to authenticated using ((select public.is_fantasy_admin()));
create policy "admin inserts Vote4Dance classes" on public.vote4dance_result_classes
  for insert to authenticated with check ((select public.is_fantasy_admin()));
create policy "admin updates Vote4Dance classes" on public.vote4dance_result_classes
  for update to authenticated using ((select public.is_fantasy_admin()))
  with check ((select public.is_fantasy_admin()));
create policy "admin deletes Vote4Dance classes" on public.vote4dance_result_classes
  for delete to authenticated using ((select public.is_fantasy_admin()));

create or replace function public.publish_vote4dance_results(
  p_competition_id text,
  p_rows jsonb
) returns void language plpgsql security invoker set search_path = public as $$
declare
  v_count integer;
  v_existing integer;
  v_published integer;
begin
  if not public.is_fantasy_admin() then
    raise exception 'Endast admin kan publicera resultat.';
  end if;
  select count(*) into v_count from public.vote4dance_result_classes
    where competition_id = p_competition_id;
  if v_count = 0 or jsonb_typeof(p_rows) <> 'array' or
     jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 1000 then
    raise exception 'Inga giltiga klassresultat att publicera.';
  end if;
  select count(*) into v_existing from public.competition_results
    where competition_id = p_competition_id;
  select count(*) into v_published from public.vote4dance_result_classes
    where competition_id = p_competition_id and published_at is not null;
  if v_existing > 0 and v_published = 0 then
    raise exception 'Tävlingen har redan resultat från en annan import. Granska dem först.';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_rows) as r(pair_index integer, placement integer, fantasy_points integer)
    where r.pair_index is null or r.placement is null or r.placement < 1 or
          r.fantasy_points is null
  ) or exists (
    select 1 from jsonb_to_recordset(p_rows) as r(pair_index integer)
    group by r.pair_index having count(*) > 1
  ) then
    raise exception 'Resultaten innehåller saknade värden eller dubbla par.';
  end if;

  delete from public.competition_results where competition_id = p_competition_id;
  insert into public.competition_results
    (competition_id, pair_index, pair_name, placement, matched, fantasy_points)
  select p_competition_id, r.pair_index, r.pair_name, r.placement, true, r.fantasy_points
  from jsonb_to_recordset(p_rows) as r(
    pair_index integer, pair_name text, placement integer, fantasy_points integer
  );
  perform public.calculate_competition_scores(p_competition_id);
  update public.competitions set results_imported_at = now() where id = p_competition_id;
  update public.vote4dance_result_classes set published_at = now()
    where competition_id = p_competition_id;
end;
$$;
revoke all on function public.publish_vote4dance_results(text,jsonb) from public, anon;
grant execute on function public.publish_vote4dance_results(text,jsonb) to authenticated;
