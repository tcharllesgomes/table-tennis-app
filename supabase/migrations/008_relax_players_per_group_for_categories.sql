ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_players_per_group_check;
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_players_per_group_check CHECK (players_per_group >= 0);
