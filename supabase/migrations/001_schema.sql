-- ============================================================
-- TÊNIS DE MESA - Schema principal
-- ============================================================

-- Profiles (estende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atletas
CREATE TABLE IF NOT EXISTS public.athletes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campeonatos
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  edition INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'group_stage', 'knockout_stage', 'finished')),
  groups_count INTEGER NOT NULL DEFAULT 4 CHECK (groups_count >= 2),
  players_per_group INTEGER NOT NULL DEFAULT 4 CHECK (players_per_group >= 2),
  is_current BOOLEAN DEFAULT FALSE,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atletas inscritos no campeonato
CREATE TABLE IF NOT EXISTS public.tournament_athletes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  group_number INTEGER,
  group_rank INTEGER,
  UNIQUE(tournament_id, athlete_id)
);

-- Partidas da fase de grupos (round-robin)
CREATE TABLE IF NOT EXISTS public.group_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  group_number INTEGER NOT NULL,
  athlete1_id UUID REFERENCES public.athletes(id) NOT NULL,
  athlete2_id UUID REFERENCES public.athletes(id) NOT NULL,
  athlete1_sets INTEGER NOT NULL DEFAULT 0,
  athlete2_sets INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES public.athletes(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'finished')),
  match_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (athlete1_id != athlete2_id)
);

-- Partidas do mata-mata
-- round: contagem regressiva até 1 (final). Ex: 4 atletas → round 2 (semi), round 1 (final)
-- bracket_rank: 1=chave dos 1os colocados, 2=chave dos 2os, etc.
-- match_number: posição 1-based dentro do round
CREATE TABLE IF NOT EXISTS public.knockout_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  bracket_rank INTEGER NOT NULL,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  athlete1_id UUID REFERENCES public.athletes(id),
  athlete2_id UUID REFERENCES public.athletes(id),
  athlete1_sets INTEGER NOT NULL DEFAULT 0,
  athlete2_sets INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES public.athletes(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'finished')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Trigger: cria profile ao cadastrar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Trigger: garante apenas um campeonato atual
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_single_current_tournament()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    UPDATE public.tournaments SET is_current = FALSE
    WHERE id != NEW.id AND is_current = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_tournament_set_current ON public.tournaments;
CREATE TRIGGER on_tournament_set_current
  BEFORE INSERT OR UPDATE ON public.tournaments
  FOR EACH ROW
  WHEN (NEW.is_current = TRUE)
  EXECUTE FUNCTION public.ensure_single_current_tournament();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knockout_matches ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Qualquer um pode ler profiles" ON public.profiles
  FOR SELECT USING (TRUE);
CREATE POLICY "Usuário atualiza próprio profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Super admin gerencia profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Atletas
CREATE POLICY "Qualquer um pode ler atletas" ON public.athletes
  FOR SELECT USING (TRUE);
CREATE POLICY "Admins gerenciam atletas" ON public.athletes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Campeonatos
CREATE POLICY "Qualquer um pode ler campeonatos" ON public.tournaments
  FOR SELECT USING (TRUE);
CREATE POLICY "Admins gerenciam campeonatos" ON public.tournaments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Atletas do campeonato
CREATE POLICY "Qualquer um pode ler atletas do campeonato" ON public.tournament_athletes
  FOR SELECT USING (TRUE);
CREATE POLICY "Admins gerenciam atletas do campeonato" ON public.tournament_athletes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Partidas de grupo
CREATE POLICY "Qualquer um pode ler partidas de grupo" ON public.group_matches
  FOR SELECT USING (TRUE);
CREATE POLICY "Admins gerenciam partidas de grupo" ON public.group_matches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Partidas do mata-mata
CREATE POLICY "Qualquer um pode ler partidas mata-mata" ON public.knockout_matches
  FOR SELECT USING (TRUE);
CREATE POLICY "Admins gerenciam partidas mata-mata" ON public.knockout_matches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- ============================================================
-- Storage: fotos dos atletas
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('athletes', 'athletes', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Qualquer um lê fotos" ON storage.objects;
CREATE POLICY "Qualquer um lê fotos" ON storage.objects
  FOR SELECT USING (bucket_id = 'athletes');

DROP POLICY IF EXISTS "Admins gerenciam fotos" ON storage.objects;
CREATE POLICY "Admins gerenciam fotos" ON storage.objects
  FOR ALL USING (
    bucket_id = 'athletes' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
