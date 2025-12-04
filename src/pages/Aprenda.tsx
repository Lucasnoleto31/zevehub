import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Search, 
  Play, 
  Clock, 
  BookOpen, 
  Brain, 
  Sparkles, 
  ChevronRight,
  GraduationCap,
  Target,
  TrendingUp,
  Zap,
  ArrowRight
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Mock data for lessons
const aulasEmAndamento = [
  {
    id: "aula_01",
    title: "Gestão de Risco para Day Trade",
    progress: 62,
    duration: "18:32",
    thumbnail: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop",
    tags: ["Gerenciamento", "Day Trade"],
  },
  {
    id: "aula_02",
    title: "Leitura de Fluxo - Módulo 3",
    progress: 35,
    duration: "24:15",
    thumbnail: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&h=400&fit=crop",
    tags: ["Tape Reading", "Fluxo"],
  },
  {
    id: "aula_03",
    title: "Psicologia do Trader",
    progress: 80,
    duration: "15:45",
    thumbnail: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop",
    tags: ["Psicologia", "Mindset"],
  },
];

const estudosGuiados = [
  {
    id: "estudo_01",
    title: "Estudo Guiado: Tape Reading do Zero ao Avançado",
    description: "A IA analisa seus trades e recomenda exercícios práticos.",
    level: "Intermediário",
    duration: "3h total",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
  },
  {
    id: "estudo_02",
    title: "Gestão de Risco Personalizada",
    description: "Ajustes automáticos baseados na sua taxa de acerto e payoff.",
    level: "Todos",
    duration: "1h 20m",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
  },
  {
    id: "estudo_03",
    title: "Dominando Tendências no Mini Índice",
    description: "Aprenda a identificar e operar tendências com precisão.",
    level: "Avançado",
    duration: "2h 45m",
    thumbnail: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=400&fit=crop",
  },
];

const aulasRecomendadas = [
  {
    id: "aula_estrategia",
    title: "Setup de Tendência com Confirmações",
    duration: "12:40",
    level: "Intermediário",
    thumbnail: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop",
    tags: ["Estratégia", "Mini Índice"],
  },
  {
    id: "aula_tape",
    title: "Tape Reading — Como ler agressões",
    duration: "22:55",
    level: "Avançado",
    thumbnail: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&h=400&fit=crop",
    tags: ["Fluxo"],
  },
  {
    id: "aula_macro",
    title: "Como o cenário macro afeta o índice",
    duration: "16:10",
    level: "Intermediário",
    thumbnail: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&h=400&fit=crop",
    tags: ["Macro"],
  },
  {
    id: "aula_psico",
    title: "Controle Emocional em Operações",
    duration: "19:25",
    level: "Iniciante",
    thumbnail: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop",
    tags: ["Psicologia"],
  },
  {
    id: "aula_opcoes",
    title: "Introdução às Opções",
    duration: "28:30",
    level: "Iniciante",
    thumbnail: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=400&fit=crop",
    tags: ["Opções", "Derivativos"],
  },
  {
    id: "aula_analise",
    title: "Análise Técnica Avançada",
    duration: "35:15",
    level: "Avançado",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
    tags: ["Análise Técnica"],
  },
];

const getLevelColor = (level: string) => {
  switch (level) {
    case "Iniciante":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "Intermediário":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "Avançado":
      return "bg-rose-500/20 text-rose-400 border-rose-500/30";
    default:
      return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
  }
};

