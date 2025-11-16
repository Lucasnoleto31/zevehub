import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Shield, Activity, BarChart3, Zap, CheckCircle2, X } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-5xl mx-auto animate-fade-in">
          <Badge className="mb-6 px-4 py-2 text-sm" variant="outline">
            🚀 Monitoramento Avançado de Trading
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
            Acompanhe seus robôs como
            <span className="bg-gradient-primary bg-clip-text text-transparent"> nunca antes</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            O Zeve Hub é a plataforma mais avançada de acompanhamento de robôs de trading. 
            Monitore performance, analise resultados e tome decisões estratégicas em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2 text-lg px-8 py-6">
              <Shield className="w-5 h-5" />
              Começar Agora
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-8 py-6">
              Fazer Login
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-7 h-7 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl">Monitoramento em Tempo Real</CardTitle>
                <CardDescription className="text-base">
                  Visualize todas as operações dos seus robôs ao vivo com atualização instantânea
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-success to-success/70 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl">Análise Avançada</CardTitle>
                <CardDescription className="text-base">
                  Gráficos detalhados, métricas de performance e insights estratégicos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl">Interface Intuitiva</CardTitle>
                <CardDescription className="text-base">
                  Dashboard personalizado com as informações mais relevantes para você
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Escolha seu plano
          </h2>
          <p className="text-lg text-muted-foreground">
            Opções flexíveis para atender suas necessidades
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Plano Gratuito */}
          <Card className="border-2 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-success text-white px-4 py-1 text-sm font-semibold">
              Recomendado
            </div>
            <CardHeader className="text-center pb-8 pt-10">
              <CardTitle className="text-2xl mb-2">Plano com Assessoria</CardTitle>
              <div className="flex items-baseline justify-center gap-2 mb-4">
                <span className="text-5xl font-bold text-foreground">Gratuito</span>
              </div>
              <CardDescription className="text-base">
                Acesso completo com suporte da nossa assessoria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-sm">Monitoramento completo de robôs</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-sm">Análise avançada de performance</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-sm">Suporte da Zeve Assessoria</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-sm">Atualizações em tempo real</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-sm">Relatórios personalizados</span>
              </div>
              <Button className="w-full mt-6" size="lg" onClick={() => navigate("/auth")}>
                Começar Gratuitamente
              </Button>
            </CardContent>
          </Card>

          {/* Plano Pago */}
          <Card className="border-2 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="text-center pb-8 pt-10">
              <CardTitle className="text-2xl mb-2">Plano Independente</CardTitle>
              <div className="flex items-baseline justify-center gap-2 mb-4">
                <span className="text-5xl font-bold text-foreground">R$ 199,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <CardDescription className="text-base">
                Para quem prefere autonomia total
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-sm">Monitoramento completo de robôs</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-sm">Análise avançada de performance</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-sm">Atualizações em tempo real</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-sm">Relatórios personalizados</span>
              </div>
              <div className="flex items-start gap-3">
                <X className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Sem suporte de assessoria</span>
              </div>
              <Button className="w-full mt-6" size="lg" variant="outline" onClick={() => navigate("/auth")}>
                Assinar Agora
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-md mt-20">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Zeve Assessoria. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
