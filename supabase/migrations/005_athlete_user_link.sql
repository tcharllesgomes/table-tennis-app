-- Vincula atletas a contas de usuário (opcional)

-- Adiciona role 'athlete' ao profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'athlete', 'viewer'));

-- Adiciona coluna user_id em athletes (nullable, único)
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- Função helper para RLS
CREATE OR REPLACE FUNCTION public.is_athlete()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.athletes WHERE user_id = auth.uid()
  );
$$;

-- Atleta pode ler e atualizar o próprio registro
CREATE POLICY "Atleta lê próprio registro" ON public.athletes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Atleta atualiza próprio registro" ON public.athletes
  FOR UPDATE USING (user_id = auth.uid());
