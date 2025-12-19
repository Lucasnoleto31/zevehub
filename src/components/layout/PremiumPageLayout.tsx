import { ReactNode, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";

interface PremiumPageLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  showBackButton?: boolean;
  backTo?: string;
  headerActions?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
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

export function PremiumPageLayout({
  children,
  title,
  subtitle,
  icon: Icon,
  showBackButton = true,
  backTo = "/dashboard",
  headerActions,
  maxWidth = "2xl",
}: PremiumPageLayoutProps) {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePosition({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-7xl",
    full: "max-w-full",
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
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
      <div className="fixed bottom-20 right-20 w-[400px] h-[400px] bg-accent/8 rounded-full blur-[130px] animate-pulse pointer-events-none" style={{ animationDelay: "2s" }} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-success/5 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: "4s" }} />

      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(backTo)}
                  className="gap-2 hover:bg-primary/10 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Voltar</span>
                </Button>
              )}
              <div className="flex items-center gap-3">
                {Icon && (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                    <Icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-foreground">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {headerActions}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 lg:px-6 py-8 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={`${maxWidthClasses[maxWidth]} mx-auto space-y-6`}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

export function PremiumCard({
  children,
  className = "",
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "gradient" | "glow";
}) {
  const variantClasses = {
    default: "bg-card/60 backdrop-blur-sm border-border/50",
    gradient: "bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-border/50",
    glow: "bg-card/60 backdrop-blur-sm border-primary/20 shadow-lg shadow-primary/5",
  };

  return (
    <motion.div
      variants={itemVariants}
      className={`rounded-2xl border p-6 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function PremiumSection({
  children,
  title,
  subtitle,
  icon: Icon,
  actions,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <motion.div variants={itemVariants} className="space-y-4">
      {(title || actions) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </motion.div>
  );
}

export function PremiumLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-primary/20 rounded-full" />
        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-transparent border-t-primary rounded-full animate-spin" />
      </div>
    </div>
  );
}

export { itemVariants, containerVariants };
