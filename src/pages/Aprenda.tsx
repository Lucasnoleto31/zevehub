import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BookOpen,
  Target,
  Medal,
  Trophy,
  Activity,
  Bitcoin,
  Globe,
  Wallet,
  Play,
  CheckCircle,
  Award,
  Brain,
  ChevronRight,
  Clock,
  Users,
  Sparkles,
  GraduationCap,
  Lock,
  Unlock,
  Star,
  Zap,
  TrendingUp,
  MessageCircle,
  Settings,
} from "lucide-react";

const Aprenda = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [lessonsFromDb, setLessonsFromDb] = useState<any[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      setIsAdmin(roles?.some((r) => r.role === "admin") || false);
    };

    const loadLessons = async () => {
      setLoadingLessons(true);
      const { data: lessons } = await supabase
        .from("learning_lessons")
        .select(`
          *,
          learning_modules!inner(
            name,
            learning_tracks!inner(name, slug)
          )
        `)
        .not("video_url", "is", null)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (lessons) {
        setLessonsFromDb(lessons);
      }
      setLoadingLessons(false);
    };

    checkAuth();
    loadLessons();
  }, [navigate]);

  const progressCards = [
    { icon: BookOpen, label: "Aulas Concluídas", value: "36", color: "text-blue-400" },
    { icon: Target, label: "Trilhas em Andamento", value: "3", color: "text-emerald-400" },
    { icon: Medal, label: "Badges Conquistadas", value: "7", color: "text-yellow-400" },
    { icon: Trophy, label: "Pontuação Total", value: "480 pts", color: "text-purple-400" },
  ];

  const trilhas = [
    {
      category: "Day Trade",
      icon: Activity,
      levels: ["Iniciante", "Intermediário", "Avançado"],
      progress: 65,
      color: "from-blue-500 to-cyan-500",
      totalLessons: 24,
      completedLessons: 16,
    },
    {
      category: "Criptomoedas",
      icon: Bitcoin,
      levels: ["Iniciante", "Trading", "Defi & Web3"],
      progress: 30,
      color: "from-orange-500 to-yellow-500",
      totalLessons: 18,
      completedLessons: 5,
    },
    {
      category: "Macroeconomia",
      icon: Globe,
      levels: ["Fundamentos", "Política Monetária", "Mercados Globais"],
      progress: 45,
      color: "from-emerald-500 to-teal-500",
      totalLessons: 20,
      completedLessons: 9,
    },
    {
      category: "Finanças Pessoais",
      icon: Wallet,
      levels: ["Organização", "Investimentos", "Riqueza no Longo Prazo"],
      progress: 80,
      color: "from-purple-500 to-pink-500",
      totalLessons: 15,
      completedLessons: 12,
    },
  ];

  // Map lessons from database to video format
  const videos = lessonsFromDb.map(lesson => {
    const trackName = lesson.learning_modules?.learning_tracks?.name || "Outros";
    let category = "Outros";
    if (trackName.toLowerCase().includes("day") || trackName.toLowerCase().includes("trade")) {
      category = "Day Trade";
    } else if (trackName.toLowerCase().includes("cripto") || trackName.toLowerCase().includes("bitcoin")) {
      category = "Cripto";
    } else if (trackName.toLowerCase().includes("macro")) {
      category = "Macro";
    } else if (trackName.toLowerCase().includes("finan")) {
      category = "Finanças";
    }

    return {
      id: lesson.id,
      title: lesson.title,
      length: `${lesson.duration_minutes || 0} min`,
      difficulty: lesson.learning_modules?.name || "Iniciante",
      category,
      thumbnail: lesson.thumbnail_url || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400",
      video_url: lesson.video_url,
    };
  });

  const quizzes = [
    {
      id: "quiz001",
      title: "Testes de Day Trade – Nível 1",
      questions: 10,
      points: 40,
      completed: true,
      category: "Day Trade",
    },
    {
      id: "quiz002",
      title: "Cripto – Você domina o básico?",
      questions: 12,
      points: 50,
      completed: false,
      category: "Cripto",
    },
    {
      id: "quiz003",
      title: "Macro para Traders",
      questions: 15,
      points: 75,
      completed: false,
      category: "Macro",
    },
    {
      id: "quiz004",
      title: "Finanças Pessoais - Fundamentos",
      questions: 8,
      points: 30,
      completed: true,
      category: "Finanças",
    },
  ];

  const badges = [
    { name: "Iniciante Day Trader", icon: Activity, unlocked: true, color: "text-blue-400" },
    { name: "Especialista em Cripto", icon: Bitcoin, unlocked: false, color: "text-orange-400" },
    { name: "Macro Master", icon: Globe, unlocked: false, color: "text-emerald-400" },
    { name: "Finance Expert", icon: Wallet, unlocked: true, color: "text-purple-400" },
    { name: "Quiz Champion", icon: Trophy, unlocked: true, color: "text-yellow-400" },
    { name: "Trader Consistente", icon: TrendingUp, unlocked: false, color: "text-cyan-400" },
  ];

  const leaderboard = [
    { position: 1, user: "Carlos M.", points: 780, avatar: "CM" },
    { position: 2, user: "Amanda S.", points: 690, avatar: "AS" },
    { position: 3, user: "Lucas R.", points: 480, avatar: "LR" },
    { position: 4, user: "Marina L.", points: 420, avatar: "ML" },
    { position: 5, user: "Pedro H.", points: 380, avatar: "PH" },
  ];

  const certifications = [
    {
      name: "Trader Iniciante",
      requirements: ["Trilha Day Trade – Módulo 1", "Quiz nível 1"],
      status: "Concluído",
    },
    {
      name: "Trader Avançado",
      requirements: ["Trilha Day Trade – Módulo 3", "Quiz avançado"],
      status: "Em andamento",
    },
    {
      name: "Cripto Especialista",
      requirements: ["Trilha Cripto Completa"],
      status: "Pendente",
    },
  ];

  const filters = ["Todos", "Day Trade", "Cripto", "Macro", "Finanças", "Ao Vivo"];

  const filteredVideos = activeFilter === "Todos" 
    ? videos 
    : videos.filter(v => v.category === activeFilter);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-accent/5 to-background">
        <AppSidebar isAdmin={isAdmin} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Aprenda
                  </h1>
                  <p className="text-muted-foreground">
                    Streaming financeira completa – do básico ao avançado
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {isAdmin && (
                  <Button variant="outline" onClick={() => navigate("/aprenda/admin")}>
                    <Settings className="w-4 h-4 mr-2" />
                    Gerenciar Conteúdo
                  </Button>
                )}
                <Button className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Começar Agora
                </Button>
              </div>
            </div>

            {/* Hero Banner */}
            <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200')] bg-cover bg-center opacity-10" />
              <CardContent className="relative py-12 px-8 flex flex-col items-center text-center">
                <GraduationCap className="w-16 h-16 text-primary mb-4" />
                <h2 className="text-4xl font-bold mb-2">Aprenda com a Zeve Hub</h2>
                <p className="text-xl text-muted-foreground mb-6">
                  Domine os mercados financeiros com nossa plataforma de educação completa
                </p>
                <div className="flex gap-4">
                  <Badge variant="secondary" className="px-4 py-2 text-sm">
                    <BookOpen className="w-4 h-4 mr-2" /> 100+ Aulas
                  </Badge>
                  <Badge variant="secondary" className="px-4 py-2 text-sm">
                    <Users className="w-4 h-4 mr-2" /> 5.000+ Alunos
                  </Badge>
                  <Badge variant="secondary" className="px-4 py-2 text-sm">
                    <Award className="w-4 h-4 mr-2" /> Certificações
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Progress Overview */}
            <section id="progresso-geral">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-primary" />
                Seu Progresso
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {progressCards.map((card, index) => (
                  <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20`}>
                        <card.icon className={`w-6 h-6 ${card.color}`} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{card.value}</p>
                        <p className="text-sm text-muted-foreground">{card.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Learning Tracks */}
            <section id="trilhas">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                Trilhas de Conhecimento
              </h2>
              <p className="text-muted-foreground mb-4">
                Domine os mercados com trilhas estruturadas do básico ao avançado.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {trilhas.map((trilha, index) => (
                  <Card key={index} className="group bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 overflow-hidden">
                    <div className={`h-2 bg-gradient-to-r ${trilha.color}`} />
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${trilha.color} bg-opacity-20`}>
                            <trilha.icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{trilha.category}</h3>
                            <p className="text-sm text-muted-foreground">
                              {trilha.completedLessons}/{trilha.totalLessons} aulas
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="group-hover:bg-primary/10">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-medium">{trilha.progress}%</span>
                        </div>
                        <Progress value={trilha.progress} className="h-2" />
                        <div className="flex flex-wrap gap-2 mt-3">
                          {trilha.levels.map((level, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {level}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Video Streaming */}
            <section id="streaming">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Play className="w-6 h-6 text-primary" />
                Streaming de Aulas
              </h2>
              <p className="text-muted-foreground mb-4">
                Aulas, documentários, análises e séries exclusivas Zeve Hub.
              </p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {filters.map((filter) => (
                  <Button
                    key={filter}
                    variant={activeFilter === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter(filter)}
                    className={activeFilter === filter ? "bg-gradient-to-r from-primary to-purple-600" : ""}
                  >
                    {filter === "Ao Vivo" && <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />}
                    {filter}
                  </Button>
                ))}
              </div>

              {loadingLessons ? (
                <div className="col-span-3 flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="col-span-3 text-center py-12">
                  <Play className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma aula encontrada.</p>
                  {isAdmin && (
                    <Button variant="outline" className="mt-4" onClick={() => navigate("/aprenda/admin")}>
                      Adicionar Aulas
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVideos.map((video) => (
                    <Card 
                      key={video.id} 
                      className="group bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 overflow-hidden cursor-pointer"
                      onClick={() => navigate(`/aprenda/aula/${video.id}`)}
                    >
                      <div className="relative aspect-video overflow-hidden">
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                            <Play className="w-8 h-8 text-white ml-1" />
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-medium">
                          {video.length}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2 line-clamp-2">{video.title}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{video.category}</Badge>
                          <Badge variant="outline" className="text-xs">{video.difficulty}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Quizzes */}
            <section id="exercicios">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-primary" />
                Exercícios e Testes
              </h2>
              <p className="text-muted-foreground mb-4">
                Teste seus conhecimentos e ganhe pontos para subir no ranking!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizzes.map((quiz) => (
                  <Card key={quiz.id} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${quiz.completed ? 'bg-emerald-500/20' : 'bg-primary/20'}`}>
                          {quiz.completed ? (
                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <Target className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{quiz.title}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{quiz.questions} questões</span>
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3 text-yellow-400" />
                              {quiz.points} pts
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant={quiz.completed ? "outline" : "default"}
                        size="sm"
                        className={!quiz.completed ? "bg-gradient-to-r from-primary to-purple-600" : ""}
                      >
                        {quiz.completed ? "Refazer" : "Iniciar"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Gamification */}
            <section id="gamificacao">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                Gamificação
              </h2>
              <Tabs defaultValue="badges" className="w-full">
                <TabsList className="bg-card/50 backdrop-blur-sm mb-4">
                  <TabsTrigger value="badges">Badges</TabsTrigger>
                  <TabsTrigger value="ranking">Ranking</TabsTrigger>
                  <TabsTrigger value="pontos">Sistema de Pontos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="badges">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {badges.map((badge, index) => (
                      <Card 
                        key={index} 
                        className={`bg-card/50 backdrop-blur-sm border-border/50 transition-all duration-300 ${
                          badge.unlocked ? 'hover:border-primary/50 hover:scale-105' : 'opacity-50'
                        }`}
                      >
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <div className={`p-4 rounded-full mb-3 ${badge.unlocked ? 'bg-gradient-to-br from-primary/20 to-purple-500/20' : 'bg-muted'}`}>
                            {badge.unlocked ? (
                              <badge.icon className={`w-8 h-8 ${badge.color}`} />
                            ) : (
                              <Lock className="w-8 h-8 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-sm font-medium">{badge.name}</p>
                          {badge.unlocked ? (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              <Unlock className="w-3 h-3 mr-1" /> Desbloqueado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="mt-2 text-xs opacity-50">
                              <Lock className="w-3 h-3 mr-1" /> Bloqueado
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="ranking">
                  <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        Top 5 da Semana
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {leaderboard.map((user, index) => (
                          <div 
                            key={index}
                            className={`flex items-center justify-between p-4 rounded-lg ${
                              index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' :
                              index === 1 ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/30' :
                              index === 2 ? 'bg-gradient-to-r from-orange-600/20 to-orange-700/20 border border-orange-600/30' :
                              'bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                index === 0 ? 'bg-yellow-500 text-yellow-950' :
                                index === 1 ? 'bg-gray-400 text-gray-950' :
                                index === 2 ? 'bg-orange-600 text-orange-950' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {user.position}
                              </div>
                              <Avatar>
                                <AvatarFallback className="bg-primary/20 text-primary">
                                  {user.avatar}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{user.user}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-400" />
                              <span className="font-bold">{user.points} pts</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="pontos">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-500/20">
                          <BookOpen className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">+10 pts</p>
                          <p className="text-sm text-muted-foreground">Aula Concluída</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-500/20">
                          <CheckCircle className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">+20 pts</p>
                          <p className="text-sm text-muted-foreground">Quiz Finalizado</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-500/20">
                          <Trophy className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">+100 pts</p>
                          <p className="text-sm text-muted-foreground">Trilha Concluída</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </section>

            {/* AI Mentor */}
            <section id="ia-mentoria">
              <Card className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border-primary/20">
                <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-primary to-purple-600">
                      <Brain className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Mentor IA</h2>
                      <p className="text-muted-foreground max-w-md">
                        Tire dúvidas instantâneas sobre qualquer conteúdo aprendido.
                        Nossa IA está pronta para ajudar você 24/7.
                      </p>
                    </div>
                  </div>
                  <Button size="lg" className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Perguntar à IA
                  </Button>
                </CardContent>
              </Card>
            </section>

            {/* Certifications */}
            <section id="certificados">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-primary" />
                Certificações Zeve Hub
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {certifications.map((cert, index) => (
                  <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
                          <Award className="w-6 h-6 text-primary" />
                        </div>
                        <Badge 
                          variant={
                            cert.status === "Concluído" ? "default" :
                            cert.status === "Em andamento" ? "secondary" : "outline"
                          }
                          className={cert.status === "Concluído" ? "bg-emerald-500" : ""}
                        >
                          {cert.status}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold mb-3">{cert.name}</h3>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Requisitos:</p>
                        <ul className="text-sm space-y-1">
                          {cert.requirements.map((req, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Aprenda;
