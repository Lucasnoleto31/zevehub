import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface NavbarProps {
  theme?: "light" | "dark";
  onThemeToggle?: () => void;
}

export const Navbar = ({ theme = "light", onThemeToggle }: NavbarProps) => {
  const navigate = useNavigate();

  const navLinks = [
    { label: "Início", href: "/" },
    { label: "Resultados dos Robôs", href: "/dashboard" },
    { label: "Cursos & Treinamentos", href: "#cursos" },
    { label: "Ferramentas", href: "#ferramentas" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">Z</span>
            </div>
            <span className="text-xl font-semibold text-foreground">Zeve Hub</span>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={onThemeToggle}
              className="w-10 h-10 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors"
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Sun className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            
            <Button
              variant="outline"
              onClick={() => navigate("/auth")}
              className="rounded-lg font-semibold border-[1.5px]"
            >
              Criar Conta
            </Button>
            
            <Button
              onClick={() => navigate("/auth")}
              className="rounded-lg font-semibold"
            >
              Entrar
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
