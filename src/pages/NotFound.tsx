import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, Search, ArrowLeft, HelpCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const popularPages = [
    {
      title: "Dashboard",
      description: "Acesse seu painel de controle",
      icon: TrendingUp,
      path: "/dashboard"
    },
    {
      title: "Operações",
      description: "Gerencie suas operações",
      icon: Search,
      path: "/operations"
    },
    {
      title: "Início",
      description: "Voltar para página inicial",
      icon: Home,
      path: "/"
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="w-full max-w-4xl relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-primary/10 mb-6">
            <HelpCircle className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
          <h2 className="text-3xl font-semibold text-foreground mb-2">
            Página não encontrada
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Desculpe, a página que você está procurando não existe ou foi movida.
          </p>
          {location.pathname && (
            <p className="text-sm text-muted-foreground mt-2 font-mono">
              Caminho tentado: <span className="text-destructive">{location.pathname}</span>
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {popularPages.map((page, index) => (
            <Card 
              key={index}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 hover:border-primary/50"
              onClick={() => navigate(page.path)}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <page.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{page.title}</CardTitle>
                <CardDescription className="text-sm">
                  {page.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg"
            onClick={() => navigate(-1)}
            variant="outline"
            className="min-w-[200px]"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Voltar
          </Button>
          <Button 
            size="lg"
            onClick={() => navigate("/")}
            className="min-w-[200px]"
          >
            <Home className="mr-2 h-5 w-5" />
            Ir para Início
          </Button>
        </div>

        <div className="mt-12 text-center">
          <Card className="inline-block">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Precisa de ajuda? Entre em contato com nosso{" "}
                <a href="/auth" className="text-primary hover:underline font-medium">
                  suporte técnico
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
