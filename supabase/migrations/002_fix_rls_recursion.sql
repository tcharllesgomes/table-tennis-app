-- Conserta recursão infinita nas policies RLS de profiles.
-- Cria funções SECURITY DEFINER que leem profiles ignorando RLS,
-- evitando o loop quando uma policy precisa consultar a própria tabela.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- profiles
DROP POLICY IF EXISTS "Super admin gerencia profiles" ON public.profiles;
CREATE POLICY "Super admin gerencia profiles" ON public.profiles
  FOR ALL USING (public.is_super_admin());

-- athletes
DROP POLICY IF EXISTS "Admins gerenciam atletas" ON public.athletes;
CREATE POLICY "Admins gerenciam atletas" ON public.athletes
  FOR ALL USING (public.is_admin());

-- tournaments
DROP POLICY IF EXISTS "Admins gerenciam campeonatos" ON public.tournaments;
CREATE POLICY "Admins gerenciam campeonatos" ON public.tournaments
  FOR ALL USING (public.is_admin());

-- tournament_athletes
DROP POLICY IF EXISTS "Admins gerenciam atletas do campeonato" ON public.tournament_athletes;
CREATE POLICY "Admins gerenciam atletas do campeonato" ON public.tournament_athletes
  FOR ALL USING (public.is_admin());

-- group_matches
DROP POLICY IF EXISTS "Admins gerenciam partidas de grupo" ON public.group_matches;
CREATE POLICY "Admins gerenciam partidas de grupo" ON public.group_matches
  FOR ALL USING (public.is_admin());

-- knockout_matches
DROP POLICY IF EXISTS "Admins gerenciam partidas mata-mata" ON public.knockout_matches;
CREATE POLICY "Admins gerenciam partidas mata-mata" ON public.knockout_matches
  FOR ALL USING (public.is_admin());
