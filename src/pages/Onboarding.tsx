import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Upload, 
  DollarSign, 
  ArrowRight, 
  ArrowLeft,
  Check,
  Sparkles,
  Rocket,
  Target,
  Shield,
  Zap,
  Bot,
  ShieldAlert,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  features: string[];
  quote: string;
  path: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: "Dashboard Inteligente",
    description: "Acompanhe seu desempenho em tempo real com métricas avançadas",
    icon: <TrendingUp className="w-16 h-16" />,
    gradient: "from-primary to-primary/60",
    features: [
      "Estatísticas detalhadas de operações",
      "Gráficos de performance interativos",
      "Métricas de lucro/perda em tempo real",
      "Análise de estratégias vencedoras"
    ],
    quote: "Dados precisos são a base de decisões inteligentes",
    path: "/dashboard"
  },
  {
    id: 2,
    title: "Trading Profit",
    description: "Importe seus resultados do Profit e acompanhe sua evolução",
    icon: <Upload className="w-16 h-16" />,
    gradient: "from-success to-success/60",
    features: [
      "Importação automática de operações do Profit",
      "Dashboard completo de performance",
      "Análise detalhada por estratégia",
      "Parâmetros e métricas personalizadas"
    ],
    quote: "Automatize e otimize seu processo de análise",
    path: "/trading"
  },
  {
    id: 3,
    title: "Robôs e Operações",
    description: "Gerencie seus robôs e analise todas suas operações",
    icon: <Bot className="w-16 h-16" />,
    gradient: "from-accent to-accent/60",
    features: [
      "Registro detalhado de trades",
      "Análise por ativo e estratégia",
      "Histórico completo de operações",
      "Importação via notas de corretagem"
    ],
    quote: "Disciplina transforma traders em vencedores",
    path: "/operations"
  },
  {
    id: 4,
    title: "Controle Financeiro",
    description: "Gerencie suas finanças de forma inteligente e estratégica",
    icon: <DollarSign className="w-16 h-16" />,
    gradient: "from-warning to-warning/60",
    features: [
      "Controle completo de receitas e despesas",
      "Múltiplas contas e carteiras",
      "Metas financeiras personalizadas",
      "Relatórios e gráficos detalhados"
    ],
    quote: "Controle financeiro é liberdade",
    path: "/financas"
  },
  {
    id: 5,
    title: "Gerenciamento de Risco",
    description: "Calcule e controle seu risco de forma profissional",
    icon: <ShieldAlert className="w-16 h-16" />,
    gradient: "from-destructive to-destructive/60",
    features: [
      "Calculadora de risco por operação",
      "Definição de stop loss e take profit",
      "Análise de payoff e taxa de acerto",
      "Simulações de cenários"
    ],
    quote: "Gerenciar risco é preservar capital",
    path: "/risco"
  }
];

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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
};

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
  const step = onboardingSteps[currentStep];

  // Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePosition({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = () => {
    localStorage.setItem("onboarding_completed", "true");
    navigate("/dashboard");
  };

  const handleExplorePage = () => {
    localStorage.setItem("onboarding_completed", "true");
    navigate(step.path);
  };

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Dynamic gradient background */}
      <div 
        className="fixed inset-0 opacity-50 pointer-events-none transition-transform duration-1000 ease-out"
        style={{
          background: `radial-gradient(circle at ${50 + mousePosition.x}% ${50 + mousePosition.y}%, hsl(var(--primary) / 0.15), transparent 50%)`,
        }}
      />

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            y: [0, -20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            y: [0, 20, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{ 
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, 30, 0],
            y: [0, -15, 0],
          }}
          transition={{ 
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-success/10 rounded-full blur-[80px]" 
        />
      </div>

      {/* Left side - Branding */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="hidden lg:flex w-1/2 relative items-center justify-center p-12"
      >
        <div className="relative z-10 max-w-lg">
          {/* Decorative elements */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-20 -left-20 w-40 h-40 border border-primary/20 rounded-full"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-10 -right-10 w-60 h-60 border border-accent/20 rounded-full"
          />

          {/* Icon showcase */}
          <motion.div 
            variants={itemVariants}
            className="mb-8"
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.3 },
                }}
                className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-primary-foreground shadow-2xl`}
              >
                {step.icon}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Quote section */}
          <motion.div variants={itemVariants} className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <blockquote className="text-2xl font-light text-foreground/80 italic border-l-4 border-primary pl-6">
                  "{step.quote}"
                </blockquote>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Feature highlights */}
          <motion.div variants={itemVariants} className="mt-12 grid grid-cols-2 gap-4">
            {[
              { icon: <Shield className="w-5 h-5" />, text: "Segurança Total" },
              { icon: <Zap className="w-5 h-5" />, text: "Tempo Real" },
              { icon: <Target className="w-5 h-5" />, text: "Metas Claras" },
              { icon: <Rocket className="w-5 h-5" />, text: "Alta Performance" },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30"
              >
                <div className="text-primary">{item.icon}</div>
                <span className="text-sm font-medium text-foreground/80">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Right side - Content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-xl relative z-10"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
                Zeve Hub
              </h1>
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <p className="text-lg text-muted-foreground">
              Sua plataforma completa de trading
            </p>
          </motion.div>

          {/* Progress */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex justify-between mb-3 text-sm">
              <span className="text-muted-foreground">Progresso do tour</span>
              <span className="text-primary font-semibold">{currentStep + 1} de {onboardingSteps.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </motion.div>

          {/* Main Content Card */}
          <motion.div 
            variants={itemVariants}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-xl opacity-50" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.3 },
                  }}
                >
                  {/* Step icon - mobile */}
                  <div className={`lg:hidden w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-primary-foreground shadow-lg`}>
                    {onboardingSteps[currentStep].icon && (
                      <div className="scale-75">
                        {step.icon}
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="text-center lg:text-left mb-8">
                    <h2 className="text-3xl font-bold text-foreground mb-3">
                      {step.title}
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      {step.description}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="space-y-4">
                    {step.features.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${step.gradient} flex items-center justify-center`}>
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <span className="text-foreground/90 pt-1">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Navigation */}
          <motion.div 
            variants={itemVariants}
            className="mt-8 space-y-6"
          >
            {/* Explore page button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center"
            >
              <Button
                variant="outline"
                onClick={handleExplorePage}
                className={`gap-2 px-6 py-3 h-auto border-2 hover:scale-105 transition-all duration-300 bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent border-primary/30 hover:border-primary/60`}
              >
                <ExternalLink className="w-4 h-4 text-primary" />
                <span className="font-semibold">Explorar {step.title}</span>
              </Button>
            </motion.div>

            {/* Step indicators */}
            <div className="flex justify-center gap-3">
              {onboardingSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDirection(index > currentStep ? 1 : -1);
                    setCurrentStep(index);
                  }}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    index === currentStep
                      ? "w-10 bg-primary shadow-lg shadow-primary/30"
                      : index < currentStep
                      ? "w-2 bg-primary/50"
                      : "w-2 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              {currentStep > 0 ? (
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  className="flex-1 h-14 gap-2 text-base border-border/50 hover:bg-muted/50"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Anterior
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="flex-1 h-14 text-base text-muted-foreground hover:text-foreground"
                >
                  Pular Tour
                </Button>
              )}

              <Button
                onClick={handleNext}
                className={`flex-1 h-14 gap-2 text-base font-semibold shadow-lg transition-all duration-300 ${
                  currentStep === onboardingSteps.length - 1
                    ? "bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 shadow-success/20"
                    : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-primary/20"
                }`}
              >
                {currentStep === onboardingSteps.length - 1 ? (
                  <>
                    <Rocket className="w-5 h-5" />
                    Começar Agora
                  </>
                ) : (
                  <>
                    Próximo
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Onboarding;
