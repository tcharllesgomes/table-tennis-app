-- Adiciona suporte a torneios por categorias

-- Tipo de torneio
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'classic'
  CHECK (type IN ('classic', 'categories'));

-- Categorias de um torneio
CREATE TABLE IF NOT EXISTS public.tournament_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  groups_count INTEGER NOT NULL DEFAULT 2,
  players_per_group INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atletas por categoria (permite mesmo atleta em várias categorias do mesmo torneio)
CREATE TABLE IF NOT EXISTS public.category_athletes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.tournament_categories(id) ON DELETE CASCADE NOT NULL,
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  group_number INTEGER,
  group_rank INTEGER,
  UNIQUE(category_id, athlete_id)
);

-- category_id opcional em partidas (null = torneio clássico)
ALTER TABLE public.group_matches
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.tournament_categories(id) ON DELETE CASCADE;

ALTER TABLE public.knockout_matches
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.tournament_categories(id) ON DELETE CASCADE;

-- RLS para as novas tabelas
ALTER TABLE public.tournament_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ler categorias" ON public.tournament_categories
  FOR SELECT USING (TRUE);
CREATE POLICY "Admins gerenciam categorias" ON public.tournament_categories
  FOR ALL USING (public.is_admin());

CREATE POLICY "Qualquer um pode ler atletas por categoria" ON public.category_athletes
  FOR SELECT USING (TRUE);
CREATE POLICY "Admins gerenciam atletas por categoria" ON public.category_athletes
  FOR ALL USING (public.is_admin());

-- Atualiza trigger de restrição de torneio ativo:
-- Para torneios por categoria, um atleta pode estar em múltiplas categorias do mesmo torneio,
-- mas não em dois torneios ativos diferentes.
-- O controle agora é feito via tournament_athletes (insert manual ao adicionar à 1ª categoria).
