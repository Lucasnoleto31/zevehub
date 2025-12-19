import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Home, Search, ArrowLeft, HelpCircle, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePosition({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Dynamic gradient background */}
      <div
        className="fixed inset-0 opacity-40 pointer-events-none transition-transform duration-1000 ease-out"
        style={{
          background: `radial-gradient(circle at ${50 + mousePosition.x}% ${50 + mousePosition.y}%, hsl(var(--primary) / 0.12), transparent 50%)`,
        }}
      />

      {/* Background pattern */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Ambient orbs */}
      <div className="fixed top-20 left-20 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px] animate-pulse pointer-events-none" />
      <div className="fixed bottom-20 right-20 w-[400px] h-[400px] bg-destructive/8 rounded-full blur-[130px] animate-pulse pointer-events-none" style={{ animationDelay: "2s" }} />
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-4xl relative z-10"
      >
        <motion.div variants={itemVariants} className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-32 h-32 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 backdrop-blur-sm mb-6"
          >
            <HelpCircle className="w-16 h-16 text-primary" />
          </motion.div>
          <h1 className="text-8xl font-bold bg-gradient-to-r from-foreground via-foreground/70 to-foreground bg-clip-text text-transparent mb-4">
            404
          </h1>
          <h2 className="text-3xl font-semibold text-foreground mb-3">
            Página não encontrada
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
            Desculpe, a página que você está procurando não existe ou foi movida.
          </p>
          {location.pathname && (
            <p className="text-sm text-muted-foreground mt-3 font-mono bg-muted/30 inline-block px-4 py-2 rounded-full">
              Caminho: <span className="text-destructive">{location.pathname}</span>
            </p>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-4 mb-10">
          {popularPages.map((page, index) => (
            <Card 
              key={index}
              className="cursor-pointer bg-card/60 backdrop-blur-sm border-border/50 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:scale-105 group"
              onClick={() => navigate(page.path)}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-3 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                  <page.icon className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-lg">{page.title}</CardTitle>
                <CardDescription className="text-sm">
                  {page.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg"
            onClick={() => navigate(-1)}
            variant="outline"
            className="min-w-[200px] h-14 rounded-xl border-border/50 hover:bg-muted/50 font-semibold"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Voltar
          </Button>
          <Button 
            size="lg"
            onClick={() => navigate("/")}
            className="min-w-[200px] h-14 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 font-semibold"
          >
            <Home className="mr-2 h-5 w-5" />
            Ir para Início
          </Button>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-card/60 backdrop-blur-sm border border-border/50">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              Precisa de ajuda? Entre em contato com nosso{" "}
              <a href="/auth" className="text-primary hover:underline font-medium">
                suporte técnico
              </a>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
