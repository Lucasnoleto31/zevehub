import { Moon, Sun, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface NavbarProps {
  theme?: "light" | "dark";
  onThemeToggle?: () => void;
}

export const Navbar = ({ theme = "light", onThemeToggle }: NavbarProps) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">Z</span>
            </div>
            <span className="text-xl font-semibold text-foreground">Zeve Hub</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Início
            </a>
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
              className="hidden md:flex rounded-lg font-semibold border-[1.5px]"
            >
              Criar Conta
            </Button>
            
            <Button
              onClick={() => navigate("/auth")}
              className="hidden md:flex rounded-lg font-semibold"
            >
              Entrar
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-10 h-10 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-foreground" />
              ) : (
                <Menu className="w-5 h-5 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="py-6 space-y-4 border-t border-border">
            <a
              href="/"
              className="block text-base text-muted-foreground hover:text-foreground transition-colors font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Início
            </a>
            
            <div className="pt-4 space-y-3">
              <Button
                variant="outline"
                onClick={() => {
                  navigate("/auth");
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-lg font-semibold border-[1.5px]"
              >
                Criar Conta
              </Button>
              
              <Button
                onClick={() => {
                  navigate("/auth");
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-lg font-semibold"
              >
                Entrar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
