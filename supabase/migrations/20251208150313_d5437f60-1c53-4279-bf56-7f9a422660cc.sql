-- Tabela de Trilhas de Aprendizado
CREATE TABLE public.learning_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'BookOpen',
  color TEXT DEFAULT 'from-blue-500 to-cyan-500',
  banner_url TEXT,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Níveis/Módulos da Trilha
CREATE TABLE public.learning_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.learning_tracks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Aulas
CREATE TABLE public.learning_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  points INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Quizzes
CREATE TABLE public.learning_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 20,
  passing_score INTEGER DEFAULT 70,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Perguntas do Quiz
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.learning_quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Progresso do Usuário nas Aulas
CREATE TABLE public.user_lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Tabela de Resultados dos Quizzes
CREATE TABLE public.user_quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quiz_id UUID NOT NULL REFERENCES public.learning_quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  passed BOOLEAN DEFAULT false,
  answers JSONB DEFAULT '[]',
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quiz_results ENABLE ROW LEVEL SECURITY;

-- Policies para visualização pública (todos podem ver conteúdo ativo)
CREATE POLICY "Todos podem ver trilhas ativas" ON public.learning_tracks
  FOR SELECT USING (is_active = true);

CREATE POLICY "Todos podem ver módulos ativos" ON public.learning_modules
  FOR SELECT USING (is_active = true);

CREATE POLICY "Todos podem ver aulas ativas" ON public.learning_lessons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Todos podem ver quizzes ativos" ON public.learning_quizzes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Todos podem ver perguntas" ON public.quiz_questions
  FOR SELECT USING (true);

-- Policies para admins gerenciarem conteúdo
CREATE POLICY "Admins podem gerenciar trilhas" ON public.learning_tracks
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins podem gerenciar módulos" ON public.learning_modules
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins podem gerenciar aulas" ON public.learning_lessons
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins podem gerenciar quizzes" ON public.learning_quizzes
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins podem gerenciar perguntas" ON public.quiz_questions
  FOR ALL USING (is_admin(auth.uid()));

-- Policies para progresso do usuário
CREATE POLICY "Usuários podem ver seu progresso" ON public.user_lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seu progresso" ON public.user_lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu progresso" ON public.user_lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies para resultados de quiz
CREATE POLICY "Usuários podem ver seus resultados" ON public.user_quiz_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus resultados" ON public.user_quiz_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_learning_tracks_updated_at
  BEFORE UPDATE ON public.learning_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learning_modules_updated_at
  BEFORE UPDATE ON public.learning_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learning_lessons_updated_at
  BEFORE UPDATE ON public.learning_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_lesson_progress_updated_at
  BEFORE UPDATE ON public.user_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir trilhas iniciais
INSERT INTO public.learning_tracks (name, slug, description, icon, color, order_index) VALUES
  ('Day Trade', 'day-trade', 'Domine as técnicas de day trade no mercado brasileiro', 'Activity', 'from-blue-500 to-cyan-500', 1),
  ('Criptomoedas', 'cripto', 'Aprenda tudo sobre o mundo das criptomoedas', 'Bitcoin', 'from-orange-500 to-yellow-500', 2),
  ('Macroeconomia', 'macro', 'Entenda como a economia global impacta seus investimentos', 'Globe', 'from-emerald-500 to-teal-500', 3),
  ('Finanças Pessoais', 'financas', 'Organize suas finanças e construa riqueza', 'Wallet', 'from-purple-500 to-pink-500', 4);

-- Inserir módulos para Day Trade
INSERT INTO public.learning_modules (track_id, name, description, order_index)
SELECT id, 'Iniciante', 'Fundamentos do Day Trade', 1 FROM public.learning_tracks WHERE slug = 'day-trade'
UNION ALL
SELECT id, 'Intermediário', 'Estratégias e Análise Técnica', 2 FROM public.learning_tracks WHERE slug = 'day-trade'
UNION ALL
SELECT id, 'Avançado', 'Gestão de Risco e Psicologia', 3 FROM public.learning_tracks WHERE slug = 'day-trade';

-- Inserir módulos para Cripto
INSERT INTO public.learning_modules (track_id, name, description, order_index)
SELECT id, 'Iniciante', 'Introdução às Criptomoedas', 1 FROM public.learning_tracks WHERE slug = 'cripto'
UNION ALL
SELECT id, 'Trading', 'Trading de Criptomoedas', 2 FROM public.learning_tracks WHERE slug = 'cripto'
UNION ALL
SELECT id, 'DeFi & Web3', 'Finanças Descentralizadas', 3 FROM public.learning_tracks WHERE slug = 'cripto';

-- Inserir módulos para Macro
INSERT INTO public.learning_modules (track_id, name, description, order_index)
SELECT id, 'Fundamentos', 'Conceitos Básicos de Economia', 1 FROM public.learning_tracks WHERE slug = 'macro'
UNION ALL
SELECT id, 'Política Monetária', 'Bancos Centrais e Juros', 2 FROM public.learning_tracks WHERE slug = 'macro'
UNION ALL
SELECT id, 'Mercados Globais', 'Economia Internacional', 3 FROM public.learning_tracks WHERE slug = 'macro';

-- Inserir módulos para Finanças
INSERT INTO public.learning_modules (track_id, name, description, order_index)
SELECT id, 'Organização', 'Controle Financeiro Pessoal', 1 FROM public.learning_tracks WHERE slug = 'financas'
UNION ALL
SELECT id, 'Investimentos', 'Começando a Investir', 2 FROM public.learning_tracks WHERE slug = 'financas'
UNION ALL
SELECT id, 'Riqueza no Longo Prazo', 'Construindo Patrimônio', 3 FROM public.learning_tracks WHERE slug = 'financas';