import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  TrendingUp,
  Rocket,
  Activity,
  BarChart3,
  Users,
  Zap,
  Shield,
  Target,
  Star,
  Quote,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  X,
  Play,
  ChevronDown,
  Bot,
  LineChart,
  Wallet,
  Clock,
  Award,
  ArrowUpRight,
  MousePointer,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useParallax } from "@/hooks/useParallax";
import { useCountUp } from "@/hooks/useCountUp";
import { motion } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Mouse tracking for gradient effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Parallax effects
  const parallaxOffset = useParallax(0.3);

  // Scroll animation hooks for different sections
  const heroAnimation = useScrollAnimation({ threshold: 0.2 });
  const statsAnimation = useScrollAnimation({ threshold: 0.2 });
  const featuresAnimation = useScrollAnimation({ threshold: 0.1 });
  const testimonialsAnimation = useScrollAnimation({ threshold: 0.1 });
  const partnersAnimation = useScrollAnimation({ threshold: 0.1 });
  const faqAnimation = useScrollAnimation({ threshold: 0.1 });
  const ctaAnimation = useScrollAnimation({ threshold: 0.1 });
  const cta2Animation = useScrollAnimation({ threshold: 0.1 });
  const pricingAnimation = useScrollAnimation({ threshold: 0.1 });
  const showcaseAnimation = useScrollAnimation({ threshold: 0.1 });

  // Smooth scroll function
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Counter animations for stats
  const successRate = useCountUp({ end: 98, duration: 2500, suffix: "%" });
  const activeUsers = useCountUp({ end: 5000, duration: 2000, suffix: "+" });
  const totalProfit = useCountUp({ end: 2.5, duration: 2000, prefix: "R$ ", suffix: "M+" });
  const monitoring = useCountUp({ end: 24, duration: 1500, suffix: "/7" });

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
    document.documentElement.classList.toggle("dark");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 12,
      },
    },
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Navbar theme={theme} onThemeToggle={toggleTheme} />

      {/* Premium Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Dynamic gradient that follows mouse */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full opacity-30 blur-[120px] transition-all duration-1000 ease-out"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
            left: mousePosition.x - 400,
            top: mousePosition.y - 400,
          }}
        />
        
        {/* Ambient orbs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/20 via-primary/5 to-transparent rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-accent/15 via-accent/5 to-transparent rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/5 via-transparent to-accent/5 rounded-full blur-[100px]" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_30%,#000_40%,transparent_100%)]" />
        
        {/* Floating particles */}
        <div className="particle particle-1" />
        <div className="particle particle-2" />
        <div className="particle particle-3" />
        <div className="particle particle-4" />
        <div className="particle particle-5" />
        <div className="particle particle-6" />
      </div>

      {/* Hero Section - Completely Redesigned */}
      <section
        id="inicio"
        ref={heroAnimation.ref}
        className="relative z-10 min-h-screen flex items-center justify-center pt-20"
      >
        <div className="container mx-auto px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={heroAnimation.isVisible ? "visible" : "hidden"}
            className="text-center max-w-6xl mx-auto"
          >
            {/* Premium Badge */}
            <motion.div variants={itemVariants} className="mb-8">
              <Badge
                className="group px-6 py-3 text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all rounded-full backdrop-blur-md cursor-pointer"
                onClick={() => scrollToSection("features")}
              >
                <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                Nova versão 2.0 disponível
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Badge>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-8 leading-[0.95] tracking-tight"
            >
              <span className="text-foreground">Transforme seus</span>
              <br />
              <span className="relative">
                <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                  investimentos
                </span>
                <motion.div
                  className="absolute -bottom-2 left-0 right-0 h-3 bg-gradient-to-r from-primary/30 to-accent/30 blur-sm rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1, duration: 0.8 }}
                />
              </span>
              <br />
              <span className="text-foreground">em resultados</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed font-light"
            >
              A plataforma inteligente que revoluciona o monitoramento de robôs.
              <span className="text-foreground font-medium"> Análises em tempo real, insights com IA</span> e suporte
              especializado para maximizar sua performance.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="group relative overflow-hidden gap-3 text-base px-10 py-7 rounded-2xl font-bold text-lg shadow-2xl shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Começar Gratuitamente
                  <Rocket className="w-5 h-5 group-hover:rotate-12 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/80" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollToSection("features")}
                className="group gap-3 text-base px-10 py-7 rounded-2xl border-2 border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 font-bold text-lg backdrop-blur-sm"
              >
                <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Ver Demo
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>Setup em 5 minutos</span>
              </div>
              <div className="w-px h-4 bg-border hidden sm:block" />
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="w-px h-4 bg-border hidden sm:block" />
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>Suporte 24/7</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => scrollToSection("stats")}
          >
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Scroll</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ChevronDown className="w-5 h-5 text-primary" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section - Premium Cards */}
      <section id="stats" ref={statsAnimation.ref} className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={statsAnimation.isVisible ? "visible" : "hidden"}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 max-w-6xl mx-auto"
          >
            {[
              { ref: successRate.ref, value: successRate.value, label: "Taxa de Sucesso", icon: Target, color: "from-success/20 to-success/5" },
              { ref: activeUsers.ref, value: activeUsers.value, label: "Usuários Ativos", icon: Users, color: "from-primary/20 to-primary/5" },
              { ref: totalProfit.ref, value: totalProfit.value, label: "Lucro Gerado", icon: TrendingUp, color: "from-accent/20 to-accent/5" },
              { ref: monitoring.ref, value: monitoring.value, label: "Monitoramento", icon: Clock, color: "from-warning/20 to-warning/5" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <Card className="relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-xl rounded-3xl hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5">
                  <CardContent className="p-6 lg:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <stat.icon className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                      </div>
                    </div>
                    <div ref={stat.ref} className="text-3xl lg:text-5xl font-black text-foreground mb-2 tracking-tight">
                      {stat.value}
                    </div>
                    <div className="text-xs lg:text-sm text-muted-foreground font-medium uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section id="features" ref={featuresAnimation.ref} className="relative z-10 py-32">
        <div className="container mx-auto px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={featuresAnimation.isVisible ? "visible" : "hidden"}
            className="max-w-7xl mx-auto"
          >
            {/* Section Header */}
            <motion.div variants={itemVariants} className="text-center mb-20">
              <Badge className="mb-6 px-6 py-2 text-xs bg-primary/10 text-primary border-primary/20 rounded-full backdrop-blur-sm">
                RECURSOS PREMIUM
              </Badge>
              <h2 className="text-4xl md:text-6xl font-black text-foreground mb-6 tracking-tight">
                Tudo que você precisa
                <br />
                <span className="text-muted-foreground">em um só lugar</span>
              </h2>
              <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
                Ferramentas profissionais projetadas para traders que buscam excelência
              </p>
            </motion.div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 - Large */}
              <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2">
                <Card className="group h-full overflow-hidden border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 hover:border-primary/30 transition-all duration-500 rounded-3xl">
                  <CardContent className="p-8 lg:p-10 h-full flex flex-col">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                      <Bot className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-bold mb-4">Monitoramento Inteligente de Robôs</h3>
                    <p className="text-muted-foreground text-lg mb-6 flex-grow">
                      Acompanhe todas as operações em tempo real com dashboards interativos. Receba alertas instantâneos e tenha controle total sobre sua estratégia.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        <span>Tempo real</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        <span>Alertas automáticos</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Feature 2 */}
              <motion.div variants={itemVariants}>
                <Card className="group h-full overflow-hidden border border-border/50 bg-card hover:border-primary/30 transition-all duration-500 rounded-3xl">
                  <CardContent className="p-8 h-full flex flex-col">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                      <LineChart className="w-7 h-7 text-success" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Análise com IA</h3>
                    <p className="text-muted-foreground text-sm flex-grow">
                      Insights automáticos sobre seus padrões de trading e sugestões personalizadas de melhoria.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Feature 3 */}
              <motion.div variants={itemVariants}>
                <Card className="group h-full overflow-hidden border border-border/50 bg-card hover:border-primary/30 transition-all duration-500 rounded-3xl">
                  <CardContent className="p-8 h-full flex flex-col">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                      <Shield className="w-7 h-7 text-warning" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Gestão de Risco</h3>
                    <p className="text-muted-foreground text-sm flex-grow">
                      Calculadoras avançadas, métricas de risco e proteção automatizada do seu capital.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Feature 4 */}
              <motion.div variants={itemVariants}>
                <Card className="group h-full overflow-hidden border border-border/50 bg-card hover:border-primary/30 transition-all duration-500 rounded-3xl">
                  <CardContent className="p-8 h-full flex flex-col">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                      <Award className="w-7 h-7 text-accent-foreground" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Gamificação</h3>
                    <p className="text-muted-foreground text-sm flex-grow">
                      Conquiste badges, suba no ranking semanal e acompanhe sua evolução como trader.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Feature 5 */}
              <motion.div variants={itemVariants}>
                <Card className="group h-full overflow-hidden border border-border/50 bg-card hover:border-primary/30 transition-all duration-500 rounded-3xl">
                  <CardContent className="p-8 h-full flex flex-col">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                      <Wallet className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Finanças Pessoais</h3>
                    <p className="text-muted-foreground text-sm flex-grow">
                      Controle completo das suas finanças, metas e previsões com inteligência artificial.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Showcase/Preview Section */}
      <section ref={showcaseAnimation.ref} className="relative z-10 py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="container mx-auto px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={showcaseAnimation.isVisible ? "visible" : "hidden"}
            className="max-w-6xl mx-auto"
          >
            <motion.div variants={itemVariants} className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-foreground mb-6 tracking-tight">
                Uma experiência única
              </h2>
              <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
                Interface moderna e intuitiva projetada para máxima produtividade
              </p>
            </motion.div>

            {/* Dashboard Preview Card */}
            <motion.div
              variants={itemVariants}
              className="relative group"
            >
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-700" />
              <Card className="relative overflow-hidden border border-border/50 bg-gradient-to-br from-card to-card/80 rounded-[2.5rem] shadow-2xl">
                <CardContent className="p-8 lg:p-12">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div>
                      <Badge className="mb-6 px-4 py-2 text-xs bg-success/10 text-success border-success/20 rounded-full">
                        DASHBOARD LIVE
                      </Badge>
                      <h3 className="text-3xl lg:text-4xl font-bold mb-6">
                        Visualize seus resultados em tempo real
                      </h3>
                      <p className="text-muted-foreground text-lg mb-8">
                        Gráficos interativos, métricas detalhadas e insights que transformam dados em decisões inteligentes.
                      </p>
                      <Button
                        onClick={() => navigate("/auth")}
                        className="group gap-2 px-8 py-6 rounded-2xl font-bold"
                      >
                        Acessar Dashboard
                        <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </Button>
                    </div>
                    <div className="relative">
                      {/* Mock Dashboard Preview */}
                      <div className="bg-gradient-to-br from-background to-secondary/30 rounded-2xl p-6 border border-border/50 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                            <span className="text-sm font-medium">Live Trading</span>
                          </div>
                          <span className="text-2xl font-bold text-success">+R$ 1.247,50</span>
                        </div>
                        <div className="h-32 bg-gradient-to-r from-success/10 via-success/20 to-success/10 rounded-xl flex items-end p-4">
                          {[40, 65, 45, 80, 60, 90, 75, 85, 95, 70].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 mx-0.5 bg-success/60 rounded-t transition-all duration-300"
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { label: "Win Rate", value: "72%", color: "text-success" },
                            { label: "Operações", value: "23", color: "text-foreground" },
                            { label: "Payoff", value: "2.1x", color: "text-primary" },
                          ].map((stat, i) => (
                            <div key={i} className="text-center p-3 bg-card/50 rounded-xl">
                              <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                              <div className="text-xs text-muted-foreground">{stat.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Partners Section */}
      <section ref={partnersAnimation.ref} className="relative z-10 py-20">
        <div className="container mx-auto px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={partnersAnimation.isVisible ? "visible" : "hidden"}
            className="max-w-5xl mx-auto"
          >
            <motion.div variants={itemVariants} className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Parceiros de confiança
              </h2>
              <p className="text-muted-foreground">Integrados às melhores plataformas do mercado</p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
              {["B3", "MetaTrader", "TradingView", "Genial"].map((partner, index) => (
                <div
                  key={index}
                  className="group flex items-center gap-3 px-6 py-4 bg-card/50 rounded-2xl border border-border/50 hover:border-primary/30 hover:bg-card transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-lg font-bold text-foreground">{partner}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section ref={testimonialsAnimation.ref} className="relative z-10 py-32">
        <div className="container mx-auto px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={testimonialsAnimation.isVisible ? "visible" : "hidden"}
            className="max-w-7xl mx-auto"
          >
            <motion.div variants={itemVariants} className="text-center mb-16">
              <Badge className="mb-6 px-6 py-2 text-xs bg-primary/10 text-primary border-primary/20 rounded-full backdrop-blur-sm">
                DEPOIMENTOS
              </Badge>
              <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
                Resultados que falam
              </h2>
              <p className="text-xl text-muted-foreground font-light">Histórias reais de traders como você</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: "Carlos Silva",
                  role: "Trader Profissional",
                  avatar: "CS",
                  text: "O Zeve Hub transformou completamente minha forma de operar. Consigo acompanhar todos os meus robôs em tempo real com uma interface incrível.",
                  result: "+127%",
                  period: "em 6 meses",
                },
                {
                  name: "Marina Costa",
                  role: "Investidora",
                  avatar: "MC",
                  text: "Finalmente encontrei uma plataforma que realmente entende as necessidades de quem opera com robôs. O suporte é excepcional!",
                  result: "+89%",
                  period: "em 4 meses",
                },
                {
                  name: "Ricardo Almeida",
                  role: "Day Trader",
                  avatar: "RA",
                  text: "A análise com IA me deu insights que eu não conseguia ter antes. Minha performance melhorou significativamente.",
                  result: "+156%",
                  period: "em 8 meses",
                },
              ].map((testimonial, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card className="group h-full overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-500 rounded-3xl">
                    <CardContent className="p-8 flex flex-col h-full">
                      <div className="flex items-center gap-4 mb-6">
                        <Avatar className="w-14 h-14 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                            {testimonial.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-foreground">{testimonial.name}</div>
                          <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                        </div>
                      </div>

                      <div className="flex gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                        ))}
                      </div>

                      <p className="text-muted-foreground leading-relaxed mb-6 flex-grow">
                        "{testimonial.text}"
                      </p>

                      <div className="pt-6 border-t border-border/50">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-success">{testimonial.result}</span>
                          <span className="text-sm text-muted-foreground">{testimonial.period}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section ref={faqAnimation.ref} className="relative z-10 py-32">
        <div className="container mx-auto px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={faqAnimation.isVisible ? "visible" : "hidden"}
            className="max-w-3xl mx-auto"
          >
            <motion.div variants={itemVariants} className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
                Perguntas Frequentes
              </h2>
              <p className="text-xl text-muted-foreground font-light">Tire suas dúvidas sobre a plataforma</p>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Accordion type="single" collapsible className="space-y-4">
                {[
                  {
                    question: "O que é o Zeve Hub?",
                    answer: "O Zeve Hub é a plataforma central da Zeve Investimentos, onde você pode monitorar todos os seus robôs de trading em tempo real, acessar análises avançadas com IA e contar com suporte especializado."
                  },
                  {
                    question: "Qual a diferença entre os planos?",
                    answer: "O plano 'Com Assessoria' é totalmente gratuito e inclui suporte prioritário da equipe Zeve. O plano 'Independente' custa R$ 199,90/mês e oferece todas as funcionalidades, mas sem o suporte direto da assessoria."
                  },
                  {
                    question: "Como funciona o monitoramento em tempo real?",
                    answer: "Nossa plataforma se conecta diretamente aos seus robôs e atualiza as informações instantaneamente. Você recebe alertas sobre operações e visualiza gráficos de performance em tempo real."
                  },
                  {
                    question: "Preciso ter conhecimento técnico para usar?",
                    answer: "Não! O Zeve Hub foi desenvolvido para ser simples e intuitivo. Mesmo usuários iniciantes conseguem navegar facilmente pela plataforma."
                  },
                  {
                    question: "Como faço para começar?",
                    answer: "É muito simples! Clique em 'Começar Agora', crie sua conta gratuita e você terá acesso imediato à plataforma. Nossa equipe pode ajudá-lo na configuração inicial."
                  },
                ].map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border border-border/50 rounded-2xl px-6 bg-card/50 backdrop-blur-sm data-[state=open]:bg-card data-[state=open]:border-primary/30 transition-all duration-300"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-6">
                      <span className="font-bold text-lg">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" ref={pricingAnimation.ref} className="relative z-10 py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="container mx-auto px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={pricingAnimation.isVisible ? "visible" : "hidden"}
            className="max-w-5xl mx-auto"
          >
            <motion.div variants={itemVariants} className="text-center mb-16">
              <Badge className="mb-6 px-6 py-2 text-xs bg-primary/10 text-primary border-primary/20 rounded-full backdrop-blur-sm">
                PLANOS
              </Badge>
              <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
                Escolha seu plano
              </h2>
              <p className="text-xl text-muted-foreground font-light">Opções flexíveis para suas necessidades</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Premium Plan */}
              <motion.div variants={itemVariants}>
                <Card className="relative h-full overflow-hidden border-2 border-primary/50 bg-gradient-to-br from-card via-card to-primary/5 rounded-3xl hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500">
                  <div className="absolute top-0 right-0 bg-success text-success-foreground px-6 py-2 text-sm font-bold rounded-bl-2xl">
                    RECOMENDADO
                  </div>
                  <CardContent className="p-8 lg:p-10">
                    <h3 className="text-2xl font-bold mb-4">Com Assessoria</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-5xl font-black text-primary">Gratuito</span>
                    </div>
                    <p className="text-muted-foreground mb-8">Acesso completo com suporte especializado</p>

                    <div className="space-y-4 mb-8">
                      {[
                        "Monitoramento completo de robôs",
                        "Análise avançada de performance",
                        "Suporte prioritário da Zeve",
                        "Atualizações em tempo real",
                        "Relatórios personalizados",
                        "Alertas ilimitados",
                        "Análise com IA",
                      ].map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          </div>
                          <span className="text-sm font-medium">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      className="w-full py-7 rounded-2xl font-bold text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40"
                      size="lg"
                      onClick={() => navigate("/auth")}
                    >
                      Começar Gratuitamente
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Standard Plan */}
              <motion.div variants={itemVariants}>
                <Card className="h-full overflow-hidden border border-border/50 bg-card rounded-3xl hover:border-primary/30 transition-all duration-500">
                  <CardContent className="p-8 lg:p-10">
                    <h3 className="text-2xl font-bold mb-4">Independente</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-5xl font-black text-foreground">R$ 199,90</span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    <p className="text-muted-foreground mb-8">Autonomia total no monitoramento</p>

                    <div className="space-y-4 mb-8">
                      {[
                        "Monitoramento completo de robôs",
                        "Análise avançada de performance",
                        "Atualizações em tempo real",
                        "Relatórios personalizados",
                        "Alertas ilimitados",
                      ].map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          </div>
                          <span className="text-sm font-medium">{feature}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-muted/50 flex items-center justify-center">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm text-muted-foreground">Sem suporte de assessoria</span>
                      </div>
                    </div>

                    <Button
                      className="w-full py-7 rounded-2xl font-bold text-lg"
                      size="lg"
                      variant="outline"
                      onClick={() => navigate("/auth")}
                    >
                      Assinar Agora
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section ref={cta2Animation.ref} className="relative z-10 py-32">
        <div className="container mx-auto px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={cta2Animation.isVisible ? "visible" : "hidden"}
            className="max-w-4xl mx-auto"
          >
            <motion.div variants={itemVariants}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-primary/80 rounded-[2.5rem] shadow-2xl shadow-primary/30">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <CardContent className="relative p-12 lg:p-16 text-center">
                  <h2 className="text-3xl md:text-5xl font-black text-primary-foreground mb-6 leading-tight">
                    Pronto para transformar seus resultados?
                  </h2>
                  <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
                    Junte-se a mais de 5.000 traders que já elevaram sua performance com o Zeve Hub
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      size="lg"
                      onClick={() => navigate("/auth")}
                      className="group gap-3 px-10 py-7 rounded-2xl font-bold text-lg bg-white text-primary hover:bg-white/90 shadow-xl"
                    >
                      Criar Conta Gratuita
                      <Rocket className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-black text-foreground mb-2">
                  Zeve <span className="text-primary">Hub</span>
                </h3>
                <p className="text-sm text-muted-foreground">Plataforma inteligente de monitoramento</p>
              </div>

              <div className="flex items-center gap-8">
                <Button variant="ghost" size="sm" onClick={() => scrollToSection("features")}>
                  Recursos
                </Button>
                <Button variant="ghost" size="sm" onClick={() => scrollToSection("pricing")}>
                  Planos
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                  Entrar
                </Button>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-border/50 text-center">
              <p className="text-sm text-muted-foreground">
                © 2024 Zeve Investimentos. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
