import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  BookOpen, 
  Layers, 
  Video, 
  HelpCircle,
  Upload,
  Loader2,
  GraduationCap
} from "lucide-react";

interface Track {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  banner_url: string | null;
  is_active: boolean;
  order_index: number;
}

interface Module {
  id: string;
  track_id: string;
  name: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  content: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_minutes: number;
  points: number;
  order_index: number;
  is_active: boolean;
}

interface Quiz {
  id: string;
  module_id: string | null;
  lesson_id: string | null;
  title: string;
  description: string | null;
  points: number;
  passing_score: number;
  is_active: boolean;
}

export default function AdminEducacional() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("trilhas");

  // Data states
  const [tracks, setTracks] = useState<Track[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  // Dialog states
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);

  // Edit states
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  // Form states
  const [trackForm, setTrackForm] = useState({ name: "", slug: "", description: "", icon: "BookOpen", color: "from-blue-500 to-cyan-500", is_active: true });
  const [moduleForm, setModuleForm] = useState({ track_id: "", name: "", description: "", is_active: true });
  const [lessonForm, setLessonForm] = useState({ module_id: "", title: "", description: "", content: "", video_url: "", thumbnail_url: "", duration_minutes: 0, points: 10, is_active: true });
  const [quizForm, setQuizForm] = useState({ module_id: "", lesson_id: "", title: "", description: "", points: 20, passing_score: 70, is_active: true });

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      toast.error("Acesso negado. Apenas administradores.");
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    await loadAllData();
    setLoading(false);
  };

  const loadAllData = async () => {
    const [tracksRes, modulesRes, lessonsRes, quizzesRes] = await Promise.all([
      supabase.from("learning_tracks").select("*").order("order_index"),
      supabase.from("learning_modules").select("*").order("order_index"),
      supabase.from("learning_lessons").select("*").order("order_index"),
      supabase.from("learning_quizzes").select("*").order("title")
    ]);

    if (tracksRes.data) setTracks(tracksRes.data);
    if (modulesRes.data) setModules(modulesRes.data);
    if (lessonsRes.data) setLessons(lessonsRes.data);
    if (quizzesRes.data) setQuizzes(quizzesRes.data);
  };

  // Track CRUD
  const handleSaveTrack = async () => {
    try {
      if (editingTrack) {
        const { error } = await supabase
          .from("learning_tracks")
          .update(trackForm)
          .eq("id", editingTrack.id);
        if (error) throw error;
        toast.success("Trilha atualizada!");
      } else {
        const { error } = await supabase
          .from("learning_tracks")
          .insert({ ...trackForm, order_index: tracks.length });
        if (error) throw error;
        toast.success("Trilha criada!");
      }
      setTrackDialogOpen(false);
      setEditingTrack(null);
      setTrackForm({ name: "", slug: "", description: "", icon: "BookOpen", color: "from-blue-500 to-cyan-500", is_active: true });
      loadAllData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteTrack = async (id: string) => {
    if (!confirm("Tem certeza? Isso excluirá todos os módulos e aulas relacionados.")) return;
    const { error } = await supabase.from("learning_tracks").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Trilha excluída!");
      loadAllData();
    }
  };

  // Module CRUD
  const handleSaveModule = async () => {
    try {
      if (editingModule) {
        const { error } = await supabase
          .from("learning_modules")
          .update(moduleForm)
          .eq("id", editingModule.id);
        if (error) throw error;
        toast.success("Módulo atualizado!");
      } else {
        const trackModules = modules.filter(m => m.track_id === moduleForm.track_id);
        const { error } = await supabase
          .from("learning_modules")
          .insert({ ...moduleForm, order_index: trackModules.length });
        if (error) throw error;
        toast.success("Módulo criado!");
      }
      setModuleDialogOpen(false);
      setEditingModule(null);
      setModuleForm({ track_id: "", name: "", description: "", is_active: true });
      loadAllData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm("Tem certeza? Isso excluirá todas as aulas relacionadas.")) return;
    const { error } = await supabase.from("learning_modules").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Módulo excluído!");
      loadAllData();
    }
  };

  // Lesson CRUD with video and thumbnail upload
  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `lessons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("educational-videos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("educational-videos")
        .getPublicUrl(filePath);

      setLessonForm(prev => ({ ...prev, video_url: publicUrl }));
      toast.success("Vídeo enviado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao enviar vídeo: " + error.message);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingThumbnail(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `thumbnails/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("educational-videos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("educational-videos")
        .getPublicUrl(fileName);

      setLessonForm(prev => ({ ...prev, thumbnail_url: publicUrl }));
      toast.success("Thumbnail enviada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao enviar thumbnail: " + error.message);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleSaveLesson = async () => {
    try {
      if (editingLesson) {
        const { error } = await supabase
          .from("learning_lessons")
          .update(lessonForm)
          .eq("id", editingLesson.id);
        if (error) throw error;
        toast.success("Aula atualizada!");
      } else {
        const moduleLessons = lessons.filter(l => l.module_id === lessonForm.module_id);
        const { error } = await supabase
          .from("learning_lessons")
          .insert({ ...lessonForm, order_index: moduleLessons.length });
        if (error) throw error;
        toast.success("Aula criada!");
      }
      setLessonDialogOpen(false);
      setEditingLesson(null);
      setLessonForm({ module_id: "", title: "", description: "", content: "", video_url: "", thumbnail_url: "", duration_minutes: 0, points: 10, is_active: true });
      loadAllData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta aula?")) return;
    const { error } = await supabase.from("learning_lessons").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Aula excluída!");
      loadAllData();
    }
  };

  // Quiz CRUD
  const handleSaveQuiz = async () => {
    try {
      const quizData = {
        ...quizForm,
        module_id: quizForm.module_id || null,
        lesson_id: quizForm.lesson_id || null
      };

      if (editingQuiz) {
        const { error } = await supabase
          .from("learning_quizzes")
          .update(quizData)
          .eq("id", editingQuiz.id);
        if (error) throw error;
        toast.success("Quiz atualizado!");
      } else {
        const { error } = await supabase
          .from("learning_quizzes")
          .insert(quizData);
        if (error) throw error;
        toast.success("Quiz criado!");
      }
      setQuizDialogOpen(false);
      setEditingQuiz(null);
      setQuizForm({ module_id: "", lesson_id: "", title: "", description: "", points: 20, passing_score: 70, is_active: true });
      loadAllData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este quiz?")) return;
    const { error } = await supabase.from("learning_quizzes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Quiz excluído!");
      loadAllData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/aprenda")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Gerenciar Conteúdo Educacional</h1>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card/50 backdrop-blur-sm border border-border/50">
            <TabsTrigger value="trilhas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-4 w-4 mr-2" />
              Trilhas
            </TabsTrigger>
            <TabsTrigger value="modulos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Layers className="h-4 w-4 mr-2" />
              Módulos
            </TabsTrigger>
            <TabsTrigger value="aulas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Video className="h-4 w-4 mr-2" />
              Aulas
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <HelpCircle className="h-4 w-4 mr-2" />
              Quizzes
            </TabsTrigger>
          </TabsList>

          {/* Trilhas Tab */}
          <TabsContent value="trilhas">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Trilhas de Conhecimento</CardTitle>
                <Dialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingTrack(null); setTrackForm({ name: "", slug: "", description: "", icon: "BookOpen", color: "from-blue-500 to-cyan-500", is_active: true }); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Trilha
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingTrack ? "Editar Trilha" : "Nova Trilha"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome</Label>
                        <Input value={trackForm.name} onChange={e => setTrackForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Ex: Day Trade" />
                      </div>
                      <div>
                        <Label>Slug (URL)</Label>
                        <Input value={trackForm.slug} onChange={e => setTrackForm(prev => ({ ...prev, slug: e.target.value }))} placeholder="Ex: day-trade" />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea value={trackForm.description} onChange={e => setTrackForm(prev => ({ ...prev, description: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Ícone</Label>
                        <Select value={trackForm.icon} onValueChange={v => setTrackForm(prev => ({ ...prev, icon: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Activity">Activity</SelectItem>
                            <SelectItem value="Bitcoin">Bitcoin</SelectItem>
                            <SelectItem value="Globe">Globe</SelectItem>
                            <SelectItem value="Wallet">Wallet</SelectItem>
                            <SelectItem value="BookOpen">BookOpen</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Cor (Gradiente)</Label>
                        <Select value={trackForm.color || ""} onValueChange={v => setTrackForm(prev => ({ ...prev, color: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="from-blue-500 to-cyan-500">Azul</SelectItem>
                            <SelectItem value="from-orange-500 to-amber-500">Laranja</SelectItem>
                            <SelectItem value="from-green-500 to-emerald-500">Verde</SelectItem>
                            <SelectItem value="from-purple-500 to-pink-500">Roxo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={trackForm.is_active} onCheckedChange={v => setTrackForm(prev => ({ ...prev, is_active: v }))} />
                        <Label>Ativa</Label>
                      </div>
                      <Button onClick={handleSaveTrack} className="w-full">Salvar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Módulos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tracks.map(track => (
                      <TableRow key={track.id}>
                        <TableCell className="font-medium">{track.name}</TableCell>
                        <TableCell>{track.slug}</TableCell>
                        <TableCell>{modules.filter(m => m.track_id === track.id).length}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${track.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                            {track.is_active ? "Ativa" : "Inativa"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingTrack(track); setTrackForm({ name: track.name, slug: track.slug, description: track.description || "", icon: track.icon || "BookOpen", color: track.color || "from-blue-500 to-cyan-500", is_active: track.is_active }); setTrackDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteTrack(track.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Módulos Tab */}
          <TabsContent value="modulos">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Módulos</CardTitle>
                <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingModule(null); setModuleForm({ track_id: tracks[0]?.id || "", name: "", description: "", is_active: true }); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Módulo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingModule ? "Editar Módulo" : "Novo Módulo"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Trilha</Label>
                        <Select value={moduleForm.track_id} onValueChange={v => setModuleForm(prev => ({ ...prev, track_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione uma trilha" /></SelectTrigger>
                          <SelectContent>
                            {tracks.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Nome</Label>
                        <Input value={moduleForm.name} onChange={e => setModuleForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Ex: Módulo 1 - Iniciante" />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea value={moduleForm.description} onChange={e => setModuleForm(prev => ({ ...prev, description: e.target.value }))} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={moduleForm.is_active} onCheckedChange={v => setModuleForm(prev => ({ ...prev, is_active: v }))} />
                        <Label>Ativo</Label>
                      </div>
                      <Button onClick={handleSaveModule} className="w-full">Salvar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Trilha</TableHead>
                      <TableHead>Aulas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map(mod => (
                      <TableRow key={mod.id}>
                        <TableCell className="font-medium">{mod.name}</TableCell>
                        <TableCell>{tracks.find(t => t.id === mod.track_id)?.name || "-"}</TableCell>
                        <TableCell>{lessons.filter(l => l.module_id === mod.id).length}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${mod.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                            {mod.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingModule(mod); setModuleForm({ track_id: mod.track_id, name: mod.name, description: mod.description || "", is_active: mod.is_active }); setModuleDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteModule(mod.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aulas Tab */}
          <TabsContent value="aulas">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Aulas</CardTitle>
                <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingLesson(null); setLessonForm({ module_id: modules[0]?.id || "", title: "", description: "", content: "", video_url: "", thumbnail_url: "", duration_minutes: 0, points: 10, is_active: true }); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Aula
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingLesson ? "Editar Aula" : "Nova Aula"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Módulo</Label>
                        <Select value={lessonForm.module_id} onValueChange={v => setLessonForm(prev => ({ ...prev, module_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione um módulo" /></SelectTrigger>
                          <SelectContent>
                            {modules.map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                {tracks.find(t => t.id === m.track_id)?.name} - {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Título</Label>
                        <Input value={lessonForm.title} onChange={e => setLessonForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Ex: Introdução ao Day Trade" />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea value={lessonForm.description} onChange={e => setLessonForm(prev => ({ ...prev, description: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Conteúdo (Markdown suportado)</Label>
                        <Textarea value={lessonForm.content} onChange={e => setLessonForm(prev => ({ ...prev, content: e.target.value }))} rows={6} placeholder="Conteúdo da aula em texto ou markdown..." />
                      </div>
                      <div className="space-y-2">
                        <Label>Vídeo da Aula</Label>
                        <div className="flex gap-2">
                          <Input value={lessonForm.video_url} onChange={e => setLessonForm(prev => ({ ...prev, video_url: e.target.value }))} placeholder="URL do vídeo ou faça upload" className="flex-1" />
                          <div className="relative">
                            <input type="file" accept="video/*" onChange={handleVideoUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploadingVideo} />
                            <Button variant="outline" disabled={uploadingVideo}>
                              {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        {lessonForm.video_url && (
                          <p className="text-sm text-muted-foreground truncate">Vídeo: {lessonForm.video_url}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Thumbnail da Aula</Label>
                        <div className="flex gap-2">
                          <Input value={lessonForm.thumbnail_url} onChange={e => setLessonForm(prev => ({ ...prev, thumbnail_url: e.target.value }))} placeholder="URL da thumbnail ou faça upload" className="flex-1" />
                          <div className="relative">
                            <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploadingThumbnail} />
                            <Button variant="outline" disabled={uploadingThumbnail}>
                              {uploadingThumbnail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        {lessonForm.thumbnail_url && (
                          <div className="flex items-center gap-2">
                            <img src={lessonForm.thumbnail_url} alt="Thumbnail" className="h-16 w-24 object-cover rounded" />
                            <p className="text-sm text-muted-foreground truncate flex-1">{lessonForm.thumbnail_url}</p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Duração (minutos)</Label>
                          <Input type="number" value={lessonForm.duration_minutes} onChange={e => setLessonForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))} />
                        </div>
                        <div>
                          <Label>Pontos</Label>
                          <Input type="number" value={lessonForm.points} onChange={e => setLessonForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={lessonForm.is_active} onCheckedChange={v => setLessonForm(prev => ({ ...prev, is_active: v }))} />
                        <Label>Ativa</Label>
                      </div>
                      <Button onClick={handleSaveLesson} className="w-full">Salvar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Pontos</TableHead>
                      <TableHead>Vídeo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lessons.map(lesson => {
                      const mod = modules.find(m => m.id === lesson.module_id);
                      const track = tracks.find(t => t.id === mod?.track_id);
                      return (
                        <TableRow key={lesson.id}>
                          <TableCell className="font-medium">{lesson.title}</TableCell>
                          <TableCell>{track?.name} - {mod?.name}</TableCell>
                          <TableCell>{lesson.duration_minutes} min</TableCell>
                          <TableCell>{lesson.points} pts</TableCell>
                          <TableCell>
                            {lesson.video_url ? (
                              <span className="text-success">✓</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${lesson.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                              {lesson.is_active ? "Ativa" : "Inativa"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => { 
                              setEditingLesson(lesson); 
                              setLessonForm({ 
                                module_id: lesson.module_id, 
                                title: lesson.title, 
                                description: lesson.description || "", 
                                content: lesson.content || "", 
                                video_url: lesson.video_url || "", 
                                thumbnail_url: lesson.thumbnail_url || "",
                                duration_minutes: lesson.duration_minutes || 0, 
                                points: lesson.points || 10, 
                                is_active: lesson.is_active 
                              }); 
                              setLessonDialogOpen(true); 
                            }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteLesson(lesson.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Quizzes</CardTitle>
                <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingQuiz(null); setQuizForm({ module_id: "", lesson_id: "", title: "", description: "", points: 20, passing_score: 70, is_active: true }); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Quiz
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingQuiz ? "Editar Quiz" : "Novo Quiz"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Módulo (opcional)</Label>
                        <Select value={quizForm.module_id || ""} onValueChange={v => setQuizForm(prev => ({ ...prev, module_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione um módulo" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {modules.map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                {tracks.find(t => t.id === m.track_id)?.name} - {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Aula (opcional)</Label>
                        <Select value={quizForm.lesson_id || ""} onValueChange={v => setQuizForm(prev => ({ ...prev, lesson_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione uma aula" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhuma</SelectItem>
                            {lessons.map(l => (
                              <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Título</Label>
                        <Input value={quizForm.title} onChange={e => setQuizForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Ex: Quiz - Day Trade Nível 1" />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea value={quizForm.description} onChange={e => setQuizForm(prev => ({ ...prev, description: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Pontos</Label>
                          <Input type="number" value={quizForm.points} onChange={e => setQuizForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))} />
                        </div>
                        <div>
                          <Label>Nota Mínima (%)</Label>
                          <Input type="number" value={quizForm.passing_score} onChange={e => setQuizForm(prev => ({ ...prev, passing_score: parseInt(e.target.value) || 0 }))} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={quizForm.is_active} onCheckedChange={v => setQuizForm(prev => ({ ...prev, is_active: v }))} />
                        <Label>Ativo</Label>
                      </div>
                      <Button onClick={handleSaveQuiz} className="w-full">Salvar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Módulo/Aula</TableHead>
                      <TableHead>Perguntas</TableHead>
                      <TableHead>Pontos</TableHead>
                      <TableHead>Nota Mínima</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quizzes.map(quiz => {
                      const mod = modules.find(m => m.id === quiz.module_id);
                      const lesson = lessons.find(l => l.id === quiz.lesson_id);
                      return (
                        <TableRow key={quiz.id}>
                          <TableCell className="font-medium">{quiz.title}</TableCell>
                          <TableCell>{mod?.name || lesson?.title || "-"}</TableCell>
                          <TableCell>
                            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => navigate(`/aprenda/quiz/${quiz.id}`)}>
                              Ver Perguntas
                            </Button>
                          </TableCell>
                          <TableCell>{quiz.points} pts</TableCell>
                          <TableCell>{quiz.passing_score}%</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${quiz.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                              {quiz.is_active ? "Ativo" : "Inativo"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => { 
                              setEditingQuiz(quiz); 
                              setQuizForm({ 
                                module_id: quiz.module_id || "", 
                                lesson_id: quiz.lesson_id || "", 
                                title: quiz.title, 
                                description: quiz.description || "", 
                                points: quiz.points || 20, 
                                passing_score: quiz.passing_score || 70, 
                                is_active: quiz.is_active 
                              }); 
                              setQuizDialogOpen(true); 
                            }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteQuiz(quiz.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
