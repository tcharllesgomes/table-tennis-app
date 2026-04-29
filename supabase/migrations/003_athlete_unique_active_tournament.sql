-- Impede que um atleta seja inscrito em mais de um campeonato ativo
-- (status != 'finished'). Atletas ficam livres após o campeonato terminar.

CREATE OR REPLACE FUNCTION public.check_athlete_single_active_tournament()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.tournament_athletes ta
    JOIN public.tournaments t ON t.id = ta.tournament_id
    WHERE ta.athlete_id = NEW.athlete_id
      AND ta.tournament_id <> NEW.tournament_id
      AND t.status <> 'finished'
  ) THEN
    RAISE EXCEPTION 'Atleta já está inscrito em outro campeonato ativo'
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_athlete_in_multiple_tournaments ON public.tournament_athletes;
CREATE TRIGGER prevent_athlete_in_multiple_tournaments
  BEFORE INSERT OR UPDATE OF athlete_id, tournament_id
  ON public.tournament_athletes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_athlete_single_active_tournament();
