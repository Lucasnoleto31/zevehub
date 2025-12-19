import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Shield, TrendingUp, Clock, MessageSquare, ArrowRight, Sparkles, Lock, Mail, User, Phone, CreditCard, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import * as OTPAuth from "otpauth";
import { TwoFactorVerification } from "@/components/auth/TwoFactorVerification";
import { motion } from "framer-motion";

const tradingQuotes = [
  "O sucesso no trading começa com disciplina e análise",
  "Gerenciamento de risco é a chave para longevidade no mercado",
  "Traders vencedores controlam suas emoções, não o mercado",
  "Consistência supera operações isoladas de sucesso",
  "O mercado recompensa paciência e preparação"
];

const signUpSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
  fullName: z.string().min(3, { message: "Nome deve ter no mínimo 3 caracteres" }),
  phone: z.string().min(10, { message: "Telefone deve ter no mínimo 10 dígitos" }).regex(/^\d+$/, { message: "Telefone deve conter apenas números" }),
  cpf: z.string().min(11, { message: "CPF deve ter 11 dígitos" }).max(11, { message: "CPF deve ter 11 dígitos" }).regex(/^\d+$/, { message: "CPF deve conter apenas números" }),
  hasGenialAccount: z.boolean(),
  genialId: z.string().optional(),
  acceptTerms: z.boolean().refine((val) => val === true, { message: "Você deve aceitar os termos de uso" }),
});

const signInSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  password: z.string().min(1, { message: "Senha obrigatória" }),
});

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
});

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

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [signUpData, setSignUpData] = useState({ 
    email: "", 
    password: "", 
    fullName: "", 
    phone: "", 
    cpf: "",
    hasGenialAccount: false,
    genialId: "",
    acceptTerms: false 
  });
  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [resetEmail, setResetEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [showPendingMessage, setShowPendingMessage] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePosition({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Rotate trading quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % tradingQuotes.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  const validateField = (fieldName: string, value: any, schema: z.ZodSchema) => {
    const result = schema.safeParse({ [fieldName]: value });
    if (!result.success) {
      const error = result.error.errors.find(e => e.path[0] === fieldName);
      if (error) {
        setFieldErrors(prev => ({ ...prev, [fieldName]: error.message }));
        return false;
      }
    }
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = signUpSchema.parse(signUpData);

      const { data, error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: validatedData.fullName,
            phone: validatedData.phone,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        await supabase.from("profiles").update({
          phone: validatedData.phone,
          cpf: validatedData.cpf,
          has_genial_account: validatedData.hasGenialAccount,
          genial_id: validatedData.genialId || null,
          access_status: "pendente",
        }).eq("id", data.user.id);

        if (data.user.identities && data.user.identities.length === 0) {
          setShowEmailConfirmation(true);
        } else {
          setShowPendingMessage(true);
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Erro ao criar conta");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || `Erro ao fazer login com ${provider}`);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = resetPasswordSchema.parse({ email: resetEmail });

      const { error } = await supabase.auth.resetPasswordForEmail(validatedData.email, {
        redirectTo: `${window.location.origin}/dashboard`,
      });

      if (error) throw error;

      toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
      setResetEmail("");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Erro ao enviar e-mail de recuperação");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = signInSchema.parse(signInData);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) throw error;

      if (data.session) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("totp_enabled, totp_secret")
          .eq("id", data.user.id)
          .single();

        if (profileData?.totp_enabled && profileData?.totp_secret) {
          setPendingUserId(data.user.id);
          setTotpSecret(profileData.totp_secret);
          setShow2FADialog(true);
          setLoading(false);
          return;
        }

        const accessLogData = {
          user_id: data.user.id,
          ip_address: "client-side",
          user_agent: navigator.userAgent,
          device_info: navigator.platform,
        };
        
        await supabase.from("access_logs").insert(accessLogData);

        try {
          await supabase.functions.invoke("check-new-device", {
            body: accessLogData,
          });
        } catch (error) {
          console.error("Error checking new device:", error);
        }

        toast.success("Login realizado com sucesso!");
        
        const hasCompletedOnboarding = localStorage.getItem("onboarding_completed");
        if (!hasCompletedOnboarding) {
          navigate("/onboarding");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Erro ao fazer login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerification = async (code: string): Promise<boolean> => {
    if (!totpSecret || !pendingUserId) return false;

    try {
      const totp = new OTPAuth.TOTP({
        secret: totpSecret,
        digits: 6,
        period: 30,
      });

      const isValid = totp.validate({ token: code, window: 1 }) !== null;

      if (isValid) {
        const accessLogData = {
          user_id: pendingUserId,
          ip_address: "client-side",
          user_agent: navigator.userAgent,
          device_info: navigator.platform,
        };
        
        await supabase.from("access_logs").insert(accessLogData);

        try {
          await supabase.functions.invoke("check-new-device", {
            body: accessLogData,
          });
        } catch (error) {
          console.error("Error checking new device:", error);
        }

        toast.success("Autenticação 2FA bem-sucedida!");
        setShow2FADialog(false);
        
        const hasCompletedOnboarding = localStorage.getItem("onboarding_completed");
        if (!hasCompletedOnboarding) {
          navigate("/onboarding");
        } else {
          navigate("/dashboard");
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error("Erro ao verificar 2FA:", error);
      return false;
    }
  };

  const handle2FACancel = async () => {
    setShow2FADialog(false);
    setPendingUserId(null);
    setTotpSecret(null);
    await supabase.auth.signOut();
    toast.info("Login cancelado");
  };

  // Pending Message Screen
  if (showPendingMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-warning/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10 p-8"
        >
          <div className="text-center space-y-6">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center border border-warning/20 backdrop-blur-sm"
            >
              <Clock className="w-12 h-12 text-warning" />
            </motion.div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Cadastro Realizado!
              </h1>
              <p className="text-muted-foreground">
                Seu cadastro está em análise por um administrador da Zeve.
              </p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-border/50 space-y-3">
              <p className="text-sm text-foreground/80">
                Você receberá uma notificação assim que seu acesso for liberado.
              </p>
              <p className="text-sm text-muted-foreground">
                Enquanto isso, você pode acessar o sistema com funcionalidades limitadas.
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Button 
                className="w-full h-14 gap-3 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
                onClick={() => navigate("/dashboard")}
              >
                <TrendingUp className="w-5 h-5" />
                Ir para o Portal
                <ArrowRight className="w-5 h-5" />
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full h-14 gap-3 text-base border-border/50 hover:bg-muted/50"
                onClick={() => window.open("https://wa.me/5562981114546?text=Olá! Acabei de me cadastrar no Zeve Hub e gostaria de informações sobre a aprovação do meu acesso.", "_blank")}
              >
                <MessageSquare className="w-5 h-5" />
                Falar com meu assessor
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Email Confirmation Screen
  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10 p-8"
        >
          <div className="text-center space-y-6">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 backdrop-blur-sm"
            >
              <Mail className="w-12 h-12 text-primary" />
            </motion.div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Verifique seu e-mail
              </h1>
              <p className="text-muted-foreground">
                Enviamos um link de confirmação para
              </p>
              <p className="text-primary font-semibold">{signUpData.email}</p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-border/50 space-y-3">
              <p className="text-sm text-foreground/80">
                Por favor, verifique sua caixa de entrada e clique no link de confirmação para ativar sua conta.
              </p>
              <p className="text-sm text-muted-foreground">
                Não se esqueça de verificar a pasta de spam!
              </p>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-14 text-base border-border/50 hover:bg-muted/50"
              onClick={() => setShowEmailConfirmation(false)}
            >
              Voltar ao login
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Dynamic gradient background */}
      <div 
        className="fixed inset-0 opacity-50 pointer-events-none transition-transform duration-1000 ease-out"
        style={{
          background: `radial-gradient(circle at ${50 + mousePosition.x}% ${50 + mousePosition.y}%, hsl(var(--primary) / 0.15), transparent 50%)`,
        }}
      />

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* Ambient orbs */}
      <div className="absolute top-20 left-20 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
      <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[130px] animate-pulse" style={{ animationDelay: "2s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-success/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "4s" }} />

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative p-12 flex-col justify-between">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10"
        >
          {/* Logo */}
          <motion.div variants={itemVariants} className="flex items-center gap-4 mb-20">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/25">
              <TrendingUp className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Zeve Hub</h2>
              <p className="text-sm text-muted-foreground">Portal de Clientes</p>
            </div>
          </motion.div>

          {/* Main content */}
          <div className="space-y-8">
            <motion.div variants={itemVariants}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Plataforma Premium
              </span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-5xl xl:text-6xl font-bold leading-tight">
              <span className="text-foreground">Maximize seus</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                resultados
              </span>
              <br />
              <span className="text-foreground">no trading</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-xl text-muted-foreground max-w-md leading-relaxed">
              Análises em tempo real, insights com IA e suporte especializado para potencializar sua performance.
            </motion.p>

            {/* Features */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 pt-8">
              {[
                { icon: TrendingUp, label: "Análises em tempo real" },
                { icon: Shield, label: "Segurança avançada" },
                { icon: Sparkles, label: "Insights com IA" },
                { icon: MessageSquare, label: "Suporte dedicado" },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card/30 border border-border/30 backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground/80">{feature.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Quote section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="relative z-10"
        >
          <div className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
            <p className="text-muted-foreground italic text-lg leading-relaxed">
              "{tradingQuotes[currentQuote]}"
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right side - Auth forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/25">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-foreground">Zeve Hub</h2>
                <p className="text-xs text-muted-foreground">Portal de Clientes</p>
              </div>
            </div>
          </div>

          {/* Auth card */}
          <div className="bg-card/50 backdrop-blur-xl rounded-3xl border border-border/50 p-8 shadow-2xl shadow-black/10">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-14 bg-muted/50 p-1.5 rounded-2xl mb-8">
                <TabsTrigger 
                  value="signin" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-lg rounded-xl font-semibold transition-all duration-300"
                >
                  Entrar
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-lg rounded-xl font-semibold transition-all duration-300"
                >
                  Criar Conta
                </TabsTrigger>
                <TabsTrigger 
                  value="reset" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-lg rounded-xl font-semibold transition-all duration-300"
                >
                  Recuperar
                </TabsTrigger>
              </TabsList>

              {/* Sign In Tab */}
              <TabsContent value="signin" className="mt-0">
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      E-mail
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signInData.email}
                      onChange={(e) => {
                        setSignInData({ ...signInData, email: e.target.value });
                        validateField('email', e.target.value, signInSchema);
                      }}
                      disabled={loading}
                      required
                      className={`h-14 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-base ${
                        fieldErrors.email ? "border-destructive" : ""
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="text-sm text-destructive">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signInData.password}
                        onChange={(e) => {
                          setSignInData({ ...signInData, password: e.target.value });
                          validateField('password', e.target.value, signInSchema);
                        }}
                        disabled={loading}
                        required
                        className={`h-14 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-base pr-12 ${
                          fieldErrors.password ? "border-destructive" : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-sm text-destructive">{fieldErrors.password}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-14 font-semibold text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 rounded-xl" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-5 w-5" />
                        Entrar
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card/50 px-4 text-muted-foreground font-medium">
                        Ou continue com
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSocialLogin('google')}
                      disabled={loading}
                      className="h-14 border-border/50 hover:bg-muted/50 hover:border-primary/30 rounded-xl transition-all duration-300"
                    >
                      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSocialLogin('facebook')}
                      disabled={loading}
                      className="h-14 border-border/50 hover:bg-muted/50 hover:border-primary/30 rounded-xl transition-all duration-300"
                    >
                      <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Nome Completo
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={signUpData.fullName}
                      onChange={(e) => {
                        setSignUpData({ ...signUpData, fullName: e.target.value });
                        validateField('fullName', e.target.value, signUpSchema);
                      }}
                      disabled={loading}
                      required
                      className={`h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl ${
                        fieldErrors.fullName ? "border-destructive" : ""
                      }`}
                    />
                    {fieldErrors.fullName && (
                      <p className="text-sm text-destructive">{fieldErrors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      E-mail
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signUpData.email}
                      onChange={(e) => {
                        setSignUpData({ ...signUpData, email: e.target.value });
                        validateField('email', e.target.value, signUpSchema);
                      }}
                      disabled={loading}
                      required
                      className={`h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl ${
                        fieldErrors.email ? "border-destructive" : ""
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="text-sm text-destructive">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      Senha
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={signUpData.password}
                      onChange={(e) => {
                        setSignUpData({ ...signUpData, password: e.target.value });
                        validateField('password', e.target.value, signUpSchema);
                      }}
                      disabled={loading}
                      required
                      className={`h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl ${
                        fieldErrors.password ? "border-destructive" : ""
                      }`}
                    />
                    {fieldErrors.password && (
                      <p className="text-sm text-destructive">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone" className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        Telefone
                      </Label>
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="11999999999"
                        value={signUpData.phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setSignUpData({ ...signUpData, phone: value });
                          validateField('phone', value, signUpSchema);
                        }}
                        disabled={loading}
                        required
                        className={`h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl ${
                          fieldErrors.phone ? "border-destructive" : ""
                        }`}
                      />
                      {fieldErrors.phone && (
                        <p className="text-sm text-destructive">{fieldErrors.phone}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-cpf" className="text-sm font-medium text-foreground flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        CPF
                      </Label>
                      <Input
                        id="signup-cpf"
                        type="text"
                        placeholder="12345678900"
                        value={signUpData.cpf}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                          setSignUpData({ ...signUpData, cpf: value });
                          validateField('cpf', value, signUpSchema);
                        }}
                        disabled={loading}
                        required
                        maxLength={11}
                        className={`h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl ${
                          fieldErrors.cpf ? "border-destructive" : ""
                        }`}
                      />
                      {fieldErrors.cpf && (
                        <p className="text-sm text-destructive">{fieldErrors.cpf}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="has-genial" className="text-sm font-medium text-foreground">
                        Possui conta na Genial Investimentos?
                      </Label>
                      <Switch
                        id="has-genial"
                        checked={signUpData.hasGenialAccount}
                        onCheckedChange={(checked) => {
                          setSignUpData({ ...signUpData, hasGenialAccount: checked, genialId: checked ? signUpData.genialId : "" });
                        }}
                        disabled={loading}
                      />
                    </div>
                    
                    {signUpData.hasGenialAccount && (
                      <div className="space-y-2 animate-fade-in">
                        <Label htmlFor="signup-genial-id" className="text-sm font-medium text-foreground">
                          ID da conta Genial
                        </Label>
                        <Input
                          id="signup-genial-id"
                          type="text"
                          placeholder="Seu ID na Genial"
                          value={signUpData.genialId}
                          onChange={(e) => {
                            setSignUpData({ ...signUpData, genialId: e.target.value });
                          }}
                          disabled={loading}
                          className="h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl"
                        />
                        <p className="text-xs text-muted-foreground">
                          Informe o ID da sua conta na Genial para agilizar a aprovação
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="terms"
                        checked={signUpData.acceptTerms}
                        onCheckedChange={(checked) => {
                          setSignUpData({ ...signUpData, acceptTerms: checked as boolean });
                          validateField('acceptTerms', checked, signUpSchema);
                        }}
                        disabled={loading}
                        className="rounded-md"
                      />
                      <Label 
                        htmlFor="terms" 
                        className={`text-sm cursor-pointer ${
                          fieldErrors.acceptTerms ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        Aceito os termos de uso e política de privacidade
                      </Label>
                    </div>
                    {fieldErrors.acceptTerms && (
                      <p className="text-sm text-destructive">{fieldErrors.acceptTerms}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-14 font-semibold text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 rounded-xl" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      <>
                        Criar Conta
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Reset Password Tab */}
              <TabsContent value="reset" className="mt-0">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Esqueceu sua senha?</h3>
                  <p className="text-sm text-muted-foreground">
                    Não se preocupe! Enviaremos um link para você redefinir sua senha.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      E-mail
                    </Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        validateField('email', e.target.value, resetPasswordSchema);
                      }}
                      disabled={loading}
                      required
                      className={`h-14 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-base ${
                        fieldErrors.email ? "border-destructive" : ""
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="text-sm text-destructive">{fieldErrors.email}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-14 font-semibold text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 rounded-xl" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-5 w-5" />
                        Enviar Link de Recuperação
                      </>
                    )}
                  </Button>

                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Lembre-se de verificar sua pasta de spam
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          {/* Mobile quote */}
          <div className="lg:hidden mt-8 text-center">
            <p className="text-muted-foreground italic text-sm">
              "{tradingQuotes[currentQuote]}"
            </p>
          </div>
        </motion.div>
      </div>

      <TwoFactorVerification
        open={show2FADialog}
        onVerify={handle2FAVerification}
        onCancel={handle2FACancel}
      />
    </div>
  );
};

export default Auth;
