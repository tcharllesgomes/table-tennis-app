-- Torneios por categorias não usam groups_count/players_per_group na tabela tournaments
-- (essas configurações ficam em tournament_categories). O constraint antigo exigia >= 2,
-- o que impedia a criação com valor 0. Relaxa para >= 0.
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_groups_count_check;
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_groups_count_check CHECK (groups_count >= 0);
