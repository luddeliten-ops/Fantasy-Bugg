-- Re-publishing corrected results must use the lineup that earned the original score.
create or replace function public.calculate_competition_scores(p_competition_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_fantasy_admin() then
    raise exception 'Endast admin kan räkna tävlingspoäng.';
  end if;

  if exists (select 1 from public.fantasy_competition_scores where competition_id = p_competition_id) then
    update public.fantasy_competition_scores s
    set team_points = coalesce((
      select sum(case
        when cr.pair_index is null then -50
        when pi.pair_index = s.captain_pair_index then cr.fantasy_points * 1.5
        else cr.fantasy_points
      end)::numeric(10,1)
      from unnest(s.pair_indices) as pi(pair_index)
      left join public.competition_results cr
        on cr.competition_id = p_competition_id
        and cr.pair_index = pi.pair_index and cr.matched = true
    ), 0), calculated_at = now()
    where s.competition_id = p_competition_id;
    return;
  end if;

  insert into public.fantasy_competition_scores
    (user_id, competition_id, pair_indices, captain_pair_index, team_points, calculated_at)
  select ft.user_id, p_competition_id, ft.pair_indices,
    public.resolve_captain_pair_index(ft.pair_indices, ft.captain_index),
    sum(case
      when cr.pair_index is null then -50
      when pi.pair_index = public.resolve_captain_pair_index(ft.pair_indices, ft.captain_index)
        then cr.fantasy_points * 1.5
      else cr.fantasy_points
    end)::numeric(10,1), now()
  from public.fantasy_teams ft
  cross join lateral unnest(ft.pair_indices) as pi(pair_index)
  left join public.competition_results cr
    on cr.competition_id = p_competition_id
    and cr.pair_index = pi.pair_index and cr.matched = true
  where cardinality(ft.pair_indices) > 0
  group by ft.user_id, ft.pair_indices, ft.captain_index;
end;
$$;
revoke all on function public.calculate_competition_scores(text) from public, anon;
grant execute on function public.calculate_competition_scores(text) to authenticated, service_role;
