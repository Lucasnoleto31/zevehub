import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, Rocket, Activity, BarChart3, Users, Clock, CheckCircle2, X, Star, Quote } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useParallax } from "@/hooks/useParallax";

const Index = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  
  // Parallax effects
  const parallaxOffset = useParallax(0.3);
  
  // Scroll animation hooks for different sections
  const heroAnimation = useScrollAnimation({ threshold: 0.2 });
  const statsAnimation = useScrollAnimation({ threshold: 0.2 });
  const featuresAnimation = useScrollAnimation({ threshold: 0.1 });
  const testimonialsAnimation = useScrollAnimation({ threshold: 0.1 });
  const pricingAnimation = useScrollAnimation({ threshold: 0.1 });

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

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Navbar theme={theme} onThemeToggle={toggleTheme} />
      
      {/* Parallax Background Elements */}
      <div 
        className="absolute top-40 right-20 w-80 h-80 opacity-[0.08] pointer-events-none"
        style={{ transform: `translateY(${parallaxOffset}px)` }}
      >
        <svg viewBox="0 0 200 100" className="w-full h-full">
          <polyline
            fill="none"
            stroke="hsl(217 91% 60%)"
            strokeWidth="2"
            points="0,80 40,60 80,40 120,50 160,20 200,30"
          />
        </svg>
      </div>
      
      <div 
        className="absolute top-[600px] left-20 w-64 h-64 opacity-[0.06] pointer-events-none"
        style={{ transform: `translateY(${parallaxOffset * 1.5}px)` }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(217 91% 60%)" strokeWidth="2" strokeDasharray="10,5" />
          <circle cx="100" cy="100" r="50" fill="none" stroke="hsl(217 91% 60%)" strokeWidth="1.5" />
        </svg>
      </div>
      
      {/* Hero Section */}
      <div 
        ref={heroAnimation.ref}
        className={`container relative z-10 mx-auto px-6 pt-32 pb-20 scroll-animate ${heroAnimation.isVisible ? 'visible' : ''}`}
      >
        <div className="text-center max-w-6xl mx-auto">
          <Badge className="mb-10 px-6 py-3 text-base bg-accent/80 text-accent-foreground border-accent/30 hover:bg-accent transition-all rounded-full" variant="outline">
            <Rocket className="w-4 h-4 mr-2" />
            Plataforma Oficial Zeve Investimentos
          </Badge>
          
          <h1 className="text-5xl md:text-7xl lg:text-[6rem] font-bold text-foreground mb-8 leading-[1.05] tracking-tight">
            Bem-vindo ao <span className="text-primary">Zeve Hub</span>
            <span className="ml-3">🚀</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-14 max-w-4xl mx-auto leading-relaxed">
            A central inteligente da Zeve Investimentos — acesse resultados de robôs,
            ferramentas e cursos para elevar sua performance no mercado financeiro.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center mb-24">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")} 
              className="gap-3 text-base px-10 py-7 rounded-xl font-semibold text-lg shadow-lg hover:opacity-90 transition-all"
            >
              Começar Agora
              <TrendingUp className="w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate("/dashboard")} 
              className="text-base px-10 py-7 rounded-xl border-2 hover:bg-accent/30 transition-all font-semibold text-lg"
            >
              Ver Resultados
            </Button>
          </div>

          {/* Stats Cards */}
          <div 
            ref={statsAnimation.ref}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {[
              { icon: Activity, value: "98%", label: "Taxa de Sucesso", color: "text-primary" },
              { icon: Users, value: "5k+", label: "Usuários Ativos", color: "text-primary" },
              { icon: Clock, value: "24/7", label: "Monitoramento", color: "text-primary" }
            ].map((stat, index) => (
              <Card 
                key={index} 
                className={`border border-border hover:shadow-lg transition-all duration-300 rounded-xl bg-card p-8 scroll-scale ${statsAnimation.isVisible ? 'visible' : ''} delay-${(index + 1) * 100}`}
              >
                <div className="flex flex-col items-center">
                  <div className={`text-6xl md:text-7xl font-bold ${stat.color} mb-3`}>
                    {stat.value}
                  </div>
                  <div className="text-base text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div 
        ref={featuresAnimation.ref}
        className="container relative z-10 mx-auto px-6 py-20"
      >
        <div className="max-w-5xl mx-auto">
          <div className={`text-center mb-16 scroll-animate ${featuresAnimation.isVisible ? 'visible' : ''}`}>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
              Tudo que você precisa
            </h2>
            <p className="text-lg text-muted-foreground">
              Ferramentas profissionais para elevar seus resultados
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Activity, title: "Monitoramento em Tempo Real", desc: "Acompanhe todas as operações dos seus robôs instantaneamente" },
              { icon: BarChart3, title: "Análise Avançada", desc: "Gráficos detalhados e insights estratégicos para melhor performance" },
              { icon: Users, title: "Suporte Especializado", desc: "Acesso direto à assessoria Zeve para orientações personalizadas" }
            ].map((feature, index) => (
              <Card 
                key={index}
                className={`border border-border hover:shadow-lg transition-all duration-300 rounded-xl bg-card scroll-animate ${featuresAnimation.isVisible ? 'visible' : ''} delay-${(index + 1) * 100}`}
              >
                <CardHeader className="pb-6 pt-8">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold mb-3 text-center">{feature.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-muted-foreground text-center">
                    {feature.desc}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div 
        ref={testimonialsAnimation.ref}
        className="container relative z-10 mx-auto px-6 py-24 bg-secondary/20"
      >
        <div className={`text-center mb-16 scroll-animate ${testimonialsAnimation.isVisible ? 'visible' : ''}`}>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            O que nossos clientes dizem
          </h2>
          <p className="text-lg text-muted-foreground">
            Resultados reais de quem já usa o Zeve Hub
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              name: "Carlos Silva",
              role: "Trader Profissional",
              avatar: "CS",
              rating: 5,
              text: "O Zeve Hub transformou completamente minha forma de operar. Consigo acompanhar todos os meus robôs em tempo real com uma interface limpa e intuitiva.",
              result: "+127% em 6 meses"
            },
            {
              name: "Marina Costa",
              role: "Investidora",
              avatar: "MC",
              rating: 5,
              text: "Finalmente encontrei uma plataforma que realmente entende as necessidades de quem opera com robôs. O suporte da assessoria é excepcional!",
              result: "+89% em 4 meses"
            },
            {
              name: "Ricardo Almeida",
              role: "Day Trader",
              avatar: "RA",
              rating: 5,
              text: "A análise avançada do Zeve Hub me deu insights que eu não conseguia ter antes. Minha performance melhorou significativamente.",
              result: "+156% em 8 meses"
            }
          ].map((testimonial, index) => (
            <Card 
              key={index}
              className={`border border-border hover:shadow-xl transition-all duration-300 rounded-xl bg-card relative scroll-animate ${testimonialsAnimation.isVisible ? 'visible' : ''} delay-${(index + 1) * 100}`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {testimonial.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-foreground">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                  <Quote className="w-8 h-8 text-primary/20" />
                </div>
                
                <div className="flex gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  "{testimonial.text}"
                </p>
                
                <div className="pt-4 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-1">Resultado</div>
                  <div className="text-2xl font-bold text-success">
                    {testimonial.result}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div 
        ref={pricingAnimation.ref}
        className="container relative z-10 mx-auto px-6 py-20 bg-secondary/30"
      >
        <div className={`text-center mb-16 scroll-animate ${pricingAnimation.isVisible ? 'visible' : ''}`}>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-5 tracking-tight">
            Escolha seu plano
          </h2>
          <p className="text-lg text-muted-foreground">
            Opções flexíveis para suas necessidades
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Plano Gratuito com Assessoria */}
          <Card className={`border-2 border-primary/40 hover:shadow-xl transition-all duration-300 relative overflow-hidden rounded-xl bg-card scroll-slide-left ${pricingAnimation.isVisible ? 'visible' : ''}`}>
            <div className="absolute top-0 right-0 bg-success text-success-foreground px-5 py-2 text-sm font-semibold rounded-bl-xl">
              Recomendado
            </div>
            <CardHeader className="text-center pb-8 pt-12">
              <CardTitle className="text-3xl font-bold mb-5">Com Assessoria</CardTitle>
              <div className="flex items-baseline justify-center gap-2 mb-5">
                <span className="text-6xl font-bold text-primary">Gratuito</span>
              </div>
              <CardDescription className="text-base">
                Acesso completo com suporte especializado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-10">
              {[
                "Monitoramento completo de robôs",
                "Análise avançada de performance",
                "Suporte prioritário da Zeve",
                "Atualizações em tempo real",
                "Relatórios personalizados",
                "Alertas ilimitados"
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
              <Button className="w-full mt-8 py-6 rounded-xl font-bold text-base" size="lg" onClick={() => navigate("/auth")}>
                Começar Gratuitamente
              </Button>
            </CardContent>
          </Card>

          {/* Plano Independente */}
          <Card className={`border border-border hover:shadow-xl transition-all duration-300 rounded-xl bg-card scroll-slide-right ${pricingAnimation.isVisible ? 'visible' : ''} delay-200`}>
            <CardHeader className="text-center pb-8 pt-12">
              <CardTitle className="text-3xl font-bold mb-5">Independente</CardTitle>
              <div className="flex items-baseline justify-center gap-2 mb-5">
                <span className="text-6xl font-bold text-foreground">R$ 199,90</span>
                <span className="text-lg text-muted-foreground">/mês</span>
              </div>
              <CardDescription className="text-base">
                Autonomia total no monitoramento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-10">
              {[
                "Monitoramento completo de robôs",
                "Análise avançada de performance",
                "Atualizações em tempo real",
                "Relatórios personalizados",
                "Alertas ilimitados"
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
              <div className="flex items-start gap-3">
                <X className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground font-medium">Sem suporte de assessoria</span>
              </div>
              <Button className="w-full mt-8 py-6 rounded-xl font-bold text-base" size="lg" variant="outline" onClick={() => navigate("/auth")}>
                Assinar Agora
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-card">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-foreground mb-2">
              Zeve Hub
            </h3>
            <p className="text-sm text-muted-foreground">
              Plataforma inteligente de monitoramento
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2024 Zeve Investimentos. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