export default function Aprenda() {
  const navigate = useNavigate();
  const [filtroNivel, setFiltroNivel] = useState<string>("todos");
  const [filtroAtivo, setFiltroAtivo] = useState<string>("todos");
  const [filtroTema, setFiltroTema] = useState<string>("todos");
  const [pesquisa, setPesquisa] = useState("");
  const [selectedAula, setSelectedAula] = useState<any>(null);
  const [selectedEstudo, setSelectedEstudo] = useState<any>(null);

  const aulasFiltradas = useMemo(() => {
    return aulasRecomendadas.filter((aula) => {
      const matchNivel = filtroNivel === "todos" || aula.level === filtroNivel;
      const matchPesquisa = pesquisa === "" || 
        aula.title.toLowerCase().includes(pesquisa.toLowerCase()) ||
        aula.tags.some(tag => tag.toLowerCase().includes(pesquisa.toLowerCase()));
      return matchNivel && matchPesquisa;
    });
  }, [filtroNivel, pesquisa]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#0e0f11]">
        <AppSidebar isAdmin={false} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-white" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                    <GraduationCap className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-white">
                    Aulas & Estudos Guiados com IA
                  </h1>
                </div>
                <p className="text-gray-400 text-lg">
                  Aprenda estratégias, simule operações e evolua com conteúdo baseado nos seus resultados.
                </p>
              </div>
            </div>

            {/* Filters */}
            <Card className="bg-[#1b1c1f] border-white/10">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <Select value={filtroNivel} onValueChange={setFiltroNivel}>
                    <SelectTrigger className="w-[160px] bg-[#0e0f11] border-white/10 text-white">
                      <SelectValue placeholder="Nível" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1b1c1f] border-white/10">
                      <SelectItem value="todos">Todos os Níveis</SelectItem>
                      <SelectItem value="Iniciante">Iniciante</SelectItem>
                      <SelectItem value="Intermediário">Intermediário</SelectItem>
                      <SelectItem value="Avançado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filtroAtivo} onValueChange={setFiltroAtivo}>
                    <SelectTrigger className="w-[160px] bg-[#0e0f11] border-white/10 text-white">
                      <SelectValue placeholder="Ativo" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1b1c1f] border-white/10">
                      <SelectItem value="todos">Todos os Ativos</SelectItem>
                      <SelectItem value="mini-indice">Mini Índice</SelectItem>
                      <SelectItem value="mini-dolar">Mini Dólar</SelectItem>
                      <SelectItem value="acoes">Ações</SelectItem>
                      <SelectItem value="opcoes">Opções</SelectItem>
                      <SelectItem value="cripto">Cripto</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filtroTema} onValueChange={setFiltroTema}>
                    <SelectTrigger className="w-[180px] bg-[#0e0f11] border-white/10 text-white">
                      <SelectValue placeholder="Tema" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1b1c1f] border-white/10">
                      <SelectItem value="todos">Todos os Temas</SelectItem>
                      <SelectItem value="gestao-risco">Gestão de Risco</SelectItem>
                      <SelectItem value="tape-reading">Tape Reading</SelectItem>
                      <SelectItem value="estrategias">Estratégias</SelectItem>
                      <SelectItem value="psicologia">Psicologia</SelectItem>
                      <SelectItem value="analise-tecnica">Análise Técnica</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex-1 min-w-[250px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar aula, tema, estratégia..."
                        value={pesquisa}
                        onChange={(e) => setPesquisa(e.target.value)}
                        className="pl-10 bg-[#0e0f11] border-white/10 text-white placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Continue Watching Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-xl font-semibold text-white">Continuar Assistindo</h2>
                </div>
                <Button variant="ghost" className="text-gray-400 hover:text-white">
                  Ver todos <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              
              <Carousel className="w-full">
                <CarouselContent className="-ml-4">
                  {aulasEmAndamento.map((aula) => (
                    <CarouselItem key={aula.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                      <Card 
                        className="bg-[#1b1c1f] border-white/10 overflow-hidden cursor-pointer hover:border-indigo-500/50 transition-all group"
                        onClick={() => setSelectedAula(aula)}
                      >
                        <div className="relative aspect-video overflow-hidden">
                          <img 
                            src={aula.thumbnail} 
                            alt={aula.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          <div className="absolute bottom-3 left-3 right-3">
                            <Progress value={aula.progress} className="h-1.5 bg-white/20" />
                          </div>
                          <div className="absolute top-3 right-3 bg-black/70 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {aula.duration}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-3 rounded-full bg-indigo-500/90 backdrop-blur">
                              <Play className="h-8 w-8 text-white fill-white" />
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-medium text-white mb-2 line-clamp-2">{aula.title}</h3>
                          <div className="flex gap-2 flex-wrap">
                            {aula.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs border-white/20 text-gray-400">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-indigo-400 mt-2">{aula.progress}% concluído</p>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex -left-4 bg-[#1b1c1f] border-white/10 text-white hover:bg-white/10" />
                <CarouselNext className="hidden md:flex -right-4 bg-[#1b1c1f] border-white/10 text-white hover:bg-white/10" />
              </Carousel>
            </section>

            {/* AI Guided Studies Section */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Estudos Guiados com IA</h2>
                <Sparkles className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-gray-400 mb-4">Roteiros inteligentes baseados nos seus trades reais.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {estudosGuiados.map((estudo) => (
                  <Card 
                    key={estudo.id} 
                    className="bg-gradient-to-br from-[#1b1c1f] to-[#1b1c1f]/80 border-white/10 overflow-hidden cursor-pointer hover:border-purple-500/50 transition-all group"
                    onClick={() => setSelectedEstudo(estudo)}
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img 
                        src={estudo.thumbnail} 
                        alt={estudo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/80 via-purple-900/40 to-transparent" />
                      <div className="absolute top-3 left-3">
                        <Badge className={`${getLevelColor(estudo.level)} border`}>
                          {estudo.level}
                        </Badge>
                      </div>
                      <div className="absolute top-3 right-3 bg-black/70 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {estudo.duration}
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center gap-2 text-purple-300 text-sm">
                          <Zap className="h-4 w-4" />
                          <span>Personalizado com IA</span>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-white mb-2 line-clamp-2">{estudo.title}</h3>
                      <p className="text-sm text-gray-400 line-clamp-2">{estudo.description}</p>
                      <Button className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white">
                        <Brain className="h-4 w-4 mr-2" />
                        Iniciar Estudo
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Recommended Classes Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-emerald-400" />
                <h2 className="text-xl font-semibold text-white">Aulas Recomendadas</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aulasFiltradas.map((aula) => (
                  <Card 
                    key={aula.id} 
                    className="bg-[#1b1c1f] border-white/10 overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-all group"
                    onClick={() => setSelectedAula(aula)}
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img 
                        src={aula.thumbnail} 
                        alt={aula.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute top-3 left-3">
                        <Badge className={`${getLevelColor(aula.level)} border`}>
                          {aula.level}
                        </Badge>
                      </div>
                      <div className="absolute top-3 right-3 bg-black/70 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {aula.duration}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-3 rounded-full bg-emerald-500/90 backdrop-blur">
                          <Play className="h-8 w-8 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-white mb-2 line-clamp-2">{aula.title}</h3>
                      <div className="flex gap-2 flex-wrap">
                        {aula.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs border-white/20 text-gray-400">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Lesson Details Modal */}
      <Dialog open={!!selectedAula} onOpenChange={() => setSelectedAula(null)}>
        <DialogContent className="bg-[#1b1c1f] border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">{selectedAula?.title}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedAula?.duration && `Duração: ${selectedAula.duration}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <img 
                src={selectedAula?.thumbnail} 
                alt={selectedAula?.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {selectedAula?.tags?.map((tag: string) => (
                <Badge key={tag} className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                  {tag}
                </Badge>
              ))}
              {selectedAula?.level && (
                <Badge className={getLevelColor(selectedAula.level)}>
                  {selectedAula.level}
                </Badge>
              )}
            </div>
            {selectedAula?.progress !== undefined && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Progresso</span>
                  <span className="text-indigo-400">{selectedAula.progress}%</span>
                </div>
                <Progress value={selectedAula.progress} className="h-2" />
              </div>
            )}
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
              <Play className="h-4 w-4 mr-2" />
              {selectedAula?.progress ? "Continuar Assistindo" : "Assistir Agora"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Guided Study Modal */}
      <Dialog open={!!selectedEstudo} onOpenChange={() => setSelectedEstudo(null)}>
        <DialogContent className="bg-[#1b1c1f] border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              {selectedEstudo?.title}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedEstudo?.duration && `Duração estimada: ${selectedEstudo.duration}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="aspect-video rounded-lg overflow-hidden">
              <img 
                src={selectedEstudo?.thumbnail} 
                alt={selectedEstudo?.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge className={selectedEstudo ? getLevelColor(selectedEstudo.level) : ""}>
                {selectedEstudo?.level}
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Guiado por IA
              </Badge>
            </div>
            <p className="text-gray-300">{selectedEstudo?.description}</p>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <h4 className="text-purple-300 font-medium mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Como funciona
              </h4>
              <ul className="text-sm text-gray-400 space-y-2">
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-purple-400 mt-0.5" />
                  A IA analisa seu histórico de operações
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-purple-400 mt-0.5" />
                  Cria um roteiro personalizado para suas necessidades
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-purple-400 mt-0.5" />
                  Sugere exercícios práticos baseados em seus pontos fracos
                </li>
              </ul>
            </div>
            <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white">
              <Brain className="h-4 w-4 mr-2" />
              Iniciar Estudo com IA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
