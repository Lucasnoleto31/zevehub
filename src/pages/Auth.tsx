import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Shield, TrendingUp } from "lucide-react";
import { z } from "zod";
import * as OTPAuth from "otpauth";
import { TwoFactorVerification } from "@/components/auth/TwoFactorVerification";

const signUpSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
  fullName: z.string().min(3, { message: "Nome deve ter no mínimo 3 caracteres" }),
  phone: z.string().min(10, { message: "Telefone deve ter no mínimo 10 dígitos" }).regex(/^\d+$/, { message: "Telefone deve conter apenas números" }),
  acceptTerms: z.boolean().refine((val) => val === true, { message: "Você deve aceitar os termos de uso" }),
});

const signInSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  password: z.string().min(1, { message: "Senha obrigatória" }),
});

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
});

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signUpData, setSignUpData] = useState({ 
    email: "", 
    password: "", 
    fullName: "", 
    phone: "", 
    acceptTerms: false 
  });
  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [resetEmail, setResetEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);

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
        // Check if email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
          setShowEmailConfirmation(true);
        } else {
          toast.success("Cadastro realizado com sucesso!");
          navigate("/dashboard");
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
        // Check if user has 2FA enabled
        const { data: profileData } = await supabase
          .from("profiles")
          .select("totp_enabled, totp_secret")
          .eq("id", data.user.id)
          .single();

        if (profileData?.totp_enabled && profileData?.totp_secret) {
          // Show 2FA dialog
          setPendingUserId(data.user.id);
          setTotpSecret(profileData.totp_secret);
          setShow2FADialog(true);
          setLoading(false);
          return;
        }

        // Log de acesso
        const accessLogData = {
          user_id: data.user.id,
          ip_address: "client-side",
          user_agent: navigator.userAgent,
          device_info: navigator.platform,
        };
        
        await supabase.from("access_logs").insert(accessLogData);

        // Verificar se é um novo dispositivo e enviar notificação
        try {
          await supabase.functions.invoke("check-new-device", {
            body: accessLogData,
          });
        } catch (error) {
          console.error("Error checking new device:", error);
          // Não bloqueia o login se houver erro na verificação
        }

        toast.success("Login realizado com sucesso!");
        navigate("/dashboard");
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
        // Log de acesso
        const accessLogData = {
          user_id: pendingUserId,
          ip_address: "client-side",
          user_agent: navigator.userAgent,
          device_info: navigator.platform,
        };
        
        await supabase.from("access_logs").insert(accessLogData);

        // Verificar se é um novo dispositivo
        try {
          await supabase.functions.invoke("check-new-device", {
            body: accessLogData,
          });
        } catch (error) {
          console.error("Error checking new device:", error);
        }

        toast.success("Autenticação 2FA bem-sucedida!");
        setShow2FADialog(false);
        navigate("/dashboard");
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
    
    // Sign out the user since they didn't complete 2FA
    await supabase.auth.signOut();
    toast.info("Login cancelado");
  };

  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md animate-fade-in space-y-6">
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Verifique seu e-mail</h1>
            <p className="text-center text-muted-foreground">
              Enviamos um link de confirmação para<br />
              <strong className="text-foreground">{signUpData.email}</strong>
            </p>
          </div>

          <div className="bg-muted/30 p-6 rounded-xl space-y-3 border border-border/50">
            <p className="text-sm text-foreground/80">
              Por favor, verifique sua caixa de entrada e clique no link de confirmação para ativar sua conta.
            </p>
            <p className="text-sm text-muted-foreground">
              Não se esqueça de verificar a pasta de spam!
            </p>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-12"
            onClick={() => setShowEmailConfirmation(false)}
          >
            Voltar ao login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>
      
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo and branding */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg">
            <TrendingUp className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Zeve Clientes</h1>
          <p className="text-muted-foreground text-sm">Portal de gestão e performance</p>
        </div>

        {/* Auth forms */}
        <div className="space-y-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/30 p-1">
              <TabsTrigger value="signin" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Criar Conta
              </TabsTrigger>
              <TabsTrigger value="reset" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Recuperar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium text-foreground">
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
                    className={`h-12 bg-background border-border/50 focus:border-primary ${
                      fieldErrors.email ? "border-destructive" : ""
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-sm text-destructive">{fieldErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium text-foreground">
                    Senha
                  </Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => {
                      setSignInData({ ...signInData, password: e.target.value });
                      validateField('password', e.target.value, signInSchema);
                    }}
                    disabled={loading}
                    required
                    className={`h-12 bg-background border-border/50 focus:border-primary ${
                      fieldErrors.password ? "border-destructive" : ""
                    }`}
                  />
                  {fieldErrors.password && (
                    <p className="text-sm text-destructive">{fieldErrors.password}</p>
                  )}
                </div>
                <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Entrar
                      </>
                    )}
                  </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-3 text-muted-foreground font-medium">
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
                    className="h-12 border-border/50 hover:bg-muted/50"
                  >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Google
                    </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialLogin('facebook')}
                    disabled={loading}
                    className="h-12 border-border/50 hover:bg-muted/50"
                  >
                      <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium text-foreground">
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
                    className={`h-12 bg-background border-border/50 focus:border-primary ${
                      fieldErrors.fullName ? "border-destructive" : ""
                    }`}
                  />
                  {fieldErrors.fullName && (
                    <p className="text-sm text-destructive">{fieldErrors.fullName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium text-foreground">
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
                    className={`h-12 bg-background border-border/50 focus:border-primary ${
                      fieldErrors.email ? "border-destructive" : ""
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-sm text-destructive">{fieldErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium text-foreground">
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
                    className={`h-12 bg-background border-border/50 focus:border-primary ${
                      fieldErrors.password ? "border-destructive" : ""
                    }`}
                  />
                  {fieldErrors.password && (
                    <p className="text-sm text-destructive">{fieldErrors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone" className="text-sm font-medium text-foreground">
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
                    className={`h-12 bg-background border-border/50 focus:border-primary ${
                      fieldErrors.phone ? "border-destructive" : ""
                    }`}
                  />
                  {fieldErrors.phone && (
                    <p className="text-sm text-destructive">{fieldErrors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={signUpData.acceptTerms}
                      onCheckedChange={(checked) => {
                        setSignUpData({ ...signUpData, acceptTerms: checked as boolean });
                        validateField('acceptTerms', checked, signUpSchema);
                      }}
                      disabled={loading}
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

                <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      "Criar Conta"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="reset" className="mt-6">
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-sm font-medium text-foreground">
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
                      className={`h-12 bg-background border-border/50 focus:border-primary ${
                        fieldErrors.email ? "border-destructive" : ""
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="text-sm text-destructive">{fieldErrors.email}</p>
                    )}
                  </div>
                  
                  <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar Link de Recuperação"
                    )}
                  </Button>

                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Lembre-se de verificar sua pasta de spam
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </div>
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
