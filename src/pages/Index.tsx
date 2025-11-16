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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(210 56% 25%) 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Minimal Decorative Elements */}
      <div className="absolute top-32 right-20 w-80 h-80 opacity-[0.04]">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          <polyline
            fill="none"
            stroke="hsl(210 56% 25%)"
            strokeWidth="2"
            points="0,80 40,60 80,40 120,50 160,20 200,30"
          />
        </svg>
      </div>

      {/* Hero Section */}
      <div className="container relative z-10 mx-auto px-6 py-20 md:py-28">
        <div className="text-center max-w-6xl mx-auto">
          <Badge className="mb-8 px-6 py-2.5 text-sm bg-secondary/80 text-foreground border-border hover:bg-secondary transition-all" variant="outline">
            <TrendingUp className="w-4 h-4 mr-2" />
            Plataforma de Monitoramento Avançado
          </Badge>
          
          <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-semibold text-foreground mb-8 leading-[1.1] tracking-tight">
            Acompanhe seus robôs
            <span className="block text-primary mt-3">
              como nunca antes
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-14 max-w-3xl mx-auto leading-relaxed font-light">
            A forma mais avançada e intuitiva de monitorar seus robôs de trading. 
            Visualize performance em tempo real com clareza e elegância.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center mb-28">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-3 text-base px-10 py-6 rounded-[10px] shadow-[0px_4px_14px_rgba(0,0,0,0.06)] hover:opacity-85 transition-all font-semibold">
              <Shield className="w-5 h-5" />
              Começar Gratuitamente
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-base px-10 py-6 rounded-[10px] border-[1.5px] hover:bg-secondary/50 transition-all font-semibold">
              Ver Demonstração
            </Button>
          </div>

          {/* Stats Bar - Minimalist */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto mb-28">
            {[
              { value: "10K+", label: "Operações" },
              { value: "500+", label: "Clientes" },
              { value: "99.9%", label: "Uptime" },
              { value: "24/7", label: "Suporte" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-semibold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Features Grid - Clean Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32">
            <Card className="border border-border hover:shadow-[0px_4px_14px_rgba(0,0,0,0.06)] transition-all duration-300 rounded-[12px] bg-card">
              <CardHeader className="pb-6 pt-8">
                <div className="w-14 h-14 rounded-[10px] bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Activity className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-xl font-semibold mb-3">Tempo Real</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                  Visualize todas as operações instantaneamente com atualizações ao vivo
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-border hover:shadow-[0px_4px_14px_rgba(0,0,0,0.06)] transition-all duration-300 rounded-[12px] bg-card">
              <CardHeader className="pb-6 pt-8">
                <div className="w-14 h-14 rounded-[10px] bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-xl font-semibold mb-3">Análise Avançada</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                  Gráficos interativos e métricas detalhadas para decisões estratégicas
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-border hover:shadow-[0px_4px_14px_rgba(0,0,0,0.06)] transition-all duration-300 rounded-[12px] bg-card">
              <CardHeader className="pb-6 pt-8">
                <div className="w-14 h-14 rounded-[10px] bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-xl font-semibold mb-3">Interface Limpa</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                  Dashboard minimalista com foco nas informações essenciais
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Additional Features - Clean Layout */}
      <div className="container relative z-10 mx-auto px-6 py-24 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold text-foreground mb-4 tracking-tight">
              Recursos essenciais
            </h2>
            <p className="text-lg text-muted-foreground font-light">
              Tudo que você precisa, nada que você não precisa
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: LineChart, title: "Gráficos Interativos", desc: "Visualize tendências com clareza" },
              { icon: Target, title: "Métricas de Desempenho", desc: "Acompanhe KPIs importantes" },
              { icon: Bell, title: "Alertas Inteligentes", desc: "Notificações em tempo real" },
              { icon: Shield, title: "Segurança Avançada", desc: "Dados protegidos com criptografia" }
            ].map((feature, index) => (
              <div key={index} className="flex gap-5 p-6 rounded-[12px] bg-card border border-border hover:shadow-[0px_4px_14px_rgba(0,0,0,0.06)] transition-all">
                <div className="w-11 h-11 rounded-[8px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1.5">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm font-light">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section - Minimalist */}
      <div className="container relative z-10 mx-auto px-6 py-24 border-t border-border/50">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-semibold text-foreground mb-5 tracking-tight">
            Escolha seu plano
          </h2>
          <p className="text-lg text-muted-foreground font-light">
            Flexibilidade para suas necessidades
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Plano Gratuito com Assessoria */}
          <Card className="border-[1.5px] border-primary/30 hover:shadow-[0px_4px_14px_rgba(0,0,0,0.06)] transition-all duration-300 relative overflow-hidden rounded-[12px] bg-card">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-5 py-1.5 text-xs font-semibold rounded-bl-[10px]">
              Recomendado
            </div>
            <CardHeader className="text-center pb-8 pt-10">
              <CardTitle className="text-2xl font-semibold mb-4">Plano com Assessoria</CardTitle>
              <div className="flex items-baseline justify-center gap-2 mb-5">
                <span className="text-5xl font-semibold text-foreground">Gratuito</span>
              </div>
              <CardDescription className="text-base font-light">
                Acesso completo com suporte especializado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-8">
              {[
                "Monitoramento completo de robôs",
                "Análise avançada de performance",
                "Suporte prioritário da Zeve",
                "Atualizações em tempo real",
                "Relatórios personalizados",
                "Alertas ilimitados"
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
              <Button className="w-full mt-7 py-5 rounded-[10px] font-semibold" size="lg" onClick={() => navigate("/auth")}>
                Começar Gratuitamente
              </Button>
            </CardContent>
          </Card>

          {/* Plano Independente */}
          <Card className="border border-border hover:shadow-[0px_4px_14px_rgba(0,0,0,0.06)] transition-all duration-300 rounded-[12px] bg-card">
            <CardHeader className="text-center pb-8 pt-10">
              <CardTitle className="text-2xl font-semibold mb-4">Plano Independente</CardTitle>
              <div className="flex items-baseline justify-center gap-2 mb-5">
                <span className="text-5xl font-semibold text-foreground">R$ 199,90</span>
                <span className="text-base text-muted-foreground">/mês</span>
              </div>
              <CardDescription className="text-base font-light">
                Para quem prefere autonomia total
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-8">
              {[
                "Monitoramento completo de robôs",
                "Análise avançada de performance",
                "Atualizações em tempo real",
                "Relatórios personalizados",
                "Alertas ilimitados"
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
              <div className="flex items-start gap-3">
                <X className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Sem suporte de assessoria</span>
              </div>
              <Button className="w-full mt-7 py-5 rounded-[10px] font-semibold" size="lg" variant="outline" onClick={() => navigate("/auth")}>
                Assinar Agora
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer - Minimal */}
      <footer className="relative z-10 border-t border-border/50 bg-secondary/30 mt-24">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Zeve Hub
            </h3>
            <p className="text-sm text-muted-foreground font-light">
              Monitoramento avançado de trading
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2024 Zeve Assessoria. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
