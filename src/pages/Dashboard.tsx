import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  LogOut,
  TrendingUp,
  Bot,
  Trophy,
  History,
  Wrench,
  User as UserIcon,
  Shield,
  Settings,
  ArrowRight,
  LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import menuRobos from "@/assets/menu-robos.jpg";
import menuRanking from "@/assets/menu-ranking.jpg";
import menuHistorico from "@/assets/menu-historico.jpg";
import menuFerramentas from "@/assets/menu-ferramentas.jpg";
import menuPerfil from "@/assets/menu-perfil.jpg";
import menuConfiguracoes from "@/assets/menu-configuracoes.jpg";

interface MenuItem {
  title: string;
  icon: LucideIcon;
  description: string;
  image: string;
}

const menuItems: MenuItem[] = [
  { title: "Robôs", icon: Bot, description: "Gerencie seus robôs de trading", image: menuRobos },
  { title: "Ranking", icon: Trophy, description: "Veja o ranking de performance", image: menuRanking },
  { title: "Histórico", icon: History, description: "Acesse seu histórico de operações", image: menuHistorico },
  { title: "Ferramentas", icon: Wrench, description: "Ferramentas e utilidades", image: menuFerramentas },
  { title: "Perfil", icon: UserIcon, description: "Seu perfil e informações", image: menuPerfil },
  { title: "Configurações", icon: Settings, description: "Ajustes e preferências", image: menuConfiguracoes },
];

const MenuCard = ({ item, index }: { item: MenuItem; index: number }) => {
  const [cardRef, setCardRef] = useState<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState("");

  useEffect(() => {
    if (!cardRef) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = cardRef.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;
      
      const rotateY = (mouseX / rect.width) * 15;
      const rotateX = -(mouseY / rect.height) * 15;
      
      setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-12px) scale(1.02)`);
    };

    const handleMouseLeave = () => {
      setTransform("");
    };

    cardRef.addEventListener('mousemove', handleMouseMove);
    cardRef.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cardRef.removeEventListener('mousemove', handleMouseMove);
      cardRef.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [cardRef]);

  return (
    <div
      className="card-3d-wrapper"
      style={{ 
        animationDelay: `${index * 0.1}s`,
      }}
    >
      <Card 
        ref={setCardRef}
        className="card-3d group overflow-hidden border-0 shadow-lg cursor-pointer bg-card relative"
        style={{
          transform: transform,
          transition: transform ? 'none' : 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div className="card-glow-effect" />
        <CardContent className="p-0 relative z-10">
          <div className="relative h-48 overflow-hidden">
            <img 
              src={item.image} 
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
            <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/30 group-hover:bg-primary group-hover:shadow-glow transition-all duration-500">
              <item.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors duration-500 group-hover:scale-110" />
            </div>
          </div>
          
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                {item.title}
              </h3>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-all duration-300" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.description}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Buscar perfil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      // Buscar roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (rolesData) {
        setRoles(rolesData.map((r) => r.role));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/auth");
  };

  const isAdmin = roles.includes("admin");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const menuItems = [
    { title: "Robôs", icon: Bot, description: "Gerencie seus robôs de trading", image: menuRobos },
    { title: "Ranking", icon: Trophy, description: "Veja o ranking de performance", image: menuRanking },
    { title: "Histórico", icon: History, description: "Acesse seu histórico de operações", image: menuHistorico },
    { title: "Ferramentas", icon: Wrench, description: "Ferramentas e utilidades", image: menuFerramentas },
    { title: "Perfil", icon: UserIcon, description: "Seu perfil e informações", image: menuPerfil },
    { title: "Configurações", icon: Settings, description: "Ajustes e preferências", image: menuConfiguracoes },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="particle particle-1" />
        <div className="particle particle-2" />
        <div className="particle particle-3" />
        <div className="particle particle-4" />
        <div className="particle particle-5" />
        <div className="particle particle-6" />
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />
        <div className="glow-orb glow-orb-3" />
      </div>

      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Portal Zeve</h1>
                <p className="text-xs text-muted-foreground">Gestão e Performance</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <Card className="gradient-card border-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-primary/20">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
                    {profile?.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    Bem-vindo, {profile?.full_name || "Cliente"}!
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="gap-1">
                      <UserIcon className="w-3 h-3" />
                      {profile?.email}
                    </Badge>
                    {roles.map((role) => (
                      <Badge key={role} variant="secondary" className="gap-1">
                        <Shield className="w-3 h-3" />
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
          {menuItems.map((item, index) => (
            <MenuCard key={item.title} item={item} index={index} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
