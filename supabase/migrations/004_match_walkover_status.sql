-- Adiciona status 'walkover' (W.O.) às partidas

ALTER TABLE public.group_matches DROP CONSTRAINT IF EXISTS group_matches_status_check;
ALTER TABLE public.group_matches
  ADD CONSTRAINT group_matches_status_check
  CHECK (status IN ('pending', 'finished', 'walkover'));

ALTER TABLE public.knockout_matches DROP CONSTRAINT IF EXISTS knockout_matches_status_check;
ALTER TABLE public.knockout_matches
  ADD CONSTRAINT knockout_matches_status_check
  CHECK (status IN ('pending', 'finished', 'walkover'));
