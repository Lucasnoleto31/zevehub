import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Zap,
  Loader2,
  Play,
  BookOpen,
  Trophy,
} from "lucide-react";

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  content: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_minutes: number;
  points: number;
  order_index: number;
}

interface Module {
  id: string;
  track_id: string;
  name: string;
}

interface Track {
  slug: string;
  name: string;
}

const LessonView = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams<{ lessonId: string }>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

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
      await loadLessonData(user.id);
    };

    checkAuth();
  }, [navigate, lessonId]);

  const loadLessonData = async (uid: string) => {
    setLoading(true);
    try {
      // Load lesson
      const { data: lessonData, error: lessonError } = await supabase
        .from("learning_lessons")
        .select("*")
        .eq("id", lessonId)
        .single();

      if (lessonError || !lessonData) {
        toast.error("Aula não encontrada");
        navigate("/aprenda");
        return;
      }

      setLesson(lessonData);

      // Load module
      const { data: moduleData } = await supabase
        .from("learning_modules")
        .select("*")
        .eq("id", lessonData.module_id)
        .single();

      setModule(moduleData);

      // Load track
      if (moduleData) {
        const { data: trackData } = await supabase
          .from("learning_tracks")
          .select("slug, name")
          .eq("id", moduleData.track_id)
          .single();

        setTrack(trackData);

        // Load all lessons in this module
        const { data: lessonsData } = await supabase
          .from("learning_lessons")
          .select("*")
          .eq("module_id", moduleData.id)
          .order("order_index");

        setAllLessons(lessonsData || []);
      }

      // Check if completed
      const { data: progressData } = await supabase
        .from("user_lesson_progress")
        .select("completed")
        .eq("user_id", uid)
        .eq("lesson_id", lessonId)
        .single();

      setIsCompleted(progressData?.completed || false);

    } catch (error) {
      console.error("Error loading lesson:", error);
      toast.error("Erro ao carregar aula");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteLesson = async () => {
    if (!userId || !lesson) return;
    setCompleting(true);
    try {
      // Upsert progress
      const { error } = await supabase
        .from("user_lesson_progress")
        .upsert({
          user_id: userId,
          lesson_id: lesson.id,
          completed: true,
          completed_at: new Date().toISOString(),
          progress_percentage: 100,
        }, {
          onConflict: "user_id,lesson_id"
        });

      if (error) throw error;

      // Award points
      await supabase
        .from("profiles")
        .update({ points: supabase.rpc("increment_column", { 
          table_name: "profiles", 
          column_name: "points", 
          increment_value: lesson.points, 
          row_id: userId 
        }) as unknown as number })
        .eq("id", userId);

      setIsCompleted(true);
      toast.success(`Aula concluída! +${lesson.points} pontos`);

      // Check if there's a next lesson
      const currentIndex = allLessons.findIndex(l => l.id === lesson.id);
      if (currentIndex < allLessons.length - 1) {
        const nextLesson = allLessons[currentIndex + 1];
        setTimeout(() => {
          navigate(`/aprenda/aula/${nextLesson.id}`);
        }, 1500);
      }
    } catch (error) {
      console.error("Error completing lesson:", error);
      toast.error("Erro ao marcar aula como concluída");
    } finally {
      setCompleting(false);
    }
  };

  const getVideoEmbedUrl = (url: string) => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return url;
  };

  const currentIndex = allLessons.findIndex(l => l.id === lessonId);
  const previousLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const progressPercentage = allLessons.length > 0 ? ((currentIndex + 1) / allLessons.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-accent/5 to-background">
        <AppSidebar isAdmin={isAdmin} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <Button variant="ghost" size="sm" onClick={() => track && navigate(`/aprenda/trilha/${track.slug}`)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar à Trilha
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {module && <Badge variant="secondary">{module.name}</Badge>}
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {lesson.duration_minutes} min
                </Badge>
                <Badge className="bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {lesson.points} pts
                </Badge>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Aula {currentIndex + 1} de {allLessons.length}</span>
                <span>{Math.round(progressPercentage)}% do módulo</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Lesson Content */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{lesson.title}</CardTitle>
                    <p className="text-muted-foreground mt-2">{lesson.description}</p>
                  </div>
                  {isCompleted && (
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle className="w-6 h-6" />
                      <span className="font-medium">Concluída</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Video Player */}
                {lesson.video_url && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={getVideoEmbedUrl(lesson.video_url)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Text Content */}
                {lesson.content && (
                  <div className="prose prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
                  </div>
                )}

                {/* No video placeholder */}
                {!lesson.video_url && !lesson.content && (
                  <div className="aspect-video rounded-lg bg-muted/30 flex items-center justify-center">
                    <div className="text-center">
                      <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Conteúdo em breve</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                disabled={!previousLesson}
                onClick={() => previousLesson && navigate(`/aprenda/aula/${previousLesson.id}`)}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Aula Anterior
              </Button>

              <div className="flex items-center gap-4">
                {!isCompleted && (
                  <Button
                    onClick={handleCompleteLesson}
                    disabled={completing}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  >
                    {completing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Marcar como Concluída
                  </Button>
                )}
                
                {isCompleted && nextLesson && (
                  <Button
                    onClick={() => navigate(`/aprenda/aula/${nextLesson.id}`)}
                    className="bg-gradient-to-r from-primary to-purple-600"
                  >
                    Próxima Aula
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                disabled={!nextLesson}
                onClick={() => nextLesson && navigate(`/aprenda/aula/${nextLesson.id}`)}
              >
                Próxima Aula
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default LessonView;
