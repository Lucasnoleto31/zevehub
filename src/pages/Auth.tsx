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

  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        
        <div className="w-full max-w-md relative z-10 animate-fade-in">
          <Card className="shadow-xl border-2">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Verifique seu e-mail</CardTitle>
              <CardDescription>
                Enviamos um link de confirmação para <strong>{signUpData.email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">
                  Por favor, verifique sua caixa de entrada e clique no link de confirmação para ativar sua conta.
                </p>
                <p className="text-sm text-muted-foreground">
                  Não se esqueça de verificar a pasta de spam!
                </p>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowEmailConfirmation(false)}
              >
                Voltar ao login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Zeve Clientes</h1>
          </div>
          <p className="text-muted-foreground">Portal exclusivo de gestão e performance</p>
        </div>

        <Card className="shadow-xl border-2">
          <CardHeader>
            <CardTitle>Acesso ao Portal</CardTitle>
            <CardDescription>Entre ou crie sua conta para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
                <TabsTrigger value="reset">Recuperar</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">E-mail</Label>
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
                      className={fieldErrors.email ? "border-destructive" : ""}
                    />
                    {fieldErrors.email && (
                      <p className="text-sm text-destructive">{fieldErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Senha</Label>
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
                      className={fieldErrors.password ? "border-destructive" : ""}
                    />
                    {fieldErrors.password && (
                      <p className="text-sm text-destructive">{fieldErrors.password}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
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

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
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
                    >
                      <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
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
                      className={fieldErrors.fullName ? "border-destructive" : ""}
                    />
                    {fieldErrors.fullName && (
                      <p className="text-sm text-destructive">{fieldErrors.fullName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
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
                      className={fieldErrors.email ? "border-destructive" : ""}
                    />
                    {fieldErrors.email && (
                      <p className="text-sm text-destructive">{fieldErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
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
                      className={fieldErrors.password ? "border-destructive" : ""}
                    />
                    {fieldErrors.password && (
                      <p className="text-sm text-destructive">{fieldErrors.password}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Telefone WhatsApp</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="11999999999"
                      value={signUpData.phone}
                      onChange={(e) => {
                        const phone = e.target.value.replace(/\D/g, '');
                        setSignUpData({ ...signUpData, phone });
                        validateField('phone', phone, signUpSchema);
                      }}
                      disabled={loading}
                      required
                      className={fieldErrors.phone ? "border-destructive" : ""}
                    />
                    {fieldErrors.phone && (
                      <p className="text-sm text-destructive">{fieldErrors.phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2 pt-2">
                      <Checkbox
                        id="terms"
                        checked={signUpData.acceptTerms}
                        onCheckedChange={(checked) => {
                          setSignUpData({ ...signUpData, acceptTerms: checked as boolean });
                          validateField('acceptTerms', checked, signUpSchema);
                        }}
                        disabled={loading}
                        required
                        className={fieldErrors.acceptTerms ? "border-destructive" : ""}
                      />
                      <label
                        htmlFor="terms"
                        className="text-sm text-muted-foreground leading-normal cursor-pointer"
                      >
                        Eu aceito os{" "}
                        <a href="#" className="text-primary hover:underline">
                          termos de uso
                        </a>{" "}
                        e{" "}
                        <a href="#" className="text-primary hover:underline">
                          política de privacidade
                        </a>
                      </label>
                    </div>
                    {fieldErrors.acceptTerms && (
                      <p className="text-sm text-destructive">{fieldErrors.acceptTerms}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
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

              <TabsContent value="reset">
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">E-mail</Label>
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
                      className={fieldErrors.email ? "border-destructive" : ""}
                    />
                    {fieldErrors.email && (
                      <p className="text-sm text-destructive">{fieldErrors.email}</p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enviaremos um link de recuperação para o seu e-mail.
                  </p>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar Link de Recuperação"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Shield className="w-4 h-4 inline mr-1" />
          Seus dados estão protegidos com criptografia de ponta
        </div>
      </div>
    </div>
  );
};

export default Auth;
