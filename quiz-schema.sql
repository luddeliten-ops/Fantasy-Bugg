-- Run in the existing Fantasy Bugg Supabase project's SQL editor before enabling the quiz.
-- The answer key is stored only in database code, never in browser JavaScript.
create table if not exists public.felix_quiz_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz,
  elapsed_ms integer,
  score integer check (score between 0 and 10),
  answers jsonb
);
alter table public.felix_quiz_attempts enable row level security;
revoke all on public.felix_quiz_attempts from anon, authenticated;

create or replace function public.quiz_start()
returns jsonb language plpgsql security definer
set search_path = '' as $$
declare uid uuid := auth.uid(); attempt public.felix_quiz_attempts;
begin
  if uid is null then raise exception 'Logga in för att delta'; end if;
  insert into public.felix_quiz_attempts(user_id) values (uid)
  on conflict (user_id) do nothing;
  select * into attempt from public.felix_quiz_attempts where user_id = uid;
  return jsonb_build_object('started', true, 'submitted', attempt.finished_at is not null,
    'score', attempt.score, 'elapsed_ms', attempt.elapsed_ms);
end $$;

create or replace function public.quiz_submit(p_answers jsonb, p_elapsed_ms integer default null)
returns jsonb language plpgsql security definer
set search_path = '' as $$
declare
  uid uuid := auth.uid(); attempt public.felix_quiz_attempts;
  answer_key jsonb := '{"q1":"D","q2":"C","q3":"C","q4":"D","q5":"D","q6":"A","q7":"A","q8a":"E","q8b":"C","q8c":"I","q8d":"G","q8e":"B","q9":"A","q10":"D"}'::jsonb;
  key text; points integer := 0; elapsed integer;
begin
  if uid is null then raise exception 'Logga in för att delta'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'Ogiltiga svar'; end if;
  select * into attempt from public.felix_quiz_attempts where user_id = uid for update;
  if not found then raise exception 'Starta quizet först'; end if;
  if attempt.finished_at is not null then raise exception 'Du har redan skickat in quizet'; end if;
  for key in select jsonb_object_keys(answer_key) loop
    if key not like 'q8%' and p_answers->>key = answer_key->>key then points := points + 1; end if;
  end loop;
  if (select bool_and(p_answers->>k = answer_key->>k)
      from unnest(array['q8a','q8b','q8c','q8d','q8e']) as k) then
    points := points + 1;
  end if;
  elapsed := greatest(0, floor(extract(epoch from (clock_timestamp() - attempt.started_at)) * 1000)::integer);
  update public.felix_quiz_attempts
     set finished_at = clock_timestamp(), elapsed_ms = elapsed, score = points, answers = p_answers
   where user_id = uid;
  return jsonb_build_object('score', points, 'elapsed_ms', elapsed);
end $$;

create or replace function public.quiz_admin_results()
returns table(user_id uuid, started_at timestamptz, finished_at timestamptz,
  elapsed_ms integer, score integer, answers jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is distinct from '7408ec3a-29d1-4b48-8cd0-30d20b9155d7'::uuid then
    raise exception 'Endast administratören har åtkomst';
  end if;
  return query select a.user_id, a.started_at, a.finished_at, a.elapsed_ms, a.score, a.answers
    from public.felix_quiz_attempts a where a.finished_at is not null
    order by a.score desc, a.elapsed_ms asc, a.finished_at asc;
end $$;

revoke all on function public.quiz_start() from public, anon;
revoke all on function public.quiz_submit(jsonb, integer) from public, anon;
revoke all on function public.quiz_admin_results() from public, anon;
grant execute on function public.quiz_start() to authenticated;
grant execute on function public.quiz_submit(jsonb, integer) to authenticated;
grant execute on function public.quiz_admin_results() to authenticated;
