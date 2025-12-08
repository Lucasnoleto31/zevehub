import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BookOpen,
  Play,
  CheckCircle,
  Clock,
  ChevronLeft,
  Trophy,
  Zap,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Lock,
  Activity,
  Bitcoin,
  Globe,
  Wallet,
  FileText,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity,
  Bitcoin,
  Globe,
  Wallet,
  BookOpen,
};

interface Track {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  banner_url: string | null;
}

interface Module {
  id: string;
  track_id: string;
  name: string;
  description: string;
  order_index: number;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_minutes: number;
  order_index: number;
  points: number;
}

interface Quiz {
  id: string;
  module_id: string | null;
  lesson_id: string | null;
  title: string;
  description: string;
  points: number;
}

interface UserProgress {
  lesson_id: string;
  completed: boolean;
}

const TrilhaDetail = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  
  // Admin dialogs
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [showAddModule, setShowAddModule] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState({ title: "", description: "", video_url: "", duration_minutes: 0, points: 10 });
  const [newModule, setNewModule] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      setIsAdmin(roles?.some((r) => r.role === "admin") || false);
      await loadTrackData(user.id);
    };

    checkAuth();
  }, [navigate, slug]);

  const loadTrackData = async (uid: string) => {
    setLoading(true);
    try {
      // Load track
      const { data: trackData, error: trackError } = await supabase
        .from("learning_tracks")
        .select("*")
        .eq("slug", slug)
        .single();

      if (trackError || !trackData) {
        toast.error("Trilha não encontrada");
        navigate("/aprenda");
        return;
      }

      setTrack(trackData);

      // Load modules
      const { data: modulesData } = await supabase
        .from("learning_modules")
        .select("*")
        .eq("track_id", trackData.id)
        .order("order_index");

      setModules(modulesData || []);

      // Load lessons for each module
      if (modulesData && modulesData.length > 0) {
        const moduleIds = modulesData.map(m => m.id);
        const { data: lessonsData } = await supabase
          .from("learning_lessons")
          .select("*")
          .in("module_id", moduleIds)
          .order("order_index");

        const lessonsByModule: Record<string, Lesson[]> = {};
        lessonsData?.forEach(lesson => {
          if (!lessonsByModule[lesson.module_id]) {
            lessonsByModule[lesson.module_id] = [];
          }
          lessonsByModule[lesson.module_id].push(lesson);
        });
        setLessons(lessonsByModule);

        // Load quizzes
        const { data: quizzesData } = await supabase
          .from("learning_quizzes")
          .select("*")
          .in("module_id", moduleIds);

        setQuizzes(quizzesData || []);
      }

      // Load user progress
      const { data: progressData } = await supabase
        .from("user_lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", uid);

      const progressMap: Record<string, boolean> = {};
      progressData?.forEach(p => {
        progressMap[p.lesson_id] = p.completed;
      });
      setUserProgress(progressMap);

    } catch (error) {
      console.error("Error loading track data:", error);
      toast.error("Erro ao carregar dados da trilha");
    } finally {
      setLoading(false);
    }
  };

  const calculateModuleProgress = (moduleId: string) => {
    const moduleLessons = lessons[moduleId] || [];
    if (moduleLessons.length === 0) return 0;
    const completed = moduleLessons.filter(l => userProgress[l.id]).length;
    return Math.round((completed / moduleLessons.length) * 100);
  };

  const calculateTotalProgress = () => {
    const allLessons = Object.values(lessons).flat();
    if (allLessons.length === 0) return 0;
    const completed = allLessons.filter(l => userProgress[l.id]).length;
    return Math.round((completed / allLessons.length) * 100);
  };

  const handleAddModule = async () => {
    if (!track || !newModule.name) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("learning_modules").insert({
        track_id: track.id,
        name: newModule.name,
        description: newModule.description,
        order_index: modules.length + 1,
      });

      if (error) throw error;
      toast.success("Módulo adicionado com sucesso!");
      setShowAddModule(false);
      setNewModule({ name: "", description: "" });
      if (userId) await loadTrackData(userId);
    } catch (error) {
      console.error("Error adding module:", error);
      toast.error("Erro ao adicionar módulo");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLesson = async () => {
    if (!selectedModuleId || !newLesson.title) return;
    setSaving(true);
    try {
      const moduleLessons = lessons[selectedModuleId] || [];
      const { error } = await supabase.from("learning_lessons").insert({
        module_id: selectedModuleId,
        title: newLesson.title,
        description: newLesson.description,
        video_url: newLesson.video_url || null,
        duration_minutes: newLesson.duration_minutes,
        points: newLesson.points,
        order_index: moduleLessons.length + 1,
      });

      if (error) throw error;
      toast.success("Aula adicionada com sucesso!");
      setShowAddLesson(false);
      setNewLesson({ title: "", description: "", video_url: "", duration_minutes: 0, points: 10 });
      setSelectedModuleId(null);
      if (userId) await loadTrackData(userId);
    } catch (error) {
      console.error("Error adding lesson:", error);
      toast.error("Erro ao adicionar aula");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta aula?")) return;
    try {
      const { error } = await supabase.from("learning_lessons").delete().eq("id", lessonId);
      if (error) throw error;
      toast.success("Aula excluída com sucesso!");
      if (userId) await loadTrackData(userId);
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast.error("Erro ao excluir aula");
    }
  };

  const IconComponent = track ? iconMap[track.icon] || BookOpen : BookOpen;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!track) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-accent/5 to-background">
        <AppSidebar isAdmin={isAdmin} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <Button variant="ghost" size="sm" onClick={() => navigate("/aprenda")}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            </div>

            {/* Track Banner */}
            <Card className={`relative overflow-hidden border-0 bg-gradient-to-r ${track.color}`}>
              <CardContent className="py-8 px-8 text-white">
                <div className="flex items-center gap-6">
                  <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm">
                    <IconComponent className="w-12 h-12" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">{track.name}</h1>
                    <p className="text-white/80 max-w-2xl">{track.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold">{calculateTotalProgress()}%</div>
                    <p className="text-white/70">Concluído</p>
                  </div>
                </div>
                <Progress value={calculateTotalProgress()} className="mt-6 h-3 bg-white/20" />
              </CardContent>
            </Card>

            {/* Admin Actions */}
            {isAdmin && (
              <div className="flex gap-2">
                <Dialog open={showAddModule} onOpenChange={setShowAddModule}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Módulo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Novo Módulo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome do Módulo</Label>
                        <Input
                          value={newModule.name}
                          onChange={(e) => setNewModule({ ...newModule, name: e.target.value })}
                          placeholder="Ex: Avançado"
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={newModule.description}
                          onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                          placeholder="Descrição do módulo..."
                        />
                      </div>
                      <Button onClick={handleAddModule} disabled={saving} className="w-full">
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Salvar Módulo
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Modules */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Módulos
              </h2>

              <Accordion type="multiple" className="space-y-4">
                {modules.map((module, moduleIndex) => {
                  const moduleLessons = lessons[module.id] || [];
                  const moduleProgress = calculateModuleProgress(module.id);
                  const moduleQuiz = quizzes.find(q => q.module_id === module.id);

                  return (
                    <AccordionItem
                      key={module.id}
                      value={module.id}
                      className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg overflow-hidden"
                    >
                      <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${track.color} flex items-center justify-center text-white font-bold`}>
                              {moduleIndex + 1}
                            </div>
                            <div className="text-left">
                              <h3 className="font-semibold">{module.name}</h3>
                              <p className="text-sm text-muted-foreground">{module.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="secondary">
                              {moduleLessons.length} aulas
                            </Badge>
                            <div className="w-24">
                              <Progress value={moduleProgress} className="h-2" />
                            </div>
                            <span className="text-sm font-medium w-12">{moduleProgress}%</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4">
                        <div className="space-y-3 pt-2">
                          {moduleLessons.map((lesson, lessonIndex) => {
                            const isCompleted = userProgress[lesson.id];
                            const isLocked = lessonIndex > 0 && !userProgress[moduleLessons[lessonIndex - 1]?.id];

                            return (
                              <div
                                key={lesson.id}
                                className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                                  isCompleted
                                    ? "bg-emerald-500/10 border border-emerald-500/30"
                                    : isLocked
                                    ? "bg-muted/30 opacity-60"
                                    : "bg-muted/50 hover:bg-muted/70 cursor-pointer"
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isCompleted
                                      ? "bg-emerald-500 text-white"
                                      : isLocked
                                      ? "bg-muted text-muted-foreground"
                                      : "bg-primary/20 text-primary"
                                  }`}>
                                    {isCompleted ? (
                                      <CheckCircle className="w-5 h-5" />
                                    ) : isLocked ? (
                                      <Lock className="w-4 h-4" />
                                    ) : (
                                      <Play className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-medium">{lesson.title}</h4>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {lesson.duration_minutes} min
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Zap className="w-3 h-3 text-yellow-400" />
                                        {lesson.points} pts
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!isLocked && !isCompleted && (
                                    <Button
                                      size="sm"
                                      onClick={() => navigate(`/aprenda/aula/${lesson.id}`)}
                                    >
                                      Assistir
                                    </Button>
                                  )}
                                  {isCompleted && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => navigate(`/aprenda/aula/${lesson.id}`)}
                                    >
                                      Rever
                                    </Button>
                                  )}
                                  {isAdmin && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteLesson(lesson.id)}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Quiz do módulo */}
                          {moduleQuiz && (
                            <div className="flex items-center justify-between p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center">
                                  <Trophy className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{moduleQuiz.title}</h4>
                                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-yellow-400" />
                                    {moduleQuiz.points} pts
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="bg-purple-500 hover:bg-purple-600"
                                onClick={() => navigate(`/aprenda/quiz/${moduleQuiz.id}`)}
                              >
                                Fazer Quiz
                              </Button>
                            </div>
                          )}

                          {/* Admin: Add lesson button */}
                          {isAdmin && (
                            <Dialog open={showAddLesson && selectedModuleId === module.id} onOpenChange={(open) => {
                              setShowAddLesson(open);
                              if (open) setSelectedModuleId(module.id);
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full border-dashed"
                                  onClick={() => setSelectedModuleId(module.id)}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Adicionar Aula
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Adicionar Nova Aula</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Título da Aula</Label>
                                    <Input
                                      value={newLesson.title}
                                      onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                                      placeholder="Ex: Introdução ao Day Trade"
                                    />
                                  </div>
                                  <div>
                                    <Label>Descrição</Label>
                                    <Textarea
                                      value={newLesson.description}
                                      onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
                                      placeholder="Descrição da aula..."
                                    />
                                  </div>
                                  <div>
                                    <Label>URL do Vídeo (YouTube, Vimeo, etc)</Label>
                                    <Input
                                      value={newLesson.video_url}
                                      onChange={(e) => setNewLesson({ ...newLesson, video_url: e.target.value })}
                                      placeholder="https://youtube.com/watch?v=..."
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Duração (minutos)</Label>
                                      <Input
                                        type="number"
                                        value={newLesson.duration_minutes}
                                        onChange={(e) => setNewLesson({ ...newLesson, duration_minutes: parseInt(e.target.value) || 0 })}
                                      />
                                    </div>
                                    <div>
                                      <Label>Pontos</Label>
                                      <Input
                                        type="number"
                                        value={newLesson.points}
                                        onChange={(e) => setNewLesson({ ...newLesson, points: parseInt(e.target.value) || 10 })}
                                      />
                                    </div>
                                  </div>
                                  <Button onClick={handleAddLesson} disabled={saving} className="w-full">
                                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Salvar Aula
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              {modules.length === 0 && (
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardContent className="py-12 text-center">
                    <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum módulo disponível</h3>
                    <p className="text-muted-foreground">
                      {isAdmin ? "Adicione o primeiro módulo para começar." : "Em breve teremos conteúdo disponível."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default TrilhaDetail;
