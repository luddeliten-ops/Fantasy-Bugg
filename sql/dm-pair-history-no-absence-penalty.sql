-- Pair details must use the same DM absence rule as saved team scores.
create or replace function public.get_my_pair_point_history(p_pair_index integer)
returns table (
  competition_id text,
  competition_name text,
  competition_date date,
  placement integer,
  raw_points numeric,
  in_team boolean,
  was_captain boolean,
  counted_points numeric
)
language sql security definer set search_path = public as $$
  with my_scores as (
    select s.competition_id, s.pair_indices, s.captain_pair_index
    from public.fantasy_competition_scores s
    where s.user_id = auth.uid()
  ),
  relevant_competitions as (
    select cr.competition_id
    from public.competition_results cr
    where cr.pair_index = p_pair_index and cr.matched = true
    union
    select ms.competition_id
    from my_scores ms
    where p_pair_index = any(ms.pair_indices)
  )
  select c.id, c.name, c.date, cr.placement,
    coalesce(cr.fantasy_points, 0)::numeric,
    (ms.pair_indices is not null and p_pair_index = any(ms.pair_indices)),
    (ms.captain_pair_index = p_pair_index),
    case
      when ms.pair_indices is not null
        and p_pair_index = any(ms.pair_indices)
        and cr.pair_index is null
      then case when upper(trim(c.level)) = 'DM' then 0 else -50 end
      when ms.pair_indices is not null
        and p_pair_index = any(ms.pair_indices)
        and ms.captain_pair_index = p_pair_index
      then coalesce(cr.fantasy_points, 0) * 1.5
      when ms.pair_indices is not null
        and p_pair_index = any(ms.pair_indices)
      then coalesce(cr.fantasy_points, 0)
      else 0
    end::numeric
  from relevant_competitions rc
  join public.competitions c on c.id = rc.competition_id
  left join my_scores ms on ms.competition_id = rc.competition_id
  left join public.competition_results cr
    on cr.competition_id = rc.competition_id
    and cr.pair_index = p_pair_index and cr.matched = true
  order by c.date desc;
$$;
