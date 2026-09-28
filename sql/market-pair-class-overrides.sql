-- A stable market index identifies each parkort; class changes must not renumber it.
create table if not exists public.fantasy_market_pair_classes (
  pair_index integer primary key check (pair_index >= 0),
  pair_name text not null,
  pair_class text not null check (pair_class in ('Junior', 'Vuxen', 'Senior')),
  updated_at timestamptz not null default now()
);

alter table public.fantasy_market_pair_classes enable row level security;
revoke all on public.fantasy_market_pair_classes from public, anon;
revoke delete on public.fantasy_market_pair_classes from authenticated;
grant select on public.fantasy_market_pair_classes to anon, authenticated;
grant insert, update on public.fantasy_market_pair_classes to authenticated;

create policy "market class is public" on public.fantasy_market_pair_classes
  for select to anon, authenticated using (true);
create policy "admin inserts market class" on public.fantasy_market_pair_classes
  for insert to authenticated with check ((select public.is_fantasy_admin()));
create policy "admin updates market class" on public.fantasy_market_pair_classes
  for update to authenticated using ((select public.is_fantasy_admin()))
  with check ((select public.is_fantasy_admin()));

-- Save result-row matching and the permanent market class in one transaction.
create or replace function public.match_vote4dance_pair_and_class(
  p_competition_id text,
  p_updates jsonb,
  p_pair_index integer,
  p_pair_name text,
  p_pair_class text
) returns void language plpgsql security invoker set search_path = public as $$
declare
  v_update record;
begin
  if not public.is_fantasy_admin() then
    raise exception 'Endast admin kan ändra parkort.';
  end if;
  if p_pair_index is null or p_pair_index < 0 or nullif(trim(p_pair_name), '') is null or
     p_pair_class not in ('Junior', 'Vuxen', 'Senior') or
     jsonb_typeof(p_updates) is distinct from 'array' or
     jsonb_array_length(p_updates) not between 1 and 30 then
    raise exception 'Ogiltig parkortsmatchning.';
  end if;
  for v_update in select * from jsonb_to_recordset(p_updates) as x(class_id text, rows jsonb) loop
    if nullif(v_update.class_id, '') is null or jsonb_typeof(v_update.rows) is distinct from 'array' then
      raise exception 'Ogiltiga klassresultat.';
    end if;
    update public.vote4dance_result_classes
      set rows = v_update.rows
      where competition_id = p_competition_id and class_id = v_update.class_id;
    if not found then
      raise exception 'Klassen saknas eller får inte ändras.';
    end if;
  end loop;
  insert into public.fantasy_market_pair_classes(pair_index, pair_name, pair_class, updated_at)
    values (p_pair_index, p_pair_name, p_pair_class, now())
    on conflict (pair_index) do update set pair_name = excluded.pair_name,
      pair_class = excluded.pair_class, updated_at = now();
end;
$$;
revoke all on function public.match_vote4dance_pair_and_class(text,jsonb,integer,text,text) from public, anon;
grant execute on function public.match_vote4dance_pair_and_class(text,jsonb,integer,text,text) to authenticated;
