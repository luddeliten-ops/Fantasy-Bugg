-- Fantasy Bugg – server-side admin-RLS inför lansering
-- Körs i Supabase SQL Editor. Denna fil ligger i GitHub men körs INTE automatiskt.
-- Syfte: publika läsningar tillåts, men skrivningar till tävlings-/admininnehåll kräver admin-användaren.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN (
        'competitions',
        'competition_results',
        'fantasy_competition_scores',
        'fantasy_streams',
        'fantasy_home_content'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',r.policyname,r.schemaname,r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fantasy_competition_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fantasy_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fantasy_home_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competitions public read" ON public.competitions
FOR SELECT USING (true);
CREATE POLICY "competitions admin insert" ON public.competitions
FOR INSERT WITH CHECK (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid);
CREATE POLICY "competitions admin update" ON public.competitions
FOR UPDATE USING (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid)
WITH CHECK (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid);
CREATE POLICY "competitions admin delete" ON public.competitions
FOR DELETE USING (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid);

CREATE POLICY "competition_results public read" ON public.competition_results
FOR SELECT USING (true);
CREATE POLICY "competition_results admin insert" ON public.competition_results
FOR INSERT WITH CHECK (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid);
CREATE POLICY "competition_results admin update" ON public.competition_results
FOR UPDATE USING (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid)
WITH CHECK (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid);
CREATE POLICY "competition_results admin delete" ON public.competition_results
FOR DELETE USING (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid);

CREATE POLICY "fantasy_competition_scores public read" ON public.fantasy_competition_scores
FOR SELECT USING (true);
CREATE POLICY "fantasy_competition_scores admin insert" ON public.fantasy_competition_scores
FOR INSERT WITH CHECK (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid);
CREATE POLICY "fantasy_competition_scores admin update" ON public.fantasy_competition_scores
FOR UPDATE USING (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid)
WITH CHECK (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid);
CREATE POLICY "fantasy_competition_scores admin delete" ON public.fantasy_competition_scores
FOR DELETE USING (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid);

CREATE POLICY "fantasy_streams public read" ON public.fantasy_streams
FOR SELECT USING (true);
CREATE POLICY "fantasy_streams admin insert" ON public.fantasy_streams
FOR INSERT WITH CHECK (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid);
CREATE POLICY "fantasy_streams admin update" ON public.fantasy_streams
FOR UPDATE USING (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid)
WITH CHECK (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid);
CREATE POLICY "fantasy_streams admin delete" ON public.fantasy_streams
FOR DELETE USING (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid);

CREATE POLICY "fantasy_home_content public read" ON public.fantasy_home_content
FOR SELECT USING (true);
CREATE POLICY "fantasy_home_content admin insert" ON public.fantasy_home_content
FOR INSERT WITH CHECK (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid);
CREATE POLICY "fantasy_home_content admin update" ON public.fantasy_home_content
FOR UPDATE USING (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid)
WITH CHECK (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid);
CREATE POLICY "fantasy_home_content admin delete" ON public.fantasy_home_content
FOR DELETE USING (auth.uid()='48adbd60-4c66-4949-8490-8d78236d234d'::uuid);
