import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Shield, Activity, BarChart3, Zap, CheckCircle2, X, LineChart, Target, Bell } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 relative overflow-hidden">
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(at_40%_20%,hsl(205_100%_85%)_0px,transparent_50%),radial-gradient(at_80%_0%,hsl(200_100%_88%)_0px,transparent_50%),radial-gradient(at_0%_50%,hsl(210_100%_90%)_0px,transparent_50%)] opacity-60" />
      
      {/* Floating Chart Elements */}
      <div className="absolute top-20 right-10 w-64 h-64 opacity-10">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          <polyline
            fill="none"
            stroke="hsl(205 100% 50%)"
            strokeWidth="3"
            points="0,80 40,60 80,40 120,50 160,20 200,30"
          />
        </svg>
      </div>
      
      <div className="absolute bottom-20 left-10 w-56 h-56 opacity-10">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(200 100% 60%)" strokeWidth="3" strokeDasharray="10,5" />
          <circle cx="100" cy="100" r="50" fill="none" stroke="hsl(205 100% 50%)" strokeWidth="2" />
        </svg>
      </div>

      {/* Hero Section */}
      <div className="container relative z-10 mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-6xl mx-auto animate-fade-in">
          <Badge className="mb-6 px-6 py-3 text-base bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" variant="outline">
            <TrendingUp className="w-4 h-4 mr-2" />
            Plataforma de Monitoramento Avançado
          </Badge>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground mb-8 leading-tight">
            Acompanhe seus robôs
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mt-2">
              como nunca antes
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed font-light">
            A forma mais avançada e intuitiva de monitorar seus robôs de trading. 
            Visualize performance em tempo real, analise resultados detalhados e tome decisões estratégicas com confiança.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-24">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-3 text-lg px-10 py-7 shadow-lg hover:shadow-xl transition-all">
              <Shield className="w-6 h-6" />
              Começar Gratuitamente
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-10 py-7 border-2 hover:bg-primary/5">
              Ver Demonstração
            </Button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-20">
            {[
              { value: "10K+", label: "Operações Monitoradas" },
              { value: "500+", label: "Clientes Ativos" },
              { value: "99.9%", label: "Tempo de Atividade" },
              { value: "24/7", label: "Suporte Disponível" }
            ].map((stat, index) => (
              <div key={index} className="text-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
            <Card className="border-2 border-primary/20 hover:shadow-2xl hover:border-primary/40 transition-all duration-500 hover:-translate-y-2 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Activity className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl mb-3">Monitoramento em Tempo Real</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Visualize todas as operações dos seus robôs instantaneamente com atualizações ao vivo e alertas personalizados
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-accent/20 hover:shadow-2xl hover:border-accent/40 transition-all duration-500 hover:-translate-y-2 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl mb-3">Análise Avançada</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Gráficos interativos, métricas de performance detalhadas e insights estratégicos para otimizar seus resultados
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-success/20 hover:shadow-2xl hover:border-success/40 transition-all duration-500 hover:-translate-y-2 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-success to-success/70 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Zap className="w-8 h-8 text-success-foreground" />
                </div>
                <CardTitle className="text-2xl mb-3">Interface Intuitiva</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Dashboard moderno e personalizado com as informações mais relevantes sempre à mão, sem complexidade
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Additional Features Section */}
      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Recursos que fazem a diferença
            </h2>
            <p className="text-lg text-muted-foreground">
              Tudo que você precisa para monitorar e otimizar suas operações
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: LineChart, title: "Gráficos Interativos", desc: "Visualize tendências e padrões com gráficos dinâmicos e personalizáveis" },
              { icon: Target, title: "Métricas de Desempenho", desc: "Acompanhe KPIs importantes e alcance suas metas de trading" },
              { icon: Bell, title: "Alertas Inteligentes", desc: "Receba notificações sobre eventos importantes em tempo real" },
              { icon: Shield, title: "Segurança Avançada", desc: "Seus dados protegidos com criptografia de ponta a ponta" }
            ].map((feature, index) => (
              <div key={index} className="flex gap-4 p-6 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="container relative z-10 mx-auto px-4 py-24">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Escolha seu plano
          </h2>
          <p className="text-xl text-muted-foreground">
            Flexibilidade para atender suas necessidades de monitoramento
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
          {/* Plano Gratuito com Assessoria */}
          <Card className="border-2 border-primary/30 hover:shadow-2xl transition-all duration-300 relative overflow-hidden bg-card/90 backdrop-blur-sm">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-2 text-sm font-semibold rounded-bl-xl shadow-lg">
              Recomendado
            </div>
            <CardHeader className="text-center pb-10 pt-12">
              <CardTitle className="text-3xl mb-4">Plano com Assessoria</CardTitle>
              <div className="flex items-baseline justify-center gap-2 mb-6">
                <span className="text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Gratuito</span>
              </div>
              <CardDescription className="text-lg">
                Acesso completo com suporte da nossa assessoria especializada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pb-10">
              {[
                "Monitoramento completo de robôs",
                "Análise avançada de performance",
                "Suporte prioritário da Zeve Assessoria",
                "Atualizações em tempo real",
                "Relatórios personalizados",
                "Alertas inteligentes ilimitados"
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-base">{feature}</span>
                </div>
              ))}
              <Button className="w-full mt-8 py-6 text-lg shadow-lg" size="lg" onClick={() => navigate("/auth")}>
                Começar Gratuitamente
              </Button>
            </CardContent>
          </Card>

          {/* Plano Independente */}
          <Card className="border-2 border-border hover:shadow-2xl transition-all duration-300 bg-card/90 backdrop-blur-sm">
            <CardHeader className="text-center pb-10 pt-12">
              <CardTitle className="text-3xl mb-4">Plano Independente</CardTitle>
              <div className="flex items-baseline justify-center gap-3 mb-6">
                <span className="text-6xl font-bold text-foreground">R$ 199,90</span>
                <span className="text-xl text-muted-foreground">/mês</span>
              </div>
              <CardDescription className="text-lg">
                Para quem prefere autonomia total no monitoramento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pb-10">
              {[
                "Monitoramento completo de robôs",
                "Análise avançada de performance",
                "Atualizações em tempo real",
                "Relatórios personalizados",
                "Alertas inteligentes ilimitados"
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-base">{feature}</span>
                </div>
              ))}
              <div className="flex items-start gap-4">
                <X className="w-6 h-6 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-base text-muted-foreground">Sem suporte de assessoria</span>
              </div>
              <Button className="w-full mt-8 py-6 text-lg" size="lg" variant="outline" onClick={() => navigate("/auth")}>
                Assinar Agora
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-card/40 backdrop-blur-md mt-24">
        <div className="container mx-auto px-4 py-10 text-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Zeve Hub
            </h3>
            <p className="text-muted-foreground">
              Monitoramento avançado de trading
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Zeve Assessoria. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
