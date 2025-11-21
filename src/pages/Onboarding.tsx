import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  BarChart3, 
  ArrowRight, 
  Check,
  Sparkles
} from "lucide-react";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: "Dashboard",
    description: "Acompanhe seu desempenho em tempo real",
    icon: <TrendingUp className="w-12 h-12" />,
    color: "text-primary",
    features: [
      "Estatísticas detalhadas de operações",
      "Gráficos de performance",
      "Métricas de lucro/perda",
      "Análise de estratégias"
    ]
  },
  {
    id: 2,
    title: "Comunidade",
    description: "Conecte-se com traders de todo Brasil",
    icon: <Users className="w-12 h-12" />,
    color: "text-success",
    features: [
      "Compartilhe análises e estratégias",
      "Sistema de ranking semanal",
      "Conquistas e badges",
      "Notificações em tempo real"
    ]
  },
  {
    id: 3,
    title: "Finanças Pessoais",
    description: "Gerencie suas finanças de forma inteligente",
    icon: <DollarSign className="w-12 h-12" />,
    color: "text-warning",
    features: [
      "Controle completo de receitas e despesas",
      "Múltiplas contas e carteiras",
      "Metas financeiras personalizadas",
      "Relatórios e gráficos detalhados"
    ]
  },
  {
    id: 4,
    title: "Operações",
    description: "Registre e analise todas suas operações",
    icon: <BarChart3 className="w-12 h-12" />,
    color: "text-accent",
    features: [
      "Registro detalhado de trades",
      "Análise por ativo e estratégia",
      "Histórico completo",
      "Metas e objetivos de trading"
    ]
  }
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
  const step = onboardingSteps[currentStep];

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = () => {
    localStorage.setItem("onboarding_completed", "true");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="w-full max-w-4xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            <h1 className="text-4xl font-bold text-foreground">Bem-vindo ao Zeve!</h1>
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground text-lg">
            Conheça as principais funcionalidades da plataforma
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex justify-between mb-2 text-sm text-muted-foreground">
            <span>Progresso</span>
            <span>{currentStep + 1} de {onboardingSteps.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Main Card */}
        <Card className="mb-8 border-2 shadow-xl animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              {/* Icon */}
              <div className={`flex-shrink-0 w-24 h-24 rounded-2xl bg-muted/50 flex items-center justify-center ${step.color}`}>
                {step.icon}
              </div>

              {/* Content */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold text-foreground mb-3">
                  {step.title}
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  {step.description}
                </p>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {step.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-left animate-fade-in"
                      style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                    >
                      <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/90">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <Button
            variant="outline"
            onClick={handleSkip}
            className="h-12 px-6"
          >
            Pular Tour
          </Button>

          <div className="flex gap-2">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? "w-8 bg-primary"
                    : index < currentStep
                    ? "w-2 bg-primary/50"
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            className="h-12 px-6 gap-2"
          >
            {currentStep === onboardingSteps.length - 1 ? (
              "Começar"
            ) : (
              <>
                Próximo
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
